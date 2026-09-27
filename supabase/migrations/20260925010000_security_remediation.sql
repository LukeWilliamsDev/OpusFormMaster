-- Security remediation for the current single-tenant installation.
--
-- This migration keeps tenant predicates even while only one tenant currently
-- holds production data. The live catalog also contains third-party portal
-- tables/policies, so those access branches are preserved below.
-- job_attachments and job_document_requests intentionally have no tenant_id in
-- the deployed database; both are scoped through their parent job.

UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
WHERE id IN ('job-attachments', 'compliance-documents');

-- Jobs remain the tenant root and retain the schedule visibility rules.
DROP POLICY IF EXISTS jobs_select_authenticated ON public.jobs;
DROP POLICY IF EXISTS jobs_insert_ops ON public.jobs;
DROP POLICY IF EXISTS jobs_update_ops ON public.jobs;
DROP POLICY IF EXISTS jobs_delete_ops ON public.jobs;

CREATE POLICY jobs_select_authenticated ON public.jobs FOR SELECT TO authenticated
  USING (
    tenant_id = private.current_tenant_id()
    AND (
      private.can_view_schedule(auth.uid())
      OR private.third_party_can_access_job(auth.uid(), jobs.id)
      OR EXISTS (
        SELECT 1
        FROM public.shifts sh
        JOIN public.staff s ON s.id = sh.worker_id
        JOIN public.profiles p ON p.email = s.email
        WHERE p.id = auth.uid()
          AND sh.job_id = jobs.id
          AND sh.tenant_id = jobs.tenant_id
      )
    )
  );

CREATE POLICY jobs_insert_ops ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

CREATE POLICY jobs_update_ops ON public.jobs FOR UPDATE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

CREATE POLICY jobs_delete_ops ON public.jobs FOR DELETE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

-- Shifts must belong to the caller's tenant and to same-tenant parent rows.
DROP POLICY IF EXISTS shifts_select_authenticated ON public.shifts;
DROP POLICY IF EXISTS shifts_insert_ops ON public.shifts;
DROP POLICY IF EXISTS shifts_update_ops ON public.shifts;
DROP POLICY IF EXISTS shifts_delete_ops ON public.shifts;

CREATE POLICY shifts_select_authenticated ON public.shifts FOR SELECT TO authenticated
  USING (
    tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = shifts.job_id AND j.tenant_id = shifts.tenant_id)
    AND EXISTS (SELECT 1 FROM public.staff s WHERE s.id = shifts.worker_id AND s.tenant_id = shifts.tenant_id)
    AND (
      private.can_view_schedule(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        JOIN public.staff s ON s.email = p.email
        WHERE p.id = auth.uid() AND s.id = shifts.worker_id AND s.tenant_id = shifts.tenant_id
      )
    )
  );

CREATE POLICY shifts_insert_ops ON public.shifts FOR INSERT TO authenticated
  WITH CHECK (
    private.can_write_ops(auth.uid())
    AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = shifts.job_id AND j.tenant_id = shifts.tenant_id)
    AND EXISTS (SELECT 1 FROM public.staff s WHERE s.id = shifts.worker_id AND s.tenant_id = shifts.tenant_id)
  );

CREATE POLICY shifts_update_ops ON public.shifts FOR UPDATE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (
    private.can_write_ops(auth.uid())
    AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = shifts.job_id AND j.tenant_id = shifts.tenant_id)
    AND EXISTS (SELECT 1 FROM public.staff s WHERE s.id = shifts.worker_id AND s.tenant_id = shifts.tenant_id)
  );

CREATE POLICY shifts_delete_ops ON public.shifts FOR DELETE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

-- Document senders may prepare and send billing documents without receiving
-- general operational write access. The tenant predicate remains mandatory.
CREATE OR REPLACE FUNCTION private.can_send_documents(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
      AND p.role IN ('admin', 'director', 'logistics_coordinator', 'logistics_assistant')
  );
