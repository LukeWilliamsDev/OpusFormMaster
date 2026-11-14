-- Enforce the public job-document upload contract at the database boundary.
-- The browser checks these limits for usability, but a bearer-link holder can
-- call Storage and this RPC directly, so the server must verify the object,
-- path, byte count, request state, and aggregate job cap.

-- Keep the historical overload from creating ambiguous PostgREST resolution
-- if a target ledger contains the pre-size-limit function signature.
DROP FUNCTION IF EXISTS public.submit_job_attachment(text, text, text);

CREATE OR REPLACE FUNCTION public.submit_job_attachment(
  p_token text,
  p_file_name text,
  p_file_url text,
  p_file_size_bytes bigint DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job_id text;
  v_tenant_id uuid;
  v_file_path text;
  v_actual_size bigint;
  v_existing_total bigint;
BEGIN
  IF NULLIF(trim(p_token), '') IS NULL
     OR NULLIF(trim(p_file_name), '') IS NULL
     OR length(trim(p_file_name)) > 255
     OR NULLIF(trim(p_file_url), '') IS NULL
     OR length(trim(p_file_url)) > 2048
     OR p_file_size_bytes <= 0
     OR p_file_size_bytes > 10 * 1024 * 1024 THEN
    RAISE EXCEPTION 'Invalid upload metadata';
  END IF;

  -- Lock the request row so two concurrent submissions cannot both pass the
  -- aggregate 100MB check before inserting their attachment rows.
  SELECT job_id, tenant_id
    INTO v_job_id, v_tenant_id
  FROM public.job_document_requests
  WHERE token = p_token
    AND completed_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'This upload link is invalid, expired, or has already been completed.';
  END IF;

  -- Serialize all active requests for the same job so concurrent bearer links
  -- cannot both pass the aggregate-size check against the same old total.
  PERFORM 1
  FROM public.jobs
  WHERE id = v_job_id
    AND tenant_id = v_tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The upload job is unavailable.';
  END IF;

  -- The client stores a public-URL-shaped value, but only the object path is
  -- trusted. Require the exact request-token namespace and a real object in
  -- this bucket; arbitrary URLs or another request's object are rejected.
  v_file_path := split_part(trim(p_file_url), '/storage/v1/object/public/job-attachments/', 2);
  IF v_file_path = trim(p_file_url) THEN
    v_file_path := split_part(trim(p_file_url), '/storage/v1/object/sign/job-attachments/', 2);
  END IF;
  IF v_file_path IS NULL
     OR v_file_path NOT LIKE ('requests/' || p_token || '/%')
     OR v_file_path LIKE '%?%'
     OR v_file_path LIKE '%#%'
     OR trim(p_file_url) !~* '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/job-attachments/' THEN
    RAISE EXCEPTION 'Upload object path does not belong to this request';
  END IF;

  SELECT COALESCE((o.metadata ->> 'size')::bigint, 0)
    INTO v_actual_size
  FROM storage.objects AS o
  WHERE o.bucket_id = 'job-attachments'
    AND o.name = v_file_path;

  IF v_actual_size IS NULL OR v_actual_size <= 0 THEN
    RAISE EXCEPTION 'Uploaded object was not found';
  END IF;
  IF v_actual_size <> p_file_size_bytes THEN
    RAISE EXCEPTION 'Uploaded object size does not match its metadata';
  END IF;

  SELECT COALESCE(SUM(file_size_bytes), 0)
    INTO v_existing_total
  FROM public.job_attachments
  WHERE job_id = v_job_id;
  IF v_existing_total + v_actual_size > 100 * 1024 * 1024 THEN
    RAISE EXCEPTION 'This job has reached its 100MB total attachment limit';
  END IF;

  INSERT INTO public.job_attachments (
    job_id,
    tenant_id,
    type,
    file_name,
    file_url,
    file_size_bytes,
    uploaded_by
  )
  VALUES (
    v_job_id,
    v_tenant_id,
    'document',
    trim(p_file_name),
    trim(p_file_url),
    v_actual_size,
    'External Contributor (via Link)'
  );

  INSERT INTO public.audit_logs (
    user_id,
    user_email,
    action,
    target_type,
    target_id,
    details,
    tenant_id
  )
  VALUES (
    NULL,
    'External Contributor (via Link)',
    'EXTERNAL_UPLOAD',
    'jobs',
    v_job_id,
    jsonb_build_object('file_name', trim(p_file_name), 'file_size_bytes', v_actual_size),
    v_tenant_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_job_document_request(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.job_document_requests
  SET completed_at = now()
  WHERE token = p_token
    AND completed_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This upload link is invalid, expired, or has already been completed.';
  END IF;
END;
$$;

-- Corrective path: if the object namespace or limits change, replace these
-- SECURITY DEFINER functions in a forward migration. Do not remove the
-- request-token and tenant derivation or re-enable direct anonymous inserts.
