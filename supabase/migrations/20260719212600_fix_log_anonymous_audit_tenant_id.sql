-- log_anonymous_audit was never updated after tenant_id became NOT NULL on
-- audit_logs, so any non-whitelisted action (e.g. COMPLIANCE_REMINDER_SENT)
-- threw a not-null violation on insert.
CREATE OR REPLACE FUNCTION public.log_anonymous_audit(
    p_user_email text,
    p_action text,
    p_target_type text,
    p_target_id text,
    p_details jsonb
)
RETURNS void AS $$
BEGIN
    IF p_action NOT IN ('LOGIN_FAIL', 'PASSWORD_RESET_REQUEST') THEN
        IF auth.uid() IS NULL OR NOT private.can_write_ops(auth.uid()) THEN
            RAISE EXCEPTION 'Unauthorized action for anonymous audit logging';
        END IF;
    END IF;

    INSERT INTO public.audit_logs (user_id, user_email, action, target_type, target_id, details, tenant_id)
    VALUES (
        auth.uid(),
        p_user_email,
        p_action,
        p_target_type,
        p_target_id,
        p_details,
        (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
