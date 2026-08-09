-- process_audit_log() never set tenant_id on the audit_logs row it inserts,
-- so once audit_logs.tenant_id became NOT NULL, every INSERT/UPDATE/DELETE
-- on an audited table (quotes, jobs, staff, shifts, etc.) started failing
-- with "null value in column tenant_id of relation audit_logs" (23502) and
-- rolling back the whole write. Resolve tenant_id from the acting user's
-- profile, falling back to the row's own tenant_id if present (covers
-- service-role/edge-function writes where auth.uid() is NULL). The audit
-- insert itself is now wrapped so any future audit-log failure (missing
-- tenant_id, schema drift, whatever) can never roll back the real write —
-- it's a best-effort side record, not something that should ever block
-- the business transaction it's logging.
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id uuid;
    current_user_email text;
    current_tenant_id uuid;
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
        SELECT tenant_id INTO current_tenant_id FROM public.profiles WHERE id = current_user_id;
    END IF;
    IF current_tenant_id IS NULL THEN
        BEGIN
            current_tenant_id := (to_jsonb(rec) ->> 'tenant_id')::uuid;
        EXCEPTION WHEN OTHERS THEN
            current_tenant_id := NULL;
        END;
    END IF;

    BEGIN
        INSERT INTO public.audit_logs (user_id, user_email, action, target_type, target_id, details, tenant_id)
        VALUES (current_user_id, current_user_email, act, TG_TABLE_NAME, target_val, details_val, current_tenant_id);
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'process_audit_log: failed to write audit_logs row for % on %: %', act, TG_TABLE_NAME, SQLERRM;
    END;

    RETURN rec;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
