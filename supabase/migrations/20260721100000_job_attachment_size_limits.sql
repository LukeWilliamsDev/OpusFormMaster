-- Track file size so the 10MB-per-file / 100MB-per-job upload caps (enforced
-- client-side in JobDetails.tsx and JobUploadPortal.tsx) can check the
-- running total against what's already stored for a job.
ALTER TABLE public.job_attachments ADD COLUMN IF NOT EXISTS file_size_bytes bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.submit_job_attachment(
  p_token text,
  p_file_name text,
  p_file_url text,
  p_file_size_bytes bigint DEFAULT 0
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

  INSERT INTO public.job_attachments (job_id, tenant_id, type, file_name, file_url, file_size_bytes, uploaded_by)
  VALUES (v_job_id, v_tenant_id, 'document', p_file_name, p_file_url, p_file_size_bytes, 'External Contributor (via Link)');

  INSERT INTO public.audit_logs (user_id, user_email, action, target_type, target_id, details, tenant_id)
  VALUES (
    NULL,
    'External Contributor (via Link)',
    'EXTERNAL_UPLOAD',
    'jobs',
    v_job_id,
    jsonb_build_object('file_name', p_file_name),
    v_tenant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Anonymous link visitors can't SELECT job_attachments directly (RLS requires
-- an authenticated ops user), so the 100MB-per-job total has to be surfaced
-- through this SECURITY DEFINER lookup for the client to enforce it.
CREATE OR REPLACE FUNCTION public.get_job_document_request_details(p_token text)
RETURNS jsonb AS $$
  SELECT jsonb_build_object(
    'id', r.id,
    'job_id', r.job_id,
    'expires_at', r.expires_at,
    'completed_at', r.completed_at,
    'job', to_jsonb(j),
    'existing_total_bytes', COALESCE(
      (SELECT SUM(file_size_bytes) FROM public.job_attachments WHERE job_id = r.job_id), 0
    )
  )
  FROM public.job_document_requests r
  JOIN public.jobs j ON j.id = r.job_id
  WHERE r.token = p_token
    AND r.completed_at IS NULL
    AND r.expires_at > now();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path TO 'public';
