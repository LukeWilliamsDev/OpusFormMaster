-- Make audit entries useful as an operational record and provide a guarded,
-- server-side way for admins and directors to restore supported changes.
--
-- Reverts are deliberately narrow. The audit trail contains snapshots of
-- whole rows, but restoring a whole row would be unsafe (for example, it
-- could silently remove a certificate uploaded after the audited change).
-- Only explicitly safe business fields are restored, and the operation is
-- rejected if the record has changed since the selected audit entry.

CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id uuid;
    current_user_email text;
    current_tenant_id uuid;
    revert_source_id text;
    rec record;
    target_val text;
    act text;
    details_val jsonb;
BEGIN
    IF TG_OP = 'UPDATE' AND OLD IS NOT DISTINCT FROM NEW THEN
        RETURN NEW;
    END IF;

    BEGIN
        current_user_id := auth.uid();
        current_user_email := (auth.jwt() ->> 'email');
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
        current_user_email := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        act := 'CREATE';
        rec := NEW;
        details_val := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        act := 'UPDATE';
        rec := NEW;
        details_val := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        act := 'DELETE';
        rec := OLD;
        details_val := to_jsonb(OLD);
    END IF;

    target_val := rec.id::text;

    IF current_user_id IS NOT NULL THEN
        SELECT tenant_id INTO current_tenant_id
        FROM public.profiles
        WHERE id = current_user_id;
    END IF;
    IF current_tenant_id IS NULL THEN
        BEGIN
            current_tenant_id := (to_jsonb(rec) ->> 'tenant_id')::uuid;
        EXCEPTION WHEN OTHERS THEN
            current_tenant_id := NULL;
        END;
    END IF;

    -- The revert RPC sets this transaction-local marker immediately before
    -- the business update. Keeping the source ID on the generated UPDATE row
    -- makes the corrective action auditable without creating a duplicate
    -- synthetic event.
    revert_source_id := NULLIF(current_setting('app.audit_revert_source', true), '');
    IF revert_source_id IS NOT NULL THEN
        details_val := details_val || jsonb_build_object(
            'reverted_audit_log_id', revert_source_id
        );
    END IF;

    BEGIN
        INSERT INTO public.audit_logs (
            user_id,
            user_email,
            action,
            target_type,
            target_id,
            details,
            tenant_id
        )
        VALUES (
            current_user_id,
            current_user_email,
            act,
            TG_TABLE_NAME,
            target_val,
            details_val,
            current_tenant_id
        );
    EXCEPTION WHEN OTHERS THEN
        -- Audit capture must not roll back the business write. The UI and
        -- database function still expose the source marker when it succeeds.
        RAISE WARNING 'process_audit_log: failed to write audit_logs row for % on %: %',
            act, TG_TABLE_NAME, SQLERRM;
    END;

    RETURN rec;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

