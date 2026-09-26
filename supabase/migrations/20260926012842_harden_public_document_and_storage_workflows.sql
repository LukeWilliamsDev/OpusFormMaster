-- Close the remaining bearer-link and storage-policy gaps in the document
-- workflows. These functions return only the fields the public forms need;
-- storage access is tied back to the owning tenant and content row.

CREATE OR REPLACE FUNCTION public.get_document_request_details(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'requested_certs', dr.requested_certs,
    'expires_at', dr.expires_at,
    'worker_name', COALESCE(s.name, 'Staff Member')
  )
  INTO v_result
  FROM public.document_requests dr
  LEFT JOIN public.staff s ON s.id = dr.worker_id
  WHERE dr.id = p_request_id
    AND dr.completed_at IS NULL
    AND dr.expires_at > now();

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_job_document_request_details(p_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT jsonb_build_object(
    'job', jsonb_build_object(
      'job_ref', j.job_ref,
      'site_name', j.site_name
    ),
    'existing_total_bytes', COALESCE(
      (SELECT SUM(file_size_bytes)
       FROM public.job_attachments
       WHERE job_id = r.job_id),
      0
    )
  )
  FROM public.job_document_requests r
  JOIN public.jobs j ON j.id = r.job_id
  WHERE r.token = p_token
    AND r.completed_at IS NULL
    AND r.expires_at > now();
$$;

CREATE OR REPLACE FUNCTION public.submit_worker_documents(
  p_request_id uuid,
  p_new_tickets jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_worker_id text;
  v_worker_email text;
  v_completed_at timestamptz;
  v_expires_at timestamptz;
  v_tenant_id uuid;
  v_requested_certs text[];
  v_current_tickets jsonb;
  v_ticket jsonb;
  v_updated_tickets jsonb;
  v_new_type text;
  v_document_url text;
  v_expiry_date date;
  v_found boolean;
BEGIN
  IF jsonb_typeof(p_new_tickets) <> 'array'
     OR jsonb_array_length(p_new_tickets) = 0
     OR jsonb_array_length(p_new_tickets) > 25 THEN
    RAISE EXCEPTION 'The submission must contain between 1 and 25 certificates';
  END IF;

  SELECT dr.worker_id, dr.completed_at, dr.expires_at, dr.tenant_id,
         dr.requested_certs
    INTO v_worker_id, v_completed_at, v_expires_at, v_tenant_id,
         v_requested_certs
  FROM public.document_requests dr
  WHERE dr.id = p_request_id
  FOR UPDATE;

  IF v_worker_id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF v_completed_at IS NOT NULL OR v_expires_at <= now() THEN
    RAISE EXCEPTION 'Link has expired or already been used';
  END IF;

  IF (
    SELECT count(DISTINCT NULLIF(trim(item->>'type'), ''))
    FROM jsonb_array_elements(p_new_tickets) AS items(item)
  ) <> jsonb_array_length(p_new_tickets) THEN
    RAISE EXCEPTION 'Each certificate type may only be submitted once';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_new_tickets) AS items(item)
    WHERE jsonb_typeof(item) <> 'object'
       OR NULLIF(trim(item->>'type'), '') IS NULL
       OR NOT (trim(item->>'type') = ANY(v_requested_certs))
       OR NULLIF(trim(item->>'documentUrl'), '') IS NULL
       OR length(trim(item->>'documentUrl')) > 2048
       OR position(
         ('/compliance-documents/requests/' || p_request_id::text || '/')
         IN trim(item->>'documentUrl')
       ) = 0
       OR NULLIF(trim(item->>'expiryDate'), '') IS NULL
       OR trim(item->>'expiryDate') !~ '^\d{4}-\d{2}-\d{2}$'
  ) THEN
    RAISE EXCEPTION 'Certificate details or document path are invalid';
  END IF;

  SELECT s.tickets, s.email
    INTO v_current_tickets, v_worker_email
  FROM public.staff s
  WHERE s.id = v_worker_id
    AND s.tenant_id = v_tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff record not found';
  END IF;
  v_current_tickets := COALESCE(v_current_tickets, '[]'::jsonb);
  v_updated_tickets := '[]'::jsonb;

  FOR v_ticket IN SELECT jsonb_array_elements(v_current_tickets) LOOP
    v_found := false;
    FOR v_new_type IN
      SELECT trim(item->>'type')
      FROM jsonb_array_elements(p_new_tickets) AS items(item)
    LOOP
      IF v_ticket->>'type' = v_new_type THEN
        v_found := true;
        EXIT;
      END IF;
    END LOOP;
    IF NOT v_found THEN
      v_updated_tickets := v_updated_tickets || jsonb_build_array(v_ticket);
    END IF;
  END LOOP;

  FOR v_ticket IN SELECT jsonb_array_elements(p_new_tickets) LOOP
    v_document_url := trim(v_ticket->>'documentUrl');
    BEGIN
      v_expiry_date := (v_ticket->>'expiryDate')::date;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Certificate expiry date is invalid';
    END;
    IF v_expiry_date IS NULL THEN
      RAISE EXCEPTION 'Certificate expiry date is required';
    END IF;

    v_updated_tickets := v_updated_tickets || jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid()::text,
        'type', trim(v_ticket->>'type'),
        'expiryDate', v_expiry_date,
        'ticketNumber', NULLIF(trim(v_ticket->>'ticketNumber'), ''),
        'documentUrl', v_document_url,
        'verified', false
      )
    );
  END LOOP;

  UPDATE public.staff
  SET tickets = v_updated_tickets
  WHERE id = v_worker_id AND tenant_id = v_tenant_id;

  UPDATE public.document_requests
  SET completed_at = now()
  WHERE id = p_request_id AND completed_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Link has already been used';
  END IF;

  INSERT INTO public.audit_logs (
    user_id, user_email, action, target_type, target_id, details, tenant_id
  )
  VALUES (
    NULL,
    COALESCE(v_worker_email, 'anonymous@opusform.co.uk'),
    'SUBMIT_DOCUMENTS',
    'staff',
    v_worker_id,
    jsonb_build_object(
      'request_id', p_request_id,
      'ticket_types', (
        SELECT jsonb_agg(trim(item->>'type'))
        FROM jsonb_array_elements(p_new_tickets) AS items(item)
      )
    ),
    v_tenant_id
  );
