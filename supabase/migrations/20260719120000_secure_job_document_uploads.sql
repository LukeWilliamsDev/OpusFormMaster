-- Security fix: anonymous job-document-upload flow previously allowed:
--   1. Unrestricted anonymous writes to the entire public job-attachments bucket.
--   2. job_attachments inserts bound only to job_id, not the caller's actual token.
--   3. A blanket anonymous SELECT on job_document_requests leaking every tenant's
--      live job_id/token pairs.
-- This migration removes the broad anon table/storage policies and replaces the
-- anonymous flow with SECURITY DEFINER functions (same pattern already used by
-- get_document_request_details / submit_worker_documents), so anonymous callers
-- can only look up or act on the single request matching a token they already hold.

-- Drop the blanket anonymous SELECT — it returned every live request's job_id/token.
DROP POLICY IF EXISTS "Allow anonymous select on live job_document_requests" ON public.job_document_requests;

-- Drop the job_id-only-scoped anonymous insert — any live request for a job was enough.
DROP POLICY IF EXISTS "Allow anonymous upload to job_attachments" ON public.job_attachments;

-- Drop the unrestricted anonymous storage write (any path, any file, in a public bucket).
DROP POLICY IF EXISTS "Allow anonymous upload job-attachments" ON storage.objects;

-- Token validity check, reusable by the storage policy below without granting anon
-- direct table access (SECURITY DEFINER bypasses RLS internally).
CREATE OR REPLACE FUNCTION public.is_valid_job_document_token(p_token text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.job_document_requests
    WHERE token = p_token
      AND completed_at IS NULL
      AND expires_at > now()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Anonymous storage uploads now require the token to appear in the object path
-- (requests/<token>/<file>) and be validated server-side.
CREATE POLICY "Allow anonymous upload job-attachments via valid token"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'job-attachments'
    AND (storage.foldername(name))[1] = 'requests'
    AND public.is_valid_job_document_token((storage.foldername(name))[2])
  );

-- Lookup by token only; returns nothing for an unknown/expired/completed token.
CREATE OR REPLACE FUNCTION public.get_job_document_request_details(p_token text)
RETURNS jsonb AS $$
  SELECT jsonb_build_object(
    'id', r.id,
    'job_id', r.job_id,
    'expires_at', r.expires_at,
    'completed_at', r.completed_at,
    'job', to_jsonb(j)
  )
  FROM public.job_document_requests r
  JOIN public.jobs j ON j.id = r.job_id
  WHERE r.token = p_token
    AND r.completed_at IS NULL
    AND r.expires_at > now();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Insert a job attachment on behalf of an anonymous holder of a live token.
-- job_id/tenant_id are derived server-side from the token, never taken from the client.
CREATE OR REPLACE FUNCTION public.submit_job_attachment(
  p_token text,
  p_file_name text,
  p_file_url text
)
RETURNS void AS $$
DECLARE
  v_job_id text;
  v_tenant_id uuid;
BEGIN
  SELECT job_id, tenant_id INTO v_job_id, v_tenant_id
  FROM public.job_document_requests
  WHERE token = p_token
    AND completed_at IS NULL
    AND expires_at > now();

  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'This upload link is invalid, expired, or has already been completed.';
  END IF;

  INSERT INTO public.job_attachments (job_id, tenant_id, type, file_name, file_url, uploaded_by)
  VALUES (v_job_id, v_tenant_id, 'document', p_file_name, p_file_url, 'External Contributor (via Link)');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark the request completed once all files have been submitted.
CREATE OR REPLACE FUNCTION public.complete_job_document_request(p_token text)
RETURNS void AS $$
BEGIN
  UPDATE public.job_document_requests
  SET completed_at = now()
  WHERE token = p_token
    AND completed_at IS NULL
    AND expires_at > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
