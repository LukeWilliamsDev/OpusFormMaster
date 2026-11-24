-- Staff profile certificate integrity boundary.
--
-- Certificate JSON is a compatibility projection, not a profile-edit field.
-- Authenticated clients may update profile columns only; certificate changes go
-- through explicit RPCs or trusted server-side workflows. This prevents an
-- older profile editor snapshot from replacing a newer upload.

REVOKE UPDATE ON public.staff FROM authenticated;
GRANT UPDATE (name, role, phone, email, postcode, is_archived)
  ON public.staff TO authenticated;

-- A removal recovery record is server-created and short-lived. Restore uses
-- this row rather than trusting a client-supplied certificate snapshot.
CREATE TABLE IF NOT EXISTS public.staff_certificate_removal_recovery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id text NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  ticket_id text NOT NULL,
  ticket jsonb NOT NULL,
  removed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz
);

ALTER TABLE public.staff_certificate_removal_recovery ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_certificate_removal_recovery FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mutate_staff_certificate_ticket(
  p_staff_id text,
  p_ticket_id text,
  p_action text,
  p_recovery_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
SET row_security = off
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_staff public.staff%ROWTYPE;
  v_tickets jsonb := '[]'::jsonb;
  v_updated_tickets jsonb := '[]'::jsonb;
  v_ticket jsonb;
  v_removed_ticket jsonb := NULL;
  v_recovery_id uuid := NULL;
BEGIN
  IF v_actor_id IS NULL OR NOT private.can_write_ops(v_actor_id) THEN
    RAISE EXCEPTION 'Not authorised to change staff certificate records';
  END IF;
  IF NULLIF(trim(p_staff_id), '') IS NULL OR NULLIF(trim(p_ticket_id), '') IS NULL THEN
    RAISE EXCEPTION 'Staff and certificate identifiers are required';
  END IF;
  IF p_action NOT IN ('approve', 'remove', 'restore') THEN
    RAISE EXCEPTION 'Unsupported certificate action';
  END IF;

  SELECT *
    INTO v_staff
  FROM public.staff
  WHERE id = trim(p_staff_id)
    AND tenant_id = private.current_tenant_id()
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff record not found';
  END IF;

  v_tickets := CASE
    WHEN jsonb_typeof(v_staff.tickets) = 'array' THEN v_staff.tickets
    ELSE '[]'::jsonb
  END;

  IF p_action = 'approve' THEN
    SELECT COALESCE(jsonb_agg(
      CASE
        WHEN value->>'id' = trim(p_ticket_id)
          THEN jsonb_set(value, '{verified}', 'true'::jsonb, true)
        ELSE value
      END
      ORDER BY ord
    ), '[]'::jsonb)
    INTO v_updated_tickets
    FROM jsonb_array_elements(v_tickets) WITH ORDINALITY AS items(value, ord);
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_tickets) AS items(value)
      WHERE value->>'id' = trim(p_ticket_id)
    ) THEN
      RAISE EXCEPTION 'Certificate record not found';
    END IF;
  ELSIF p_action = 'remove' THEN
    SELECT value
      INTO v_removed_ticket
    FROM jsonb_array_elements(v_tickets) AS items(value)
    WHERE value->>'id' = trim(p_ticket_id);
    IF v_removed_ticket IS NULL THEN
      RAISE EXCEPTION 'Certificate record not found';
    END IF;
    INSERT INTO public.staff_certificate_removal_recovery (
      tenant_id, staff_id, ticket_id, ticket, removed_by
    )
    VALUES (
      v_staff.tenant_id, v_staff.id, trim(p_ticket_id), v_removed_ticket, v_actor_id
    )
    RETURNING id INTO v_recovery_id;
    SELECT COALESCE(jsonb_agg(value ORDER BY ord), '[]'::jsonb)
      INTO v_updated_tickets
    FROM jsonb_array_elements(v_tickets) WITH ORDINALITY AS items(value, ord)
    WHERE value->>'id' <> trim(p_ticket_id);
  ELSE
    IF p_recovery_id IS NULL THEN
      RAISE EXCEPTION 'A server-created recovery record is required to restore a record';
    END IF;
    SELECT recovery.ticket
      INTO v_ticket
    FROM public.staff_certificate_removal_recovery recovery
    WHERE recovery.id = p_recovery_id
      AND recovery.tenant_id = v_staff.tenant_id
      AND recovery.staff_id = v_staff.id
      AND recovery.ticket_id = trim(p_ticket_id)
      AND recovery.removed_by = v_actor_id
      AND recovery.consumed_at IS NULL
      AND recovery.created_at > now() - interval '15 minutes'
    FOR UPDATE;
    IF v_ticket IS NULL THEN
      RAISE EXCEPTION 'The certificate recovery record is invalid or expired';
    END IF;
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_tickets) AS items(value)
      WHERE value->>'id' = trim(p_ticket_id)
    ) THEN
      v_updated_tickets := v_tickets;
    ELSE
      v_updated_tickets := v_tickets || jsonb_build_array(v_ticket);
    END IF;
    UPDATE public.staff_certificate_removal_recovery
    SET consumed_at = now()
    WHERE id = p_recovery_id;
  END IF;

  UPDATE public.staff
  SET tickets = v_updated_tickets
  WHERE id = v_staff.id AND tenant_id = v_staff.tenant_id;

  RETURN jsonb_build_object(
    'tickets', v_updated_tickets,
    'removed_ticket', v_removed_ticket,
    'recovery_id', v_recovery_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mutate_staff_certificate_ticket(text, text, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mutate_staff_certificate_ticket(text, text, text, uuid)
  TO authenticated;

-- Internal profile uploads append a new record and never replace an existing
-- ticket. The Storage object must already exist and be private/tenant-scoped.
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
  v_staff public.staff%ROWTYPE;
  v_ticket jsonb;
  v_type text := NULLIF(trim(p_certificate_type), '');
  v_number text := NULLIF(trim(p_ticket_number), '');
  v_document_url text := NULLIF(trim(p_document_url), '');
  v_actor_email text;
BEGIN
  IF v_actor_id IS NULL OR NOT private.can_use_certificate_checker(v_actor_id) THEN
    RAISE EXCEPTION 'Not authorised to add staff compliance';
  END IF;
  IF v_type IS NULL OR length(v_type) > 200 THEN
    RAISE EXCEPTION 'Certificate type is required and must be 200 characters or fewer';
  END IF;
  IF p_expiry_date IS NULL THEN
    RAISE EXCEPTION 'Certificate expiry date is required';
  END IF;
  IF v_number IS NOT NULL AND length(v_number) > 200 THEN
    RAISE EXCEPTION 'Certificate number must be 200 characters or fewer';
  END IF;
  IF v_document_url IS NULL
     OR v_document_url NOT LIKE 'manual/' || trim(p_staff_id) || '/%'
     OR substring(v_document_url FROM length('manual/' || trim(p_staff_id) || '/') + 1) !~ '^[A-Za-z0-9-]+\\.(pdf|jpg|jpeg|png)$' THEN
    RAISE EXCEPTION 'A valid certificate evidence file is required';
  END IF;

  SELECT *
    INTO v_staff
  FROM public.staff
  WHERE id = trim(p_staff_id)
    AND tenant_id = private.current_tenant_id()
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff record not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM storage.objects o
    WHERE o.bucket_id = 'compliance-documents'
      AND o.name = v_document_url
      AND lower(COALESCE(o.metadata->>'mimetype', '')) IN ('application/pdf', 'image/jpeg', 'image/png')
      AND COALESCE(o.metadata->>'size', '') ~ '^[0-9]+$'
      AND (o.metadata->>'size')::bigint BETWEEN 1 AND 10485760
  ) THEN
    RAISE EXCEPTION 'Certificate evidence is missing or invalid';
  END IF;

  v_ticket := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'type', v_type,
    'expiryDate', p_expiry_date::text,
    'ticketNumber', v_number,
    'documentUrl', v_document_url,
    'verified', true,
    'manual', true,
    'createdAt', now()
  );

  UPDATE public.staff
  SET tickets = CASE
    WHEN jsonb_typeof(tickets) = 'array' THEN tickets || jsonb_build_array(v_ticket)
    ELSE jsonb_build_array(v_ticket)
  END
  WHERE id = v_staff.id AND tenant_id = v_staff.tenant_id;

  SELECT email INTO v_actor_email FROM public.profiles WHERE id = v_actor_id;
  INSERT INTO public.audit_logs (
    user_id, user_email, action, target_type, target_id, details, tenant_id
  ) VALUES (
    v_actor_id,
    v_actor_email,
    'MANUAL_COMPLIANCE_ADDED',
    'staff',
    v_staff.id,
    jsonb_build_object(
      'ticket_id', v_ticket->>'id',
      'certificate_type', v_type,
      'expiry_date', p_expiry_date,
      'ticket_number', v_number,
      'document_url', v_document_url,
      'manual', true
    ),
    v_staff.tenant_id
  );

  RETURN v_ticket;
