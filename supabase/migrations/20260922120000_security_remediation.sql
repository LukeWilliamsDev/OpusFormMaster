-- Corrective security remediation after 20260922110000.
--
-- LIVE-SCHEMA PRECONDITIONS:
--   * public.jobs, public.shifts and public.job_document_requests have tenant_id.
--   * The live job_attachments table may NOT have tenant_id (documented drift from
--     20260716100000). Its tenant boundary is therefore enforced through jobs.id;
--     do not add a direct tenant_id reference to this migration.
--   * The existing RPCs, storage buckets and private helper functions referenced
--     below must exist in the live catalog. This migration is intentionally not a
--     substitute for catalog reconciliation.

-- Keep both buckets private even if an earlier deployment made either public.
UPDATE storage.buckets
SET public = false
WHERE id IN ('job-attachments', 'compliance-documents');

-- Jobs are the tenant root. Every job policy must retain the tenant predicate.
DROP POLICY IF EXISTS jobs_select_authenticated ON public.jobs;
DROP POLICY IF EXISTS jobs_insert_ops ON public.jobs;
DROP POLICY IF EXISTS jobs_update_ops ON public.jobs;
DROP POLICY IF EXISTS jobs_delete_ops ON public.jobs;
CREATE POLICY jobs_select_authenticated ON public.jobs FOR SELECT TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());
CREATE POLICY jobs_insert_ops ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());
CREATE POLICY jobs_update_ops ON public.jobs FOR UPDATE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());
CREATE POLICY jobs_delete_ops ON public.jobs FOR DELETE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

-- A shift is valid only when both its own tenant and its parent job/worker are
-- in the caller's tenant. This prevents cross-tenant child-row assignments.
DROP POLICY IF EXISTS shifts_select_authenticated ON public.shifts;
DROP POLICY IF EXISTS shifts_insert_ops ON public.shifts;
DROP POLICY IF EXISTS shifts_update_ops ON public.shifts;
DROP POLICY IF EXISTS shifts_delete_ops ON public.shifts;
CREATE POLICY shifts_select_authenticated ON public.shifts FOR SELECT TO authenticated
  USING (
    tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j
                WHERE j.id = shifts.job_id AND j.tenant_id = shifts.tenant_id)
    AND EXISTS (SELECT 1 FROM public.staff s
                WHERE s.id = shifts.worker_id AND s.tenant_id = shifts.tenant_id)
    AND (private.can_view_schedule(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.profiles p JOIN public.staff s ON s.email = p.email
      WHERE p.id = auth.uid() AND s.id = shifts.worker_id AND s.tenant_id = shifts.tenant_id
    ))
  );
CREATE POLICY shifts_insert_ops ON public.shifts FOR INSERT TO authenticated
  WITH CHECK (
    private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j
                WHERE j.id = shifts.job_id AND j.tenant_id = shifts.tenant_id)
    AND EXISTS (SELECT 1 FROM public.staff s
                WHERE s.id = shifts.worker_id AND s.tenant_id = shifts.tenant_id)
  );
CREATE POLICY shifts_update_ops ON public.shifts FOR UPDATE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (
    private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j
                WHERE j.id = shifts.job_id AND j.tenant_id = shifts.tenant_id)
    AND EXISTS (SELECT 1 FROM public.staff s
                WHERE s.id = shifts.worker_id AND s.tenant_id = shifts.tenant_id)
  );
CREATE POLICY shifts_delete_ops ON public.shifts FOR DELETE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

