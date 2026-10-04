-- A revert is only successful when its corrective audit event is written.
-- Ordinary business writes retain the existing availability-first behavior;
-- only the transaction-local revert marker changes the failure policy.

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
        IF revert_source_id IS NOT NULL THEN
            RAISE;
        END IF;
        RAISE WARNING 'process_audit_log: failed to write audit_logs row for % on %: %',
            act, TG_TABLE_NAME, SQLERRM;
    END;

    RETURN rec;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;