END;
$$;

REVOKE ALL ON FUNCTION public.add_manual_staff_compliance(text, text, date, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_manual_staff_compliance(text, text, date, text, text)
  TO authenticated;

-- The policy is intentionally path/tenant/role scoped. MIME and byte limits
-- are enforced by the bucket and rechecked by add_manual_staff_compliance.
DROP POLICY IF EXISTS compliance_documents_manual_insert ON storage.objects;
CREATE POLICY compliance_documents_manual_insert ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'compliance-documents'
    AND private.can_use_certificate_checker(auth.uid())
    AND (storage.foldername(storage.objects.name))[1] = 'manual'
    AND EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = (storage.foldername(storage.objects.name))[2]
        AND s.tenant_id = private.current_tenant_id()
    )
  );

DROP POLICY IF EXISTS compliance_documents_manual_read ON storage.objects;
CREATE POLICY compliance_documents_manual_read ON storage.objects
  FOR SELECT TO authenticated USING (
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
CREATE POLICY compliance_documents_manual_delete ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'compliance-documents'
    AND private.can_use_certificate_checker(auth.uid())
    AND (storage.foldername(storage.objects.name))[1] = 'manual'
    AND EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = (storage.foldername(storage.objects.name))[2]
        AND s.tenant_id = private.current_tenant_id()
    )
  );