CREATE OR REPLACE FUNCTION public.revert_audit_log(p_audit_log_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
    audit_row public.audit_logs%ROWTYPE;
    current_snapshot jsonb;
    old_snapshot jsonb;
    new_snapshot jsonb;
    current_projection jsonb;
    expected_projection jsonb;
    tenant uuid;
BEGIN
    tenant := private.current_tenant_id();

    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.tenant_id = tenant
          AND p.role IN ('admin'::public.app_role, 'director'::public.app_role)
    ) THEN
        RAISE EXCEPTION 'Only admin or director accounts can revert audit entries';
    END IF;

    SELECT * INTO audit_row
    FROM public.audit_logs
    WHERE id = p_audit_log_id
      AND tenant_id = tenant;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Audit entry not found in the current tenant';
    END IF;
    IF audit_row.action <> 'UPDATE' THEN
        RAISE EXCEPTION 'Only update entries with a before-and-after snapshot can be reverted';
    END IF;

    old_snapshot := audit_row.details -> 'old';
    new_snapshot := audit_row.details -> 'new';
    IF jsonb_typeof(old_snapshot) <> 'object' OR jsonb_typeof(new_snapshot) <> 'object' THEN
        RAISE EXCEPTION 'This audit entry does not contain a reversible before-and-after snapshot';
    END IF;

    IF audit_row.target_type = 'staff' THEN
        SELECT to_jsonb(s) INTO current_snapshot
        FROM public.staff s
        WHERE s.id = audit_row.target_id
          AND s.tenant_id = tenant
        FOR UPDATE;

        IF current_snapshot IS NULL THEN
            RAISE EXCEPTION 'The staff record no longer exists, so this entry cannot be reverted';
        END IF;

        current_projection := jsonb_build_object(
            'name', current_snapshot -> 'name',
            'role', current_snapshot -> 'role',
            'phone', current_snapshot -> 'phone',
            'email', current_snapshot -> 'email',
            'postcode', current_snapshot -> 'postcode',
            'is_archived', current_snapshot -> 'is_archived'
        );
        expected_projection := jsonb_build_object(
            'name', new_snapshot -> 'name',
            'role', new_snapshot -> 'role',
            'phone', new_snapshot -> 'phone',
            'email', new_snapshot -> 'email',
            'postcode', new_snapshot -> 'postcode',
            'is_archived', new_snapshot -> 'is_archived'
        );

        IF current_projection IS DISTINCT FROM expected_projection THEN
            RAISE EXCEPTION 'This staff record changed after the selected audit entry; reload before reverting';
        END IF;
        IF jsonb_build_object(
            'name', old_snapshot -> 'name',
            'role', old_snapshot -> 'role',
            'phone', old_snapshot -> 'phone',
            'email', old_snapshot -> 'email',
            'postcode', old_snapshot -> 'postcode',
            'is_archived', old_snapshot -> 'is_archived'
        ) = expected_projection THEN
            RAISE EXCEPTION 'This entry has no supported staff changes to revert';
        END IF;

        PERFORM set_config('app.audit_revert_source', p_audit_log_id::text, true);
        UPDATE public.staff
        SET
            name = CASE WHEN old_snapshot ? 'name' THEN old_snapshot ->> 'name' ELSE name END,
            role = CASE WHEN old_snapshot ? 'role' THEN old_snapshot ->> 'role' ELSE role END,
            phone = CASE WHEN old_snapshot ? 'phone' THEN old_snapshot ->> 'phone' ELSE phone END,
            email = CASE WHEN old_snapshot ? 'email' THEN old_snapshot ->> 'email' ELSE email END,
            postcode = CASE WHEN old_snapshot ? 'postcode' THEN old_snapshot ->> 'postcode' ELSE postcode END,
            is_archived = CASE
                WHEN old_snapshot ? 'is_archived' THEN (old_snapshot ->> 'is_archived')::boolean
                ELSE is_archived
            END
        WHERE id = audit_row.target_id
          AND tenant_id = tenant;

    ELSIF audit_row.target_type = 'jobs' THEN
        SELECT to_jsonb(j) INTO current_snapshot
        FROM public.jobs j
        WHERE j.id = audit_row.target_id
          AND j.tenant_id = tenant
        FOR UPDATE;

        IF current_snapshot IS NULL THEN
            RAISE EXCEPTION 'The job record no longer exists, so this entry cannot be reverted';
        END IF;

        current_projection := jsonb_build_object(
            'site_name', current_snapshot -> 'site_name',
            'main_contractor', current_snapshot -> 'main_contractor',
            'postcode', current_snapshot -> 'postcode',
            'email', current_snapshot -> 'email',
            'contract_max_pours', current_snapshot -> 'contract_max_pours',
            'status', current_snapshot -> 'status'
        );
        expected_projection := jsonb_build_object(
            'site_name', new_snapshot -> 'site_name',
            'main_contractor', new_snapshot -> 'main_contractor',
            'postcode', new_snapshot -> 'postcode',
            'email', new_snapshot -> 'email',
            'contract_max_pours', new_snapshot -> 'contract_max_pours',
            'status', new_snapshot -> 'status'
        );

        IF current_projection IS DISTINCT FROM expected_projection THEN
            RAISE EXCEPTION 'This job changed after the selected audit entry; reload before reverting';
        END IF;
        IF jsonb_build_object(
            'site_name', old_snapshot -> 'site_name',
            'main_contractor', old_snapshot -> 'main_contractor',
            'postcode', old_snapshot -> 'postcode',
            'email', old_snapshot -> 'email',
            'contract_max_pours', old_snapshot -> 'contract_max_pours',
            'status', old_snapshot -> 'status'
        ) = expected_projection THEN
            RAISE EXCEPTION 'This entry has no supported job changes to revert';
        END IF;

        PERFORM set_config('app.audit_revert_source', p_audit_log_id::text, true);
        UPDATE public.jobs
        SET
            site_name = CASE WHEN old_snapshot ? 'site_name' THEN old_snapshot ->> 'site_name' ELSE site_name END,
            main_contractor = CASE WHEN old_snapshot ? 'main_contractor' THEN old_snapshot ->> 'main_contractor' ELSE main_contractor END,
            postcode = CASE WHEN old_snapshot ? 'postcode' THEN old_snapshot ->> 'postcode' ELSE postcode END,
            email = CASE WHEN old_snapshot ? 'email' THEN old_snapshot ->> 'email' ELSE email END,
            contract_max_pours = CASE
                WHEN old_snapshot ? 'contract_max_pours' THEN (old_snapshot ->> 'contract_max_pours')::integer
                ELSE contract_max_pours
            END,
            status = CASE WHEN old_snapshot ? 'status' THEN old_snapshot ->> 'status' ELSE status END
        WHERE id = audit_row.target_id
          AND tenant_id = tenant;

    ELSE
        RAISE EXCEPTION 'Revert is not enabled for % audit entries', audit_row.target_type;
    END IF;

    RETURN jsonb_build_object(
        'audit_log_id', audit_row.id,
        'target_type', audit_row.target_type,
        'target_id', audit_row.target_id,
        'reverted_at', now()
    );
