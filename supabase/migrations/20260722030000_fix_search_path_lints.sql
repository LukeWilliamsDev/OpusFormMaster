-- Fix Supabase linter warnings: function_search_path_mutable and
-- anon/authenticated EXECUTE on internal trigger-only functions.

DO $$
DECLARE
  signature text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.submit_worker_documents(uuid,jsonb)',
    'public.check_email_registered(text)',
    'public.complete_job_document_request(text)',
    'public.get_document_request_details(uuid)',
    'public.get_job_document_request_details(text)',
    'public.is_valid_job_document_token(text)',
    'public.log_anonymous_audit(text,text,text,text,jsonb)',
    'public.process_audit_log()',
    'public.rls_auto_enable()',
    'public.submit_job_attachment(text,text,text,bigint)'
  ] LOOP
    IF to_regprocedure(signature) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', signature);
    END IF;
  END LOOP;
END $$;

-- process_audit_log and rls_auto_enable are trigger-only functions, never
-- meant to be called as public RPCs. Triggers run via the owner regardless
-- of role grants, so revoking EXECUTE here doesn't break them.
DO $$
BEGIN
  IF to_regprocedure('public.process_audit_log()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.process_audit_log() FROM anon, authenticated;
  END IF;
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
  END IF;
END $$;
