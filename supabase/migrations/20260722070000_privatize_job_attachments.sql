-- job-attachments was created as a public bucket with an unrestricted SELECT
-- policy (20260716100000): any file (site photos/documents, potentially
-- containing worker PII) was readable by anyone with the URL, indefinitely,
-- protected only by an unguessable filename. Uploads were already locked
-- down (20260719120000); this closes the matching read hole.
UPDATE storage.buckets SET public = false WHERE id = 'job-attachments';

DROP POLICY IF EXISTS "Allow read job-attachments" ON storage.objects;

-- No anonymous read path exists for job-attachments (the external upload
-- portal never reads files back), so reads are staff-only.
CREATE POLICY "Allow authenticated read job-attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'job-attachments');
