-- External contributors submitting via the job-upload link were never
-- audit-logged (submit_job_attachment only inserted the attachment row).
-- log_anonymous_audit can't be reused here — it requires an authenticated
-- ops user (auth.uid()), which an anonymous link visitor never has — so log
-- directly, same SECURITY DEFINER bypass-RLS pattern, reusing the tenant_id
-- already looked up for the job_attachments insert.
CREATE OR REPLACE FUNCTION public.submit_job_attachment(
  p_token text,
  p_file_name text,
  p_file_url text
)
RETURNS void AS $$
DECLARE
  v_job_id text;
  v_tenant_id uuid;
BEGIN
  SELECT job_id, tenant_id INTO v_job_id, v_tenant_id
  FROM public.job_document_requests
  WHERE token = p_token
    AND completed_at IS NULL
    AND expires_at > now();

  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'This upload link is invalid, expired, or has already been completed.';
  END IF;

  INSERT INTO public.job_attachments (job_id, tenant_id, type, file_name, file_url, uploaded_by)
  VALUES (v_job_id, v_tenant_id, 'document', p_file_name, p_file_url, 'External Contributor (via Link)');

  INSERT INTO public.audit_logs (user_id, user_email, action, target_type, target_id, details, tenant_id)
  VALUES (
    NULL,
    'External Contributor (via Link)',
    'EXTERNAL_UPLOAD',
    'jobs',
    v_job_id,
    jsonb_build_object('file_name', p_file_name),
    v_tenant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