-- job_attachments is deliberately scoped through its parent job. This works on
-- the documented live schema with no tenant_id and also rejects a mismatched
-- tenant_id if a reconciled catalog later adds that column.
DO $$
DECLARE
  has_attachment_tenant boolean;
  tenant_clause text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'job_attachments' AND column_name = 'tenant_id'
  ) INTO has_attachment_tenant;
  tenant_clause := CASE WHEN has_attachment_tenant
    THEN ' AND job_attachments.tenant_id = private.current_tenant_id()'
    ELSE '' END;

  DROP POLICY IF EXISTS "Allow authenticated read of job_attachments" ON public.job_attachments;
  DROP POLICY IF EXISTS "Allow ops full access to job_attachments" ON public.job_attachments;
  DROP POLICY IF EXISTS "Allow operatives to upload their own job attachments" ON public.job_attachments;
  DROP POLICY IF EXISTS "Allow anonymous upload to job_attachments" ON public.job_attachments;
  DROP POLICY IF EXISTS job_attachments_select_ops ON public.job_attachments;
  DROP POLICY IF EXISTS job_attachments_insert_ops ON public.job_attachments;
  DROP POLICY IF EXISTS job_attachments_update_ops ON public.job_attachments;
  DROP POLICY IF EXISTS job_attachments_delete_ops ON public.job_attachments;

  EXECUTE 'CREATE POLICY job_attachments_select_ops ON public.job_attachments FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_attachments.job_id
                   AND j.tenant_id = private.current_tenant_id())' || tenant_clause || ')';
  EXECUTE 'CREATE POLICY job_attachments_insert_ops ON public.job_attachments FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_attachments.job_id
                        AND j.tenant_id = private.current_tenant_id())' || tenant_clause || '
      AND (private.can_write_ops(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.shifts sh JOIN public.staff s ON s.id = sh.worker_id
        JOIN public.profiles p ON p.email = s.email
        WHERE p.id = auth.uid() AND sh.job_id = job_attachments.job_id
          AND sh.tenant_id = private.current_tenant_id() AND s.tenant_id = sh.tenant_id)))';
  EXECUTE 'CREATE POLICY job_attachments_update_ops ON public.job_attachments FOR UPDATE TO authenticated
    USING (private.can_write_ops(auth.uid()) AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_attachments.job_id
      AND j.tenant_id = private.current_tenant_id())' || tenant_clause || ')
    WITH CHECK (private.can_write_ops(auth.uid()) AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_attachments.job_id
      AND j.tenant_id = private.current_tenant_id())' || tenant_clause || ')';
  EXECUTE 'CREATE POLICY job_attachments_delete_ops ON public.job_attachments FOR DELETE TO authenticated
    USING (private.can_write_ops(auth.uid()) AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_attachments.job_id
      AND j.tenant_id = private.current_tenant_id())' || tenant_clause || ')';
END $$;

-- Requests are also children of jobs; remove the historical broad anonymous
-- SELECT and enforce both row and parent tenant ownership for every operation.
DROP POLICY IF EXISTS "Allow anonymous select on live job_document_requests" ON public.job_document_requests;
DROP POLICY IF EXISTS job_document_requests_select_ops ON public.job_document_requests;
DROP POLICY IF EXISTS job_document_requests_insert_ops ON public.job_document_requests;
DROP POLICY IF EXISTS job_document_requests_update_ops ON public.job_document_requests;
DROP POLICY IF EXISTS job_document_requests_delete_ops ON public.job_document_requests;
CREATE POLICY job_document_requests_select_ops ON public.job_document_requests FOR SELECT TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_document_requests.job_id AND j.tenant_id = job_document_requests.tenant_id));
CREATE POLICY job_document_requests_insert_ops ON public.job_document_requests FOR INSERT TO authenticated
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_document_requests.job_id AND j.tenant_id = job_document_requests.tenant_id));
CREATE POLICY job_document_requests_update_ops ON public.job_document_requests FOR UPDATE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_document_requests.job_id AND j.tenant_id = job_document_requests.tenant_id))
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_document_requests.job_id AND j.tenant_id = job_document_requests.tenant_id));
CREATE POLICY job_document_requests_delete_ops ON public.job_document_requests FOR DELETE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_document_requests.job_id AND j.tenant_id = job_document_requests.tenant_id));

-- Private storage: authenticated reads/writes must resolve to a same-tenant job
-- (or an ops-only compliance request); anonymous writes are token/request scoped.
DROP POLICY IF EXISTS "Allow read job-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read job-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload job-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous upload job-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous upload job-attachments via valid token" ON storage.objects;
DROP POLICY IF EXISTS "Allow ops delete job-attachments" ON storage.objects;
CREATE POLICY job_attachments_storage_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'job-attachments' AND (storage.foldername(name))[1] = 'jobs'
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = (storage.foldername(name))[2]
      AND j.tenant_id = private.current_tenant_id()));
CREATE POLICY job_attachments_storage_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'job-attachments' AND (storage.foldername(name))[1] = 'jobs'
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = (storage.foldername(name))[2]
      AND j.tenant_id = private.current_tenant_id())
    AND private.can_write_ops(auth.uid()));
CREATE POLICY job_attachments_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'job-attachments' AND private.can_write_ops(auth.uid())
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = (storage.foldername(name))[2]
      AND j.tenant_id = private.current_tenant_id()));
CREATE POLICY job_attachments_storage_anon_upload ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'job-attachments' AND (storage.foldername(name))[1] = 'requests'
    AND public.is_valid_job_document_token((storage.foldername(name))[2]));

