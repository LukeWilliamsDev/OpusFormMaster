-- Keep third-party content tenant-bound and prevent third-party writes to
-- completed site records, including direct table and storage requests.

CREATE OR REPLACE FUNCTION private.assert_third_party_job_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_job_tenant uuid;
  v_job_status text;
  v_note_tenant uuid;
  v_note_job_id text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF TG_TABLE_NAME = 'third_party_job_note_replies' THEN
    SELECT n.tenant_id, n.job_id
      INTO v_note_tenant, v_note_job_id
    FROM public.third_party_job_notes n
    WHERE n.id = NEW.note_id;

    IF v_note_tenant IS NULL THEN
      RAISE EXCEPTION 'The note does not exist';
    END IF;

    IF NEW.tenant_id IS DISTINCT FROM v_note_tenant THEN
      RAISE EXCEPTION 'The reply and note must belong to the same tenant';
    END IF;

    SELECT j.tenant_id, j.status
      INTO v_job_tenant, v_job_status
    FROM public.jobs j
    WHERE j.id = v_note_job_id;
  ELSE
    SELECT j.tenant_id, j.status
      INTO v_job_tenant, v_job_status
    FROM public.jobs j
    WHERE j.id = NEW.job_id;
  END IF;

  IF v_job_tenant IS NULL OR NEW.tenant_id IS DISTINCT FROM v_job_tenant THEN
    RAISE EXCEPTION 'The content and site must belong to the same tenant';
  END IF;

  IF private.is_third_party(auth.uid())
     AND lower(COALESCE(v_job_status, '')) IN ('completed', 'complete', 'closed') THEN
    RAISE EXCEPTION 'Completed site records are view-only';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assert_third_party_job_note_reference_trg
  ON public.third_party_job_notes;
CREATE TRIGGER assert_third_party_job_note_reference_trg
  BEFORE INSERT OR UPDATE ON public.third_party_job_notes
  FOR EACH ROW EXECUTE FUNCTION private.assert_third_party_job_reference();

DROP TRIGGER IF EXISTS assert_third_party_attachment_reference_trg
  ON public.third_party_attachments;
CREATE TRIGGER assert_third_party_attachment_reference_trg
  BEFORE INSERT OR UPDATE ON public.third_party_attachments
  FOR EACH ROW EXECUTE FUNCTION private.assert_third_party_job_reference();

DROP TRIGGER IF EXISTS assert_third_party_note_reply_reference_trg
  ON public.third_party_job_note_replies;
CREATE TRIGGER assert_third_party_note_reply_reference_trg
  BEFORE INSERT OR UPDATE ON public.third_party_job_note_replies
  FOR EACH ROW EXECUTE FUNCTION private.assert_third_party_job_reference();

DROP POLICY IF EXISTS third_party_notes_delete ON public.third_party_job_notes;
CREATE POLICY third_party_notes_delete ON public.third_party_job_notes
  FOR DELETE TO authenticated USING (
    tenant_id = private.current_tenant_id()
    AND author_id = auth.uid()
    AND private.third_party_can_write_job(auth.uid(), job_id)
    AND NOT EXISTS (
      SELECT 1
      FROM public.third_party_job_note_replies r
      WHERE r.note_id = id
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
  );