$$;
REVOKE ALL ON FUNCTION private.can_send_documents(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_send_documents(uuid) TO authenticated;

DROP POLICY IF EXISTS quotes_select_authenticated ON public.quotes;
DROP POLICY IF EXISTS quotes_insert_ops ON public.quotes;
DROP POLICY IF EXISTS quotes_update_ops ON public.quotes;
DROP POLICY IF EXISTS quotes_delete_ops ON public.quotes;
CREATE POLICY quotes_select_authenticated ON public.quotes FOR SELECT TO authenticated
  USING (private.can_send_documents(auth.uid()) AND tenant_id = private.current_tenant_id());
CREATE POLICY quotes_insert_ops ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (private.can_send_documents(auth.uid()) AND tenant_id = private.current_tenant_id());
CREATE POLICY quotes_update_ops ON public.quotes FOR UPDATE TO authenticated
  USING (private.can_send_documents(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.can_send_documents(auth.uid()) AND tenant_id = private.current_tenant_id());
CREATE POLICY quotes_delete_ops ON public.quotes FOR DELETE TO authenticated
  USING (private.can_send_documents(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS invoices_select_ops ON public.invoices;
DROP POLICY IF EXISTS invoices_insert_ops ON public.invoices;
DROP POLICY IF EXISTS invoices_update_ops ON public.invoices;
DROP POLICY IF EXISTS invoices_delete_ops ON public.invoices;
CREATE POLICY invoices_select_ops ON public.invoices FOR SELECT TO authenticated
  USING (
    private.can_send_documents(auth.uid())
    AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = invoices.job_id AND j.tenant_id = invoices.tenant_id)
  );
CREATE POLICY invoices_insert_ops ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (
    private.can_send_documents(auth.uid())
    AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = invoices.job_id AND j.tenant_id = invoices.tenant_id)
  );
CREATE POLICY invoices_update_ops ON public.invoices FOR UPDATE TO authenticated
  USING (
    private.can_send_documents(auth.uid())
    AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = invoices.job_id AND j.tenant_id = invoices.tenant_id)
  )
  WITH CHECK (
    private.can_send_documents(auth.uid())
    AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = invoices.job_id AND j.tenant_id = invoices.tenant_id)
  );
CREATE POLICY invoices_delete_ops ON public.invoices FOR DELETE TO authenticated
  USING (private.can_send_documents(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS final_bills_select_ops ON public.final_bills;
DROP POLICY IF EXISTS final_bills_insert_ops ON public.final_bills;
DROP POLICY IF EXISTS final_bills_update_ops ON public.final_bills;
DROP POLICY IF EXISTS final_bills_delete_ops ON public.final_bills;
CREATE POLICY final_bills_select_ops ON public.final_bills FOR SELECT TO authenticated
  USING (
    private.can_send_documents(auth.uid())
    AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = final_bills.job_id AND j.tenant_id = final_bills.tenant_id)
  );
CREATE POLICY final_bills_insert_ops ON public.final_bills FOR INSERT TO authenticated
  WITH CHECK (
    private.can_send_documents(auth.uid())
    AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = final_bills.job_id AND j.tenant_id = final_bills.tenant_id)
  );
CREATE POLICY final_bills_update_ops ON public.final_bills FOR UPDATE TO authenticated
  USING (
    private.can_send_documents(auth.uid())
    AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = final_bills.job_id AND j.tenant_id = final_bills.tenant_id)
  )
  WITH CHECK (
    private.can_send_documents(auth.uid())
    AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = final_bills.job_id AND j.tenant_id = final_bills.tenant_id)
  );
CREATE POLICY final_bills_delete_ops ON public.final_bills FOR DELETE TO authenticated
  USING (private.can_send_documents(auth.uid()) AND tenant_id = private.current_tenant_id());

-- Compliance request creation/resend is also a document-send capability. The
-- anonymous table-wide SELECT/UPDATE policies are removed; token portal RPCs
-- are SECURITY DEFINER and remain the external access path.
DROP POLICY IF EXISTS select_all_auth ON public.document_requests;
DROP POLICY IF EXISTS select_anonymous ON public.document_requests;
DROP POLICY IF EXISTS update_anonymous ON public.document_requests;
DROP POLICY IF EXISTS admin_all ON public.document_requests;
CREATE POLICY compliance_requests_select_senders ON public.document_requests FOR SELECT TO authenticated
  USING (private.can_send_documents(auth.uid()) AND tenant_id = private.current_tenant_id());
CREATE POLICY compliance_requests_insert_senders ON public.document_requests FOR INSERT TO authenticated
  WITH CHECK (
    private.can_send_documents(auth.uid())
    AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.staff s WHERE s.id = document_requests.worker_id AND s.tenant_id = document_requests.tenant_id)
  );