END;
$$;

-- A third-party user may not delete site content after completion, and a note
-- with a response must remain part of the conversation history.
DROP POLICY IF EXISTS third_party_notes_delete ON public.third_party_job_notes;
CREATE POLICY third_party_notes_delete ON public.third_party_job_notes
  FOR DELETE TO authenticated USING (
    tenant_id = private.current_tenant_id()
    AND author_id = auth.uid()
    AND private.third_party_can_write_job(auth.uid(), job_id)
    AND NOT EXISTS (
      SELECT 1
      FROM public.third_party_job_note_replies reply_row
      WHERE reply_row.note_id = public.third_party_job_notes.id
    )
  );

DROP POLICY IF EXISTS third_party_attachments_delete ON public.third_party_attachments;
CREATE POLICY third_party_attachments_delete ON public.third_party_attachments
  FOR DELETE TO authenticated USING (
    tenant_id = private.current_tenant_id()
    AND uploaded_by = auth.uid()
    AND private.third_party_can_write_job(auth.uid(), job_id)
  );

DROP POLICY IF EXISTS third_party_attachments_storage_delete ON storage.objects;
CREATE POLICY third_party_attachments_storage_delete ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'third-party-attachments'
    AND name LIKE (auth.uid()::text || '/%')
    AND private.third_party_can_write_job(auth.uid(), (storage.foldername(name))[2])
    AND EXISTS (
      SELECT 1
      FROM public.third_party_attachments attachment_row
      WHERE attachment_row.file_path = storage.objects.name
        AND attachment_row.tenant_id = private.current_tenant_id()
        AND attachment_row.uploaded_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS third_party_attachments_storage_select ON storage.objects;
CREATE POLICY third_party_attachments_storage_select ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'third-party-attachments'
    AND (
      name LIKE (auth.uid()::text || '/%')
      OR (
        private.can_write_ops(auth.uid())
        AND EXISTS (
          SELECT 1
          FROM public.third_party_attachments attachment_row
          WHERE attachment_row.file_path = storage.objects.name
            AND attachment_row.tenant_id = private.current_tenant_id()
        )
      )
    )
  );

DROP POLICY IF EXISTS third_party_staff_documents_storage_select ON storage.objects;
CREATE POLICY third_party_staff_documents_storage_select ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'third-party-staff-documents'
    AND (
      name LIKE (auth.uid()::text || '/%')
      OR (
        private.can_write_ops(auth.uid())
        AND EXISTS (
          SELECT 1
          FROM public.third_party_staff_documents document_row
          WHERE document_row.file_path = storage.objects.name
            AND document_row.tenant_id = private.current_tenant_id()
        )
      )
    )
  );
