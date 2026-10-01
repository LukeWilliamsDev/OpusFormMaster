-- Fix Supabase DB Linter Security Advisories.
-- Historical environments differ, so every function operation is guarded.

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

DO $$
DECLARE
  signature text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.process_audit_log()',
    'public.rls_auto_enable()',
    'public.sync_job_attachment_file_size()',
    'public.check_email_registered(text)'
  ] LOOP
    IF to_regprocedure(signature) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', signature);
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', signature);
    END IF;
  END LOOP;

  IF to_regprocedure('public.check_email_registered(text)') IS NOT NULL THEN
    ALTER FUNCTION public.check_email_registered(text) SECURITY INVOKER;
  END IF;

  FOREACH signature IN ARRAY ARRAY[
    'public.complete_job_document_request(text)',
    'public.get_document_request_details(uuid)',
    'public.get_job_document_request_details(text)',
    'public.is_valid_job_document_token(text)',
    'public.log_anonymous_audit(text,text,text,text,jsonb)',
    'public.submit_job_attachment(text,text,text,bigint)',
    'public.submit_worker_documents(uuid,jsonb)'
  ] LOOP
    IF to_regprocedure(signature) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', signature);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', signature);
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', signature);
    END IF;
  END LOOP;
END $$;
