-- Reassert the intended private posture for job attachments.
-- The original bucket was created public and older deployments may have retained
-- that setting even after the first hardening migration was added.
UPDATE storage.buckets
SET public = false
WHERE id = 'job-attachments';

DROP POLICY IF EXISTS "Allow read job-attachments" ON storage.objects;

-- Staff access remains available through authenticated signed-URL requests.
-- Anonymous upload access is intentionally handled by the token-scoped policy
-- from 20260719120000_secure_job_document_uploads.sql; there is no anonymous
-- read policy for this bucket.
