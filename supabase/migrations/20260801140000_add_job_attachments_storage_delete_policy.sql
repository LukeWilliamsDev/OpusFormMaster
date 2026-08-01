-- job-attachments storage bucket has SELECT and INSERT policies but no
-- DELETE, so the "completely remove" attachment flow (deletes the DB row,
-- then the underlying file) would silently leave the file orphaned in
-- storage — RLS blocks the remove(), no error surfaces to the caller.
CREATE POLICY "Allow ops delete job-attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'job-attachments' AND private.can_write_ops(auth.uid()));
