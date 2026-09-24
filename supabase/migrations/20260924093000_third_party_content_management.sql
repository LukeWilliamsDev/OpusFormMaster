-- Third parties can view site photos, but cannot add to the shared site-photo
-- record. They may remove or rename their own uploaded attachments and delete
-- their own notes while nobody has replied to them.

DROP POLICY IF EXISTS job_attachments_insert_ops ON public.job_attachments;
CREATE POLICY job_attachments_insert_ops ON public.job_attachments
  FOR INSERT TO authenticated WITH CHECK (private.can_write_ops(auth.uid()));

DROP POLICY IF EXISTS "Allow authenticated upload job-attachments" ON storage.objects;
CREATE POLICY "Allow authenticated upload job-attachments" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'job-attachments' AND NOT private.is_third_party(auth.uid())
  );

DROP POLICY IF EXISTS third_party_notes_delete ON public.third_party_job_notes;
CREATE POLICY third_party_notes_delete ON public.third_party_job_notes
  FOR DELETE TO authenticated USING (
    tenant_id = private.current_tenant_id()
    AND author_id = auth.uid()
    AND private.is_third_party(auth.uid())
    AND private.third_party_can_access_job(auth.uid(), job_id)
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
    AND private.is_third_party(auth.uid())
    AND private.third_party_can_access_job(auth.uid(), job_id)
  );

CREATE OR REPLACE FUNCTION public.rename_third_party_attachment(
  p_attachment_id uuid,
  p_file_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT private.is_third_party(auth.uid())
     OR trim(COALESCE(p_file_name, '')) = ''
     OR length(trim(p_file_name)) > 255
     OR p_file_name ~ '[\\/]'
  THEN
    RAISE EXCEPTION 'Attachment rename is not permitted';
  END IF;

  UPDATE public.third_party_attachments
  SET file_name = trim(p_file_name)
  WHERE id = p_attachment_id
    AND tenant_id = private.current_tenant_id()
    AND uploaded_by = auth.uid()
    AND private.third_party_can_access_job(auth.uid(), job_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attachment not found or cannot be renamed';
  END IF;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rename_third_party_attachment(uuid, text) TO authenticated;

DROP POLICY IF EXISTS third_party_attachments_storage_delete ON storage.objects;
CREATE POLICY third_party_attachments_storage_delete ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'third-party-attachments'
    AND name LIKE (auth.uid()::text || '/%')
  );