CREATE POLICY compliance_requests_update_senders ON public.document_requests FOR UPDATE TO authenticated
  USING (private.can_send_documents(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (
    private.can_send_documents(auth.uid())
    AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.staff s WHERE s.id = document_requests.worker_id AND s.tenant_id = document_requests.tenant_id)
  );
CREATE POLICY compliance_requests_delete_senders ON public.document_requests FOR DELETE TO authenticated
  USING (private.can_send_documents(auth.uid()) AND tenant_id = private.current_tenant_id());

-- job_attachments is scoped through jobs so this works whether the deployed
-- table has the drifted tenant_id column or not.
DO $$
DECLARE
  has_attachment_tenant boolean;
  tenant_clause text;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
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
    AND j.tenant_id = private.current_tenant_id())' || tenant_clause || '
      AND (private.can_view_schedule(auth.uid())
        OR (private.is_third_party(auth.uid())
          AND job_attachments.type IN (''image_before'', ''image_after'')
          AND private.third_party_can_access_job(auth.uid(), job_attachments.job_id))
        OR EXISTS (
        SELECT 1 FROM public.shifts sh JOIN public.staff s ON s.id = sh.worker_id
        JOIN public.profiles p ON p.email = s.email
        WHERE p.id = auth.uid() AND sh.job_id = job_attachments.job_id
          AND sh.tenant_id = private.current_tenant_id())))';

  EXECUTE 'CREATE POLICY job_attachments_insert_ops ON public.job_attachments FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_attachments.job_id
      AND j.tenant_id = private.current_tenant_id())' || tenant_clause || '
      AND (private.can_write_ops(auth.uid()) OR EXISTS (
        SELECT 1 FROM public.shifts sh JOIN public.staff s ON s.id = sh.worker_id
        JOIN public.profiles p ON p.email = s.email
        WHERE p.id = auth.uid() AND sh.job_id = job_attachments.job_id
          AND sh.tenant_id = private.current_tenant_id() AND s.tenant_id = sh.tenant_id)))';

  EXECUTE 'CREATE POLICY job_attachments_update_ops ON public.job_attachments FOR UPDATE TO authenticated
    USING (private.can_write_ops(auth.uid()) AND EXISTS (SELECT 1 FROM public.jobs j
      WHERE j.id = job_attachments.job_id AND j.tenant_id = private.current_tenant_id())' || tenant_clause || ')
    WITH CHECK (private.can_write_ops(auth.uid()) AND EXISTS (SELECT 1 FROM public.jobs j
      WHERE j.id = job_attachments.job_id AND j.tenant_id = private.current_tenant_id())' || tenant_clause || ')';

  EXECUTE 'CREATE POLICY job_attachments_delete_ops ON public.job_attachments FOR DELETE TO authenticated
    USING (private.can_write_ops(auth.uid()) AND EXISTS (SELECT 1 FROM public.jobs j
      WHERE j.id = job_attachments.job_id AND j.tenant_id = private.current_tenant_id())' || tenant_clause || ')';
END $$;

-- Document requests have no anonymous table-read path; token RPCs are the only
-- way an external contributor discovers a request.
DROP POLICY IF EXISTS "Allow anonymous select on live job_document_requests" ON public.job_document_requests;
DROP POLICY IF EXISTS select_all_auth ON public.job_document_requests;
DROP POLICY IF EXISTS admin_all ON public.job_document_requests;
DROP POLICY IF EXISTS job_document_requests_select_ops ON public.job_document_requests;
DROP POLICY IF EXISTS job_document_requests_insert_ops ON public.job_document_requests;
DROP POLICY IF EXISTS job_document_requests_update_ops ON public.job_document_requests;
DROP POLICY IF EXISTS job_document_requests_delete_ops ON public.job_document_requests;

CREATE POLICY job_document_requests_select_ops ON public.job_document_requests FOR SELECT TO authenticated
  USING (
    private.can_write_ops(auth.uid())
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_document_requests.job_id AND j.tenant_id = private.current_tenant_id())
  );
CREATE POLICY job_document_requests_insert_ops ON public.job_document_requests FOR INSERT TO authenticated
  WITH CHECK (
    private.can_write_ops(auth.uid())
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_document_requests.job_id AND j.tenant_id = private.current_tenant_id())
  );
