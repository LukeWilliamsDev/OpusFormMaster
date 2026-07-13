-- Restrict admin_all_storage policy to authenticated users who are admins or dispatchers
DROP POLICY IF EXISTS admin_all_storage ON storage.objects;
CREATE POLICY admin_all_storage ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'compliance-documents' 
    AND private.can_write_ops(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'compliance-documents' 
    AND private.can_write_ops(auth.uid())
  );