END;
$$;

REVOKE ALL ON FUNCTION public.revert_audit_log(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revert_audit_log(uuid) TO authenticated;

-- Authenticated callers may request operational audit events from the client,
-- but the actor is always taken from the session rather than trusting a
-- caller-supplied email. Anonymous login/reset events retain the submitted
-- identifier because no authenticated session exists.
CREATE OR REPLACE FUNCTION public.log_anonymous_audit(
    p_user_email text,
    p_action text,
    p_target_type text,
    p_target_id text,
    p_details jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
    actor_id uuid;
    actor_email text;
    actor_tenant uuid;
BEGIN
    actor_id := auth.uid();

    IF actor_id IS NULL THEN
        IF p_action NOT IN ('LOGIN_FAIL', 'PASSWORD_RESET_REQUEST') THEN
            RAISE EXCEPTION 'An authenticated session is required for this audit event';
        END IF;
    ELSIF p_action NOT IN ('LOGIN_SUCCESS', 'LOGOUT', 'PASSWORD_RESET_SUCCESS', 'PROFILE_UPDATE')
        AND NOT (
            private.can_write_ops(actor_id)
            OR private.can_send_documents(actor_id)
        ) THEN
        RAISE EXCEPTION 'Unauthorized action for operational audit logging';
    END IF;

    actor_email := CASE
        WHEN actor_id IS NOT NULL THEN COALESCE(auth.jwt() ->> 'email', p_user_email)
        ELSE p_user_email
    END;
    SELECT tenant_id INTO actor_tenant
    FROM public.profiles
    WHERE id = actor_id;

    INSERT INTO public.audit_logs (
        user_id,
        user_email,
        action,
        target_type,
        target_id,
        details,
        tenant_id
    )
    VALUES (
        actor_id,
        actor_email,
        p_action,
        p_target_type,
        p_target_id,
        p_details,
        actor_tenant
    );
END;
$$;
