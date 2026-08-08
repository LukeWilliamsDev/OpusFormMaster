-- Skip logging UPDATE events where the row didn't actually change.
-- Bulk saves (e.g. re-saving a whole roster) fire an UPDATE trigger per row
-- even when a given row's values are unchanged, flooding audit_logs with
-- no-op entries. Only INSERT/DELETE, or UPDATEs with a real diff, get logged.
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id uuid;
    current_user_email text;
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

    INSERT INTO public.audit_logs (user_id, user_email, action, target_type, target_id, details)
    VALUES (current_user_id, current_user_email, act, TG_TABLE_NAME, target_val, details_val);

    RETURN rec;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
