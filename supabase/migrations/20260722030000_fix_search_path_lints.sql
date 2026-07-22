-- Fix Supabase linter warnings: function_search_path_mutable and
-- anon/authenticated EXECUTE on internal trigger-only functions.

ALTER FUNCTION public.submit_worker_documents(uuid, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_email_registered(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.complete_job_document_request(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_document_request_details(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_job_document_request_details(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_valid_job_document_token(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.log_anonymous_audit(text, text, text, text, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.process_audit_log() SET search_path = public, pg_temp;
ALTER FUNCTION public.rls_auto_enable() SET search_path = public, pg_temp;
ALTER FUNCTION public.submit_job_attachment(text, text, text, bigint) SET search_path = public, pg_temp;

-- process_audit_log and rls_auto_enable are trigger-only functions, never
-- meant to be called as public RPCs. Triggers run via the owner regardless
-- of role grants, so revoking EXECUTE here doesn't break them.
REVOKE EXECUTE ON FUNCTION public.process_audit_log() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
