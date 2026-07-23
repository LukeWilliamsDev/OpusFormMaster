-- Fix Supabase DB Linter Security Advisories
-- Safe execution script (handles missing unpushed functions gracefully)

-- Ensure trigger function exists before revoking
CREATE OR REPLACE FUNCTION public.sync_job_attachment_file_size()
RETURNS trigger AS $$
DECLARE
  v_path text;
  v_real_size bigint;
BEGIN
  v_path := substring(NEW.file_url from '/job-attachments/(.*)$');
  IF v_path IS NOT NULL THEN
    SELECT (metadata->>'size')::bigint INTO v_real_size
    FROM storage.objects
    WHERE bucket_id = 'job-attachments' AND name = v_path;

    IF v_real_size IS NOT NULL THEN
      NEW.file_size_bytes := v_real_size;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 1. Revoke EXECUTE privileges on internal trigger functions from PUBLIC, anon, and authenticated
REVOKE EXECUTE ON FUNCTION public.process_audit_log() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_job_attachment_file_size() FROM PUBLIC, anon, authenticated;

-- 2. Secure legacy / unused function (check_email_registered)
REVOKE EXECUTE ON FUNCTION public.check_email_registered(text) FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.check_email_registered(text) SECURITY INVOKER SET search_path = public, pg_temp;

-- 3. Stripping default PUBLIC EXECUTE access on SECURITY DEFINER token-portal RPCs,
--    granting explicit execution only to anon and authenticated roles.
REVOKE EXECUTE ON FUNCTION public.complete_job_document_request(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_job_document_request(text) TO anon, authenticated;
ALTER FUNCTION public.complete_job_document_request(text) SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.get_document_request_details(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_document_request_details(uuid) TO anon, authenticated;
ALTER FUNCTION public.get_document_request_details(uuid) SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.get_job_document_request_details(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_job_document_request_details(text) TO anon, authenticated;
ALTER FUNCTION public.get_job_document_request_details(text) SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.is_valid_job_document_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_valid_job_document_token(text) TO anon, authenticated;
ALTER FUNCTION public.is_valid_job_document_token(text) SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.log_anonymous_audit(text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_anonymous_audit(text, text, text, text, jsonb) TO anon, authenticated;
ALTER FUNCTION public.log_anonymous_audit(text, text, text, text, jsonb) SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.submit_job_attachment(text, text, text, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_job_attachment(text, text, text, bigint) TO anon, authenticated;
ALTER FUNCTION public.submit_job_attachment(text, text, text, bigint) SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.submit_worker_documents(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_worker_documents(uuid, jsonb) TO anon, authenticated;
ALTER FUNCTION public.submit_worker_documents(uuid, jsonb) SET search_path = public, pg_temp;

-- 4. Harden search_path across all internal trigger functions
ALTER FUNCTION public.process_audit_log() SET search_path = public, pg_temp;
ALTER FUNCTION public.rls_auto_enable() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_job_attachment_file_size() SET search_path = public, pg_temp;
