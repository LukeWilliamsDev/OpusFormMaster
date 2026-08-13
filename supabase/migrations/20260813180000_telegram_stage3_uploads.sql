-- Stage 3: certificate and job-file uploads from Telegram.
--
-- Two destinations, deliberately not one new table:
--   - job_attachments (existing) already models "a file against a job", so a
--     photo/PDF sent while an operative is on a job today lands there via the
--     same path/getPublicUrl convention JobDetails.tsx already uses.
--   - document_requests gets a new telegram_uploads queue. A bare Telegram
--     photo has no cert type or expiry date, and submit_worker_documents
--     requires both before it will touch staff.tickets, so these land as
--     pending review rather than being written to tickets with guessed or
--     missing metadata.
-- job_notes gets author attribution so a caption arriving alongside a file
-- can be recorded as an operative-authored note, distinct from ops-authored
-- ones on the same job.

ALTER TABLE public.job_notes
  ADD COLUMN author_type text NOT NULL DEFAULT 'ops' CHECK (author_type IN ('ops', 'operative')),
  ADD COLUMN author_staff_id text REFERENCES public.staff(id);

ALTER TABLE public.document_requests
  ADD COLUMN telegram_uploads jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Read-modify-write from the edge function would race two uploads landing in
-- the same hour; append atomically instead. Service role only — this has no
-- token/ownership check of its own, so PostgREST must never expose it to
-- anon/authenticated.
CREATE OR REPLACE FUNCTION public.append_document_request_upload(
  p_request_id uuid,
  p_upload jsonb
)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.document_requests
  SET telegram_uploads = telegram_uploads || jsonb_build_array(p_upload)
  WHERE id = p_request_id;
$$;

REVOKE ALL ON FUNCTION public.append_document_request_upload(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_document_request_upload(uuid, jsonb) TO service_role;
