-- Allow bounded video evidence for job/site media. Certificate and compliance
-- buckets intentionally remain unchanged so those records retain originals.
UPDATE storage.buckets
SET file_size_limit = 100 * 1024 * 1024,
    allowed_mime_types = ARRAY[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/heic',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'video/mp4',
      'video/webm'
    ]
WHERE id = 'job-attachments';

UPDATE storage.buckets
SET file_size_limit = 100 * 1024 * 1024
WHERE id = 'third-party-attachments';

