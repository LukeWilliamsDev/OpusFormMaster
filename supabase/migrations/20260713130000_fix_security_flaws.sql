-- 1. Restrict Storage Reads on compliance-documents
DROP POLICY IF EXISTS select_anonymous ON storage.objects;
CREATE POLICY admin_select_storage ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'compliance-documents' 
    AND private.can_write_ops(auth.uid())
  );

-- 2. Drop direct anonymous updates on document_requests since updates should only run via security definer RPC
DROP POLICY IF EXISTS update_anonymous ON public.document_requests;

-- 3. Restrict log_anonymous_audit to prevent arbitrary audit spoofing
CREATE OR REPLACE FUNCTION public.log_anonymous_audit(
    p_user_email text,
    p_action text,
    p_target_type text,
    p_target_id text,
    p_details jsonb
)
RETURNS void AS $$
BEGIN
    -- Only allow specific actions anonymously. Otherwise, enforce admin/dispatcher privileges.
    IF p_action NOT IN ('LOGIN_FAIL', 'PASSWORD_RESET_REQUEST') THEN
        IF auth.uid() IS NULL OR NOT private.can_write_ops(auth.uid()) THEN
            RAISE EXCEPTION 'Unauthorized action for anonymous audit logging';
        END IF;
    END IF;

    INSERT INTO public.audit_logs (user_id, user_email, action, target_type, target_id, details)
    VALUES (auth.uid(), p_user_email, p_action, p_target_type, p_target_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
