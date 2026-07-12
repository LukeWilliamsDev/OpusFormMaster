-- Create helper function to allow anonymous/failed logins or resets to write to audit_logs securely
CREATE OR REPLACE FUNCTION public.log_anonymous_audit(
    p_user_email text,
    p_action text,
    p_target_type text,
    p_target_id text,
    p_details jsonb
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, user_email, action, target_type, target_id, details)
    VALUES (NULL, p_user_email, p_action, p_target_type, p_target_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
