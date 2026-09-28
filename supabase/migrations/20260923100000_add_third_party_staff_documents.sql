-- Certificates and tickets submitted by a third party. Documents are kept in
-- a private bucket and become linked to the approved staff record atomically.

CREATE TABLE IF NOT EXISTS public.third_party_staff_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES public.third_party_staff_submissions(id) ON DELETE CASCADE,
  staff_id text REFERENCES public.staff(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_type text NOT NULL,
  ticket_number text,
  expiry_date date,
  file_name text NOT NULL,
  file_path text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  file_size_bytes bigint NOT NULL DEFAULT 0 CHECK (file_size_bytes BETWEEN 1 AND 10485760),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS third_party_staff_documents_submission_idx
  ON public.third_party_staff_documents (submission_id, created_at);
CREATE INDEX IF NOT EXISTS third_party_staff_documents_staff_idx
  ON public.third_party_staff_documents (staff_id, created_at);

ALTER TABLE public.third_party_staff_documents ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.third_party_owns_submission(_user_id uuid, _submission_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.third_party_staff_submissions
    WHERE id = _submission_id
      AND submitted_by = _user_id
      AND tenant_id = private.current_tenant_id()
  );
$$;

CREATE POLICY third_party_staff_documents_select ON public.third_party_staff_documents
  FOR SELECT TO authenticated USING (
    tenant_id = private.current_tenant_id()
    AND (
      private.can_write_ops(auth.uid())
      OR uploaded_by = auth.uid()
      OR private.third_party_owns_submission(auth.uid(), submission_id)
      OR (staff_id IS NOT NULL AND private.third_party_owns_staff(auth.uid(), staff_id))
    )
  );
CREATE POLICY third_party_staff_documents_insert ON public.third_party_staff_documents
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id = private.current_tenant_id()
    AND uploaded_by = auth.uid()
    AND private.third_party_owns_submission(auth.uid(), submission_id)
    AND staff_id IS NULL
  );

CREATE OR REPLACE FUNCTION private.link_third_party_staff_documents()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.approved_staff_id IS NOT NULL
     AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.approved_staff_id IS DISTINCT FROM NEW.approved_staff_id) THEN
    UPDATE public.third_party_staff_documents
      SET staff_id = NEW.approved_staff_id
      WHERE submission_id = NEW.id AND staff_id IS NULL;
    UPDATE public.staff s
      SET tickets = COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', d.id, 'type', d.ticket_type, 'ticketNumber', d.ticket_number,
          'expiryDate', d.expiry_date, 'verified', false, 'documentUrl', d.file_path
        ) ORDER BY d.created_at)
        FROM public.third_party_staff_documents d WHERE d.staff_id = NEW.approved_staff_id
      ), '[]'::jsonb),
      uploaded_certificates = COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', d.id, 'name', d.file_name, 'size', d.file_size_bytes,
          'uploadedAt', d.created_at, 'documentUrl', d.file_path
        ) ORDER BY d.created_at)
        FROM public.third_party_staff_documents d WHERE d.staff_id = NEW.approved_staff_id
      ), '[]'::jsonb)
      WHERE s.id = NEW.approved_staff_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS link_third_party_staff_documents_trg ON public.third_party_staff_submissions;
CREATE TRIGGER link_third_party_staff_documents_trg
  AFTER UPDATE OF status, approved_staff_id ON public.third_party_staff_submissions
  FOR EACH ROW EXECUTE FUNCTION private.link_third_party_staff_documents();

CREATE OR REPLACE FUNCTION private.audit_third_party_staff_document()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_email text;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.audit_logs(user_id, user_email, action, target_type, target_id, details, tenant_id)
  SELECT auth.uid(), v_email, 'THIRD_PARTY_STAFF_DOCUMENT_UPLOADED', 'third_party_staff_documents', NEW.id::text,
         jsonb_build_object('submission_id', NEW.submission_id, 'ticket_type', NEW.ticket_type, 'file_name', NEW.file_name), tenant_id
  FROM public.profiles WHERE id = auth.uid();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS audit_third_party_staff_document_trg ON public.third_party_staff_documents;
CREATE TRIGGER audit_third_party_staff_document_trg
  AFTER INSERT ON public.third_party_staff_documents
  FOR EACH ROW EXECUTE FUNCTION private.audit_third_party_staff_document();

INSERT INTO storage.buckets (id, name, public)
VALUES ('third-party-staff-documents', 'third-party-staff-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS third_party_staff_documents_storage_select ON storage.objects;
CREATE POLICY third_party_staff_documents_storage_select ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'third-party-staff-documents' AND (
      private.can_write_ops(auth.uid()) OR name LIKE (auth.uid()::text || '/%')
    )
  );
DROP POLICY IF EXISTS third_party_staff_documents_storage_insert ON storage.objects;
CREATE POLICY third_party_staff_documents_storage_insert ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'third-party-staff-documents'
    AND name LIKE (auth.uid()::text || '/%')
    AND private.third_party_owns_submission(auth.uid(), (storage.foldername(name))[2]::uuid)
  );