CREATE POLICY job_document_requests_update_ops ON public.job_document_requests FOR UPDATE TO authenticated
  USING (
    private.can_write_ops(auth.uid())
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_document_requests.job_id AND j.tenant_id = private.current_tenant_id())
  )
  WITH CHECK (
    private.can_write_ops(auth.uid())
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_document_requests.job_id AND j.tenant_id = private.current_tenant_id())
  );
CREATE POLICY job_document_requests_delete_ops ON public.job_document_requests FOR DELETE TO authenticated
  USING (
    private.can_write_ops(auth.uid())
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_document_requests.job_id AND j.tenant_id = private.current_tenant_id())
  );

-- Storage is private. External contributors may upload through a live token;
-- reads are issued as short-lived signed URLs after the application checks role
-- and record scope. There is no anonymous bucket-wide read policy.
DROP POLICY IF EXISTS "Allow read job-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read job-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload job-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous upload job-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous upload job-attachments via valid token" ON storage.objects;
DROP POLICY IF EXISTS "Allow ops delete job-attachments" ON storage.objects;
CREATE POLICY job_attachments_storage_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'job-attachments'
    AND (
      (
        (storage.foldername(storage.objects.name))[1] = 'jobs'
        AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = (storage.foldername(storage.objects.name))[2]
          AND j.tenant_id = private.current_tenant_id())
        AND (
          private.can_view_schedule(auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.shifts sh
            JOIN public.staff s ON s.id = sh.worker_id
            JOIN public.profiles p ON p.email = s.email
            WHERE p.id = auth.uid()
              AND sh.job_id = (storage.foldername(storage.objects.name))[2]
              AND sh.tenant_id = private.current_tenant_id()
          )
        )
      )
      OR (
        (storage.foldername(storage.objects.name))[1] = 'requests'
        AND private.can_write_ops(auth.uid())
        AND EXISTS (
          SELECT 1
          FROM public.job_attachments a
          JOIN public.jobs j ON j.id = a.job_id
          WHERE j.tenant_id = private.current_tenant_id()
            AND a.file_url LIKE '%' || storage.objects.name
        )
      )
      OR (
        private.is_third_party(auth.uid())
        AND (
          ((storage.foldername(storage.objects.name))[1] = 'third-party-media'
            AND private.third_party_can_access_job(auth.uid(), (storage.foldername(storage.objects.name))[2]))
          OR ((storage.foldername(storage.objects.name))[1] = 'jobs'
            AND private.third_party_can_access_job(auth.uid(), (storage.foldername(storage.objects.name))[2]))
        )
      )
    )
  );
CREATE POLICY job_attachments_storage_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-attachments'
    AND (storage.foldername(storage.objects.name))[1] = 'jobs'
    AND private.can_write_ops(auth.uid())
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = (storage.foldername(storage.objects.name))[2]
      AND j.tenant_id = private.current_tenant_id())
  );
CREATE POLICY job_attachments_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'job-attachments'
    AND private.can_write_ops(auth.uid())
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = (storage.foldername(storage.objects.name))[2]
      AND j.tenant_id = private.current_tenant_id())
  );
CREATE POLICY job_attachments_storage_anon_upload ON storage.objects FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'job-attachments'
    AND (storage.foldername(storage.objects.name))[1] = 'requests'
    AND public.is_valid_job_document_token((storage.foldername(storage.objects.name))[2])
  );

DROP POLICY IF EXISTS upload_anonymous ON storage.objects;
DROP POLICY IF EXISTS select_anonymous ON storage.objects;
DROP POLICY IF EXISTS admin_all_storage ON storage.objects;
DROP POLICY IF EXISTS admin_select_storage ON storage.objects;
CREATE POLICY compliance_documents_anon_upload ON storage.objects FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'compliance-documents'
    AND (storage.foldername(storage.objects.name))[1] = 'requests'
    AND EXISTS (
      SELECT 1 FROM public.document_requests r
      WHERE r.id::text = (storage.foldername(storage.objects.name))[2]
        AND r.completed_at IS NULL
        AND r.expires_at > now()
    )
  );
CREATE POLICY compliance_documents_ops_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'compliance-documents'
    AND private.can_write_ops(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.document_requests r
      JOIN public.staff s ON s.id = r.worker_id
      WHERE r.id::text = (storage.foldername(storage.objects.name))[2]
        AND s.tenant_id = private.current_tenant_id()
    )
  );
