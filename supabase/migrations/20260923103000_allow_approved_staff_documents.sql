-- Allow third parties to add new certificates to staff that they own after
-- approval. Existing documents remain immutable and owner-scoped.

DROP POLICY IF EXISTS third_party_staff_documents_insert ON public.third_party_staff_documents;
CREATE POLICY third_party_staff_documents_insert ON public.third_party_staff_documents
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id = private.current_tenant_id()
    AND uploaded_by = auth.uid()
    AND (
      (staff_id IS NULL AND private.third_party_owns_submission(auth.uid(), submission_id))
      OR (
        staff_id IS NOT NULL
        AND private.third_party_owns_staff(auth.uid(), staff_id)
        AND EXISTS (
          SELECT 1 FROM public.third_party_staff_submissions s
          WHERE s.id = submission_id
            AND s.approved_staff_id = staff_id
            AND s.submitted_by = auth.uid()
            AND s.tenant_id = private.current_tenant_id()
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION private.sync_third_party_staff_document()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.staff_id IS NOT NULL THEN
    UPDATE public.staff s
      SET tickets = COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', d.id, 'type', d.ticket_type, 'ticketNumber', d.ticket_number,
          'expiryDate', d.expiry_date, 'verified', false, 'documentUrl', d.file_path
        ) ORDER BY d.created_at)
        FROM public.third_party_staff_documents d WHERE d.staff_id = NEW.staff_id
      ), '[]'::jsonb),
      uploaded_certificates = COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', d.id, 'name', d.file_name, 'size', d.file_size_bytes,
          'uploadedAt', d.created_at, 'documentUrl', d.file_path
        ) ORDER BY d.created_at)
        FROM public.third_party_staff_documents d WHERE d.staff_id = NEW.staff_id
      ), '[]'::jsonb)
      WHERE s.id = NEW.staff_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sync_third_party_staff_document_trg ON public.third_party_staff_documents;
CREATE TRIGGER sync_third_party_staff_document_trg
  AFTER INSERT ON public.third_party_staff_documents
  FOR EACH ROW EXECUTE FUNCTION private.sync_third_party_staff_document();
