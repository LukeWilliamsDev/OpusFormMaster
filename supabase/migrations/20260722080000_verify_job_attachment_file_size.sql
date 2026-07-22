-- file_size_bytes was trusted verbatim from the client (both the direct
-- authenticated insert path in JobDetails.tsx/PipelineRegistry.tsx and the
-- submit_job_attachment RPC used by the anonymous upload link), so a caller
-- could under-report size to sail past the 100MB-per-job cap. Low severity
-- (storage-quota abuse, not data exposure) but cheap to close at the root:
-- one trigger every insert path already goes through, instead of patching
-- each call site.
CREATE OR REPLACE FUNCTION public.sync_job_attachment_file_size()
RETURNS trigger AS $$
DECLARE
  v_path text;
  v_real_size bigint;
BEGIN
  v_path := substring(NEW.file_url from '/job-attachments/(.*)$');
  IF v_path IS NOT NULL THEN
    SELECT (metadata->>'size')::bigint INTO v_real_size
    FROM storage.objects
    WHERE bucket_id = 'job-attachments' AND name = v_path;

    IF v_real_size IS NOT NULL THEN
      NEW.file_size_bytes := v_real_size;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS sync_job_attachment_file_size_trg ON public.job_attachments;
CREATE TRIGGER sync_job_attachment_file_size_trg
  BEFORE INSERT ON public.job_attachments
  FOR EACH ROW EXECUTE FUNCTION public.sync_job_attachment_file_size();
