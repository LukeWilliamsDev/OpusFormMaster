-- select_anonymous/update_anonymous on document_requests had no scoping to a
-- specific request id, so any anon caller could SELECT/UPDATE every pending
-- request row (worker ids, requested cert types, expiry) across all tenants.
-- The app already has a secure path for both: get_document_request_details()
-- RPC (SECURITY DEFINER) for reads, submit_worker_documents() RPC (SECURITY
-- DEFINER) for completion — neither needs a table-level anon policy.
DROP POLICY IF EXISTS select_anonymous ON public.document_requests;
DROP POLICY IF EXISTS update_anonymous ON public.document_requests;

-- select_anonymous on storage.objects allowed reading/listing every object in
-- the compliance-documents bucket, not just the requests/ prefix workers
-- upload into (upload_anonymous already scopes inserts to that prefix).
DROP POLICY IF EXISTS select_anonymous ON storage.objects;
CREATE POLICY select_anonymous ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'compliance-documents'
    AND (storage.foldername(name))[1] = 'requests'
  );

-- admin_all_storage granted every authenticated user (any role/tenant) full
-- ALL on the bucket -- missing the can_write_ops() check its name implies.
DROP POLICY IF EXISTS admin_all_storage ON storage.objects;
CREATE POLICY admin_all_storage ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'compliance-documents' AND private.can_write_ops(auth.uid()))
  WITH CHECK (bucket_id = 'compliance-documents' AND private.can_write_ops(auth.uid()));
