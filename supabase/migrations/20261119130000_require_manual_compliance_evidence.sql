-- Manual staff compliance entries must carry evidence and store it in the
-- tenant-scoped private compliance bucket.

DROP FUNCTION IF EXISTS public.add_manual_staff_compliance(text, text, date, text);

CREATE OR REPLACE FUNCTION public.add_manual_staff_compliance(
  p_staff_id text,
  p_certificate_type text,
  p_expiry_date date,
  p_ticket_number text DEFAULT NULL,
  p_document_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
SET row_security = off
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_tenant_id uuid;
  v_staff public.staff%ROWTYPE;
  v_ticket jsonb;
  v_certificate_type text := NULLIF(trim(p_certificate_type), '');
  v_ticket_number text := NULLIF(trim(p_ticket_number), '');
  v_document_url text := NULLIF(trim(p_document_url), '');
  v_actor_email text;
BEGIN
  IF v_actor_id IS NULL OR NOT private.can_use_certificate_checker(v_actor_id) THEN
    RAISE EXCEPTION 'Not authorised to add staff compliance';
  END IF;
  IF p_staff_id IS NULL OR NULLIF(trim(p_staff_id), '') IS NULL THEN
    RAISE EXCEPTION 'Staff record is required';
  END IF;
  IF v_certificate_type IS NULL OR length(v_certificate_type) > 200 THEN
    RAISE EXCEPTION 'Compliance type is required and must be 200 characters or fewer';
  END IF;
  IF p_expiry_date IS NULL THEN
    RAISE EXCEPTION 'Expiry date is required';
  END IF;
  IF v_ticket_number IS NOT NULL AND length(v_ticket_number) > 200 THEN
    RAISE EXCEPTION 'Reference number must be 200 characters or fewer';
  END IF;
  IF v_document_url IS NULL OR length(v_document_url) > 500
     OR v_document_url NOT LIKE 'manual/' || trim(p_staff_id) || '/%'
     OR v_document_url !~ '\.(pdf|jpg|jpeg|png)$'
     OR position('/' IN substring(v_document_url FROM length('manual/' || trim(p_staff_id) || '/') + 1)) > 0 THEN
    RAISE EXCEPTION 'Compliance evidence file is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM storage.objects o
    WHERE o.bucket_id = 'compliance-documents'
      AND o.name = v_document_url
      AND lower(COALESCE(o.metadata->>'mimetype', '')) IN ('application/pdf', 'image/jpeg', 'image/png')
      AND COALESCE((o.metadata->>'size')::bigint, 0) <= 10485760
  ) THEN
    RAISE EXCEPTION 'Compliance evidence file is missing or invalid';
  END IF;

  SELECT * INTO v_staff
  FROM public.staff
  WHERE id = trim(p_staff_id)
    AND tenant_id = private.current_tenant_id()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Staff record not found'; END IF;

  v_tenant_id := v_staff.tenant_id;
  v_ticket := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'type', v_certificate_type,
    'expiryDate', p_expiry_date::text,
    'ticketNumber', v_ticket_number,
    'documentUrl', v_document_url,
    'verified', true,
    'manual', true,
    'createdAt', now()
  );

  UPDATE public.staff
  SET tickets = COALESCE(tickets, '[]'::jsonb) || jsonb_build_array(v_ticket)
  WHERE id = v_staff.id AND tenant_id = v_tenant_id;

  SELECT email INTO v_actor_email FROM public.profiles WHERE id = v_actor_id;
  INSERT INTO public.audit_logs (user_id, user_email, action, target_type, target_id, details, tenant_id)
  VALUES (v_actor_id, v_actor_email, 'MANUAL_COMPLIANCE_ADDED', 'staff', v_staff.id,
    jsonb_build_object('ticket_id', v_ticket->>'id', 'certificate_type', v_certificate_type,
      'expiry_date', p_expiry_date, 'ticket_number', v_ticket_number, 'document_url', v_document_url,
      'manual', true, 'ticket', v_ticket), v_tenant_id);

  RETURN v_ticket;
END;
$$;

REVOKE ALL ON FUNCTION public.add_manual_staff_compliance(text, text, date, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_manual_staff_compliance(text, text, date, text, text)
  TO authenticated;

DROP POLICY IF EXISTS compliance_documents_ops_insert ON storage.objects;
CREATE POLICY compliance_documents_ops_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'compliance-documents'
  AND private.can_write_ops(auth.uid())
  AND (storage.foldername(storage.objects.name))[1] = 'requests'
  AND EXISTS (
    SELECT 1 FROM public.document_requests r
    JOIN public.staff s ON s.id = r.worker_id
    WHERE r.id::text = (storage.foldername(storage.objects.name))[2]
      AND s.tenant_id = private.current_tenant_id()
  )
);

DROP POLICY IF EXISTS compliance_documents_manual_insert ON storage.objects;
CREATE POLICY compliance_documents_manual_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'compliance-documents'
  AND private.can_use_certificate_checker(auth.uid())
  AND (storage.foldername(storage.objects.name))[1] = 'manual'
  AND lower(COALESCE(storage.objects.metadata->>'mimetype', '')) IN ('application/pdf', 'image/jpeg', 'image/png')
  AND (storage.objects.metadata->>'size') ~ '^[0-9]+$'
  AND (storage.objects.metadata->>'size')::bigint <= 10485760
  AND EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = (storage.foldername(storage.objects.name))[2]
      AND s.tenant_id = private.current_tenant_id()
  )
);

DROP POLICY IF EXISTS compliance_documents_manual_read ON storage.objects;
CREATE POLICY compliance_documents_manual_read ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'compliance-documents'
  AND private.can_use_certificate_checker(auth.uid())
  AND (storage.foldername(storage.objects.name))[1] = 'manual'
  AND EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = (storage.foldername(storage.objects.name))[2]
      AND s.tenant_id = private.current_tenant_id()
  )
);

DROP POLICY IF EXISTS compliance_documents_manual_delete ON storage.objects;
CREATE POLICY compliance_documents_manual_delete ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'compliance-documents'
  AND private.can_use_certificate_checker(auth.uid())
  AND (storage.foldername(storage.objects.name))[1] = 'manual'
  AND EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = (storage.foldername(storage.objects.name))[2]
      AND s.tenant_id = private.current_tenant_id()
  )
);