CREATE POLICY compliance_documents_ops_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'compliance-documents'
    AND private.can_write_ops(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.document_requests r
      JOIN public.staff s ON s.id = r.worker_id
      WHERE r.id::text = (storage.foldername(storage.objects.name))[2]
        AND s.tenant_id = private.current_tenant_id()
    )
  );
CREATE POLICY compliance_documents_ops_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'compliance-documents'
    AND private.can_write_ops(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.document_requests r
      JOIN public.staff s ON s.id = r.worker_id
      WHERE r.id::text = (storage.foldername(storage.objects.name))[2]
        AND s.tenant_id = private.current_tenant_id()
    )
  )
  WITH CHECK (
    bucket_id = 'compliance-documents'
    AND private.can_write_ops(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.document_requests r
      JOIN public.staff s ON s.id = r.worker_id
      WHERE r.id::text = (storage.foldername(storage.objects.name))[2]
        AND s.tenant_id = private.current_tenant_id()
    )
  );
CREATE POLICY compliance_documents_ops_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'compliance-documents'
    AND private.can_write_ops(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.document_requests r
      JOIN public.staff s ON s.id = r.worker_id
      WHERE r.id::text = (storage.foldername(storage.objects.name))[2]
        AND s.tenant_id = private.current_tenant_id()
    )
  );

-- The token upload RPC must not accept an arbitrary external URL. The trigger
-- validates that external rows point into the matching request path.
CREATE OR REPLACE FUNCTION public.validate_external_job_attachment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  request_token text;
BEGIN
  IF NEW.uploaded_by = 'External Contributor (via Link)' THEN
    request_token := split_part(substring(NEW.file_url from '/job-attachments/(.*)$'), '/', 2);
    IF request_token IS NULL OR request_token = '' OR NOT EXISTS (
      SELECT 1
      FROM public.job_document_requests r
      WHERE r.token = request_token
        AND r.job_id = NEW.job_id
        AND r.completed_at IS NULL
        AND r.expires_at > now()
    ) THEN
      RAISE EXCEPTION 'External attachment URL does not match a live job request';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_external_job_attachment_trg ON public.job_attachments;
CREATE TRIGGER validate_external_job_attachment_trg
  BEFORE INSERT OR UPDATE OF file_url, uploaded_by, job_id ON public.job_attachments
  FOR EACH ROW EXECUTE FUNCTION public.validate_external_job_attachment();
REVOKE ALL ON FUNCTION public.validate_external_job_attachment() FROM PUBLIC, anon, authenticated;