-- The legacy projection refresh must merge only the third-party-owned records.
-- It must not erase public-link or manually recorded certificates.
CREATE OR REPLACE FUNCTION private.refresh_third_party_staff_documents(_staff_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
SET row_security = off
AS $$
DECLARE
  v_existing_tickets jsonb;
  v_existing_files jsonb;
  v_third_party_tickets jsonb;
  v_third_party_files jsonb;
  v_tenant_id uuid;
BEGIN
  SELECT
    s.tenant_id,
    CASE WHEN jsonb_typeof(s.tickets) = 'array' THEN s.tickets ELSE '[]'::jsonb END,
    CASE WHEN jsonb_typeof(s.uploaded_certificates) = 'array' THEN s.uploaded_certificates ELSE '[]'::jsonb END
  INTO v_tenant_id, v_existing_tickets, v_existing_files
  FROM public.staff s
  WHERE s.id = _staff_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', d.id,
      'type', d.ticket_type,
      'ticketNumber', d.ticket_number,
      'expiryDate', d.expiry_date,
      'verified', false,
      'documentUrl', d.file_path,
      'createdAt', d.created_at
    ) ORDER BY d.created_at), '[]'::jsonb)
    INTO v_third_party_tickets
  FROM public.third_party_staff_documents d
  WHERE d.staff_id = _staff_id AND d.tenant_id = v_tenant_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', d.id,
      'name', d.file_name,
      'size', d.file_size_bytes,
      'uploadedAt', d.created_at,
      'documentUrl', d.file_path
    ) ORDER BY d.created_at), '[]'::jsonb)
    INTO v_third_party_files
  FROM public.third_party_staff_documents d
  WHERE d.staff_id = _staff_id AND d.tenant_id = v_tenant_id;

  UPDATE public.staff s
  SET tickets = (
    SELECT COALESCE(jsonb_agg(item ORDER BY ord), '[]'::jsonb)
    FROM jsonb_array_elements(v_existing_tickets) WITH ORDINALITY AS items(item, ord)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.third_party_staff_documents d
      WHERE d.staff_id = _staff_id AND d.tenant_id = v_tenant_id AND d.id::text = item->>'id'
    )
  ) || v_third_party_tickets,
  uploaded_certificates = (
    SELECT COALESCE(jsonb_agg(item ORDER BY ord), '[]'::jsonb)
    FROM jsonb_array_elements(v_existing_files) WITH ORDINALITY AS items(item, ord)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.third_party_staff_documents d
      WHERE d.staff_id = _staff_id AND d.tenant_id = v_tenant_id AND d.id::text = item->>'id'
    )
  ) || v_third_party_files
  WHERE s.id = _staff_id AND s.tenant_id = v_tenant_id;
END;
$$;

UPDATE storage.buckets
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png']
WHERE id IN ('compliance-documents', 'third-party-staff-documents', 'certificate-check-evidence');

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM storage.buckets
    WHERE id IN (
      'compliance-documents',
      'third-party-staff-documents',
      'certificate-check-evidence'
    )
  ) <> 3 THEN
    RAISE EXCEPTION 'Expected all staff certificate Storage buckets before integrity hardening';
  END IF;
END;
$$;
