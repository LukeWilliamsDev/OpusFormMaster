-- Correct the storage policy path expressions after the initial remediation.
-- In nested EXISTS clauses, an unqualified `name` can resolve to staff.name;
-- always qualify the outer storage row as storage.objects.name.

DROP POLICY IF EXISTS job_attachments_storage_read ON storage.objects;
CREATE POLICY job_attachments_storage_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'job-attachments'
    AND (
      (
        (storage.foldername(storage.objects.name))[1] = 'jobs'
        AND EXISTS (
          SELECT 1 FROM public.jobs j
          WHERE j.id = (storage.foldername(storage.objects.name))[2]
            AND j.tenant_id = private.current_tenant_id()
        )
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

DROP POLICY IF EXISTS compliance_documents_anon_upload ON storage.objects;
CREATE POLICY compliance_documents_anon_upload ON storage.objects FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'compliance-documents'
    AND (storage.foldername(storage.objects.name))[1] = 'requests'
    AND EXISTS (
      SELECT 1
      FROM public.document_requests r
      WHERE r.id::text = (storage.foldername(storage.objects.name))[2]
        AND r.completed_at IS NULL
        AND r.expires_at > now()
    )
  );

DROP POLICY IF EXISTS compliance_documents_ops_read ON storage.objects;
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

DROP POLICY IF EXISTS compliance_documents_ops_insert ON storage.objects;
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

DROP POLICY IF EXISTS compliance_documents_ops_update ON storage.objects;
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

DROP POLICY IF EXISTS compliance_documents_ops_delete ON storage.objects;
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