-- Telegram invite/revoke must target a staff member in the caller's tenant.
CREATE OR REPLACE FUNCTION public.create_telegram_invite(p_target_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE v_token text;
BEGIN
  IF NOT private.can_write_ops(auth.uid()) OR NOT EXISTS (
    SELECT 1 FROM public.staff s WHERE s.id = p_target_id AND s.tenant_id = private.current_tenant_id()
  ) THEN RAISE EXCEPTION 'Not authorised to create Telegram invites'; END IF;
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  UPDATE public.telegram_invites SET used_at = now()
    WHERE target_id = p_target_id AND tenant_id = private.current_tenant_id() AND used_at IS NULL;
  INSERT INTO public.telegram_invites (token, target_id, tenant_id)
    VALUES (v_token, p_target_id, private.current_tenant_id());
  INSERT INTO public.audit_logs (user_id, user_email, action, target_type, target_id, details, tenant_id)
    VALUES (auth.uid(), auth.jwt() ->> 'email', 'telegram_invite_created', 'staff', p_target_id,
      jsonb_build_object('expires_in_days', 7), private.current_tenant_id());
  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_telegram_link(p_target_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NOT private.can_write_ops(auth.uid()) OR NOT EXISTS (
    SELECT 1 FROM public.staff s WHERE s.id = p_target_id AND s.tenant_id = private.current_tenant_id()
  ) THEN RAISE EXCEPTION 'Not authorised to revoke Telegram links'; END IF;
  UPDATE public.telegram_links SET revoked_at = now()
    WHERE target_id = p_target_id AND tenant_id = private.current_tenant_id() AND revoked_at IS NULL;
  UPDATE public.telegram_invites SET used_at = now()
    WHERE target_id = p_target_id AND tenant_id = private.current_tenant_id() AND used_at IS NULL;
  INSERT INTO public.audit_logs (user_id, user_email, action, target_type, target_id, details, tenant_id)
    VALUES (auth.uid(), auth.jwt() ->> 'email', 'telegram_link_revoked', 'staff', p_target_id,
      '{}'::jsonb, private.current_tenant_id());
END;
$$;
REVOKE ALL ON FUNCTION public.create_telegram_invite(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_telegram_link(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_telegram_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_telegram_link(text) TO authenticated;

-- Pending Telegram uploads are service-role state, not a PostgREST surface.
REVOKE ALL ON TABLE public.telegram_pending_uploads FROM PUBLIC, anon, authenticated;

-- Pin every SECURITY DEFINER lookup path, then remove direct execution from
-- anonymous/authenticated callers by default. The explicit grants below keep
-- only the portal RPCs and RLS helper functions that the application needs.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef AND n.nspname IN ('public', 'private')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, private, pg_temp', f.signature);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF to_regprocedure('private.current_tenant_id()') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION private.current_tenant_id() TO authenticated;
  END IF;
  IF to_regprocedure('private.can_view_schedule(uuid)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION private.can_view_schedule(uuid) TO authenticated;
  END IF;
  IF to_regprocedure('private.can_write_ops(uuid)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION private.can_write_ops(uuid) TO authenticated;
  END IF;
  IF to_regprocedure('private.can_send_documents(uuid)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION private.can_send_documents(uuid) TO authenticated;
  END IF;
  IF to_regprocedure('private.has_role(uuid,public.app_role)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
  END IF;
  IF to_regprocedure('private.is_internal_user(uuid)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION private.is_internal_user(uuid) TO authenticated;
  END IF;
  IF to_regprocedure('private.is_third_party(uuid)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION private.is_third_party(uuid) TO authenticated;
  END IF;
  IF to_regprocedure('private.third_party_can_access_job(uuid,text)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION private.third_party_can_access_job(uuid,text) TO authenticated;
  END IF;
  IF to_regprocedure('private.third_party_owns_staff(uuid,text)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION private.third_party_owns_staff(uuid,text) TO authenticated;
  END IF;
  IF to_regprocedure('private.third_party_owns_submission(uuid,uuid)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION private.third_party_owns_submission(uuid,uuid) TO authenticated;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regprocedure('public.get_document_request_details(uuid)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.get_document_request_details(uuid) TO anon, authenticated;
  END IF;
  IF to_regprocedure('public.get_job_document_request_details(text)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.get_job_document_request_details(text) TO anon, authenticated;
  END IF;
  IF to_regprocedure('public.is_valid_job_document_token(text)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.is_valid_job_document_token(text) TO anon, authenticated;
  END IF;
  IF to_regprocedure('public.complete_job_document_request(text)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.complete_job_document_request(text) TO anon, authenticated;
  END IF;
  IF to_regprocedure('public.submit_job_attachment(text,text,text,bigint)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.submit_job_attachment(text,text,text,bigint) TO anon, authenticated;
  ELSIF to_regprocedure('public.submit_job_attachment(text,text,text)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.submit_job_attachment(text,text,text) TO anon, authenticated;
  END IF;
  IF to_regprocedure('public.submit_worker_documents(uuid,jsonb)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.submit_worker_documents(uuid,jsonb) TO anon, authenticated;
  END IF;
  IF to_regprocedure('public.log_anonymous_audit(text,text,text,text,jsonb)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.log_anonymous_audit(text,text,text,text,jsonb) TO anon, authenticated;
  END IF;
  IF to_regprocedure('public.create_telegram_invite(text)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.create_telegram_invite(text) TO authenticated;
  END IF;
  IF to_regprocedure('public.revoke_telegram_link(text)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.revoke_telegram_link(text) TO authenticated;
  END IF;
  IF to_regprocedure('public.admin_delete_user(uuid)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
  END IF;
  IF to_regprocedure('public.log_third_party_action(text,text,text,jsonb)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.log_third_party_action(text,text,text,jsonb) TO authenticated;
  END IF;
  IF to_regprocedure('public.rename_third_party_attachment(uuid,text)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.rename_third_party_attachment(uuid,text) TO authenticated;
  END IF;
  IF to_regprocedure('public.review_third_party_staff(uuid,boolean,text)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.review_third_party_staff(uuid,boolean,text) TO authenticated;
  END IF;
  IF to_regprocedure('public.submit_third_party_staff(text,text,text,text,text,text)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.submit_third_party_staff(text,text,text,text,text,text) TO authenticated;
  END IF;
END;
$$;