DROP POLICY IF EXISTS upload_anonymous ON storage.objects;
DROP POLICY IF EXISTS select_anonymous ON storage.objects;
DROP POLICY IF EXISTS admin_all_storage ON storage.objects;
DROP POLICY IF EXISTS admin_select_storage ON storage.objects;
CREATE POLICY compliance_documents_anon_upload ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'compliance-documents' AND (storage.foldername(name))[1] = 'requests'
    AND EXISTS (SELECT 1 FROM public.document_requests r
      WHERE r.id::text = (storage.foldername(name))[2] AND r.completed_at IS NULL AND r.expires_at > now()));
CREATE POLICY compliance_documents_ops_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'compliance-documents' AND private.can_write_ops(auth.uid())
    AND EXISTS (SELECT 1 FROM public.document_requests r
      JOIN public.staff s ON s.id = r.worker_id
      WHERE r.id::text = (storage.foldername(name))[2]
        AND s.tenant_id = private.current_tenant_id()));
CREATE POLICY compliance_documents_ops_write ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'compliance-documents' AND private.can_write_ops(auth.uid()))
  WITH CHECK (bucket_id = 'compliance-documents' AND private.can_write_ops(auth.uid()));

-- Repair the Telegram RPC authorization gap: checking the caller's role alone
-- was insufficient because p_target_id could name another tenant's staff row.
CREATE OR REPLACE FUNCTION public.create_telegram_invite(p_target_id text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, extensions AS $$
DECLARE v_token text;
BEGIN
  IF NOT private.can_write_ops(auth.uid()) OR NOT EXISTS (
    SELECT 1 FROM public.staff s WHERE s.id = p_target_id AND s.tenant_id = private.current_tenant_id()
  ) THEN RAISE EXCEPTION 'Not authorised to create Telegram invites'; END IF;
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  UPDATE public.telegram_invites SET used_at = now()
    WHERE target_id = p_target_id AND tenant_id = private.current_tenant_id() AND used_at IS NULL;
  INSERT INTO public.telegram_invites (token, target_id, tenant_id) VALUES (v_token, p_target_id, private.current_tenant_id());
  INSERT INTO public.audit_logs (user_id, user_email, action, target_type, target_id, details, tenant_id)
    VALUES (auth.uid(), auth.jwt() ->> 'email', 'telegram_invite_created', 'staff', p_target_id,
      jsonb_build_object('expires_in_days', 7), private.current_tenant_id());
  RETURN v_token;
END $$;
CREATE OR REPLACE FUNCTION public.revoke_telegram_link(p_target_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NOT private.can_write_ops(auth.uid()) OR NOT EXISTS (
    SELECT 1 FROM public.staff s WHERE s.id = p_target_id AND s.tenant_id = private.current_tenant_id()
  ) THEN RAISE EXCEPTION 'Not authorised to revoke Telegram links'; END IF;
  UPDATE public.telegram_links SET revoked_at = now()
    WHERE target_id = p_target_id AND tenant_id = private.current_tenant_id() AND revoked_at IS NULL;
  UPDATE public.telegram_invites SET used_at = now()
    WHERE target_id = p_target_id AND tenant_id = private.current_tenant_id() AND used_at IS NULL;
  INSERT INTO public.audit_logs (user_id, user_email, action, target_type, target_id, details, tenant_id)
    VALUES (auth.uid(), auth.jwt() ->> 'email', 'telegram_link_revoked', 'staff', p_target_id, '{}'::jsonb, private.current_tenant_id());
END $$;
REVOKE ALL ON FUNCTION public.create_telegram_invite(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_telegram_link(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_telegram_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_telegram_link(text) TO authenticated;

-- Remove default PUBLIC/anon execution from every SECURITY DEFINER helper and
-- pin its lookup path. Explicit grants below preserve documented token flows.
DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature
           FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE p.prosecdef AND n.nspname IN ('public', 'private')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, private, pg_temp', f.signature);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.signature);
  END LOOP;
END $$;
DO $$
DECLARE signature text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.check_email_registered(text)',
    'public.get_document_request_details(uuid)',
    'public.get_job_document_request_details(text)',
    'public.is_valid_job_document_token(text)',
    'public.submit_job_attachment(text,text,text)',
    'public.submit_job_attachment(text,text,text,bigint)',
    'public.submit_worker_documents(uuid,jsonb)',
    'public.complete_job_document_request(text)',
    'public.log_anonymous_audit(text,text,text,text,jsonb)'
  ] LOOP
    IF to_regprocedure(signature) IS NOT NULL THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', signature);
    END IF;
  END LOOP;
END $$;
