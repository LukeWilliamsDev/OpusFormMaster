-- Storage inserts are evaluated before the object metadata is fully populated
-- by the storage service. Keep the RLS boundary on role, path, and tenant;
-- add_manual_staff_compliance validates MIME type and size after upload.

DROP POLICY IF EXISTS compliance_documents_manual_insert ON storage.objects;
CREATE POLICY compliance_documents_manual_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'compliance-documents'
  AND private.can_use_certificate_checker(auth.uid())
  AND (storage.foldername(storage.objects.name))[1] = 'manual'
  AND EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.id = (storage.foldername(storage.objects.name))[2]
      AND s.tenant_id = private.current_tenant_id()
  )
);
