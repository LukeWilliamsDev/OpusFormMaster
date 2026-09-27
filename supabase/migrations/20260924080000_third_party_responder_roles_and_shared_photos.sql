-- Show the internal responder's first name and role in third-party note
-- conversations, and allow assigned third parties to view all site photos.

ALTER TABLE public.third_party_job_note_replies
  ADD COLUMN IF NOT EXISTS author_role text;

CREATE OR REPLACE FUNCTION private.populate_third_party_note_reply_author()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  SELECT
    split_part(COALESCE(NULLIF(trim(full_name), ''), email), ' ', 1),
    CASE role
      WHEN 'admin' THEN 'admin'
      WHEN 'director' THEN 'director'
      WHEN 'logistics_coordinator' THEN 'logistics_coordinator'
      WHEN 'logistics_assistant' THEN 'logistics_assistant'
      WHEN 'site_foreman' THEN 'site_foreman'
      WHEN 'labourer' THEN 'labourer'
      ELSE role::text
    END
  INTO NEW.author_first_name, NEW.author_role
  FROM public.profiles
  WHERE id = NEW.author_id;
  RETURN NEW;
END;
$$;

UPDATE public.third_party_job_note_replies r
SET author_first_name = split_part(COALESCE(NULLIF(trim(p.full_name), ''), p.email), ' ', 1),
    author_role = p.role::text
FROM public.profiles p
WHERE p.id = r.author_id;

DROP POLICY IF EXISTS job_attachments_select_ops ON public.job_attachments;
CREATE POLICY job_attachments_select_ops ON public.job_attachments
  FOR SELECT TO authenticated USING (
    private.can_write_ops(auth.uid())
    OR (
      private.is_third_party(auth.uid())
      AND type IN ('image_before', 'image_after')
      AND private.third_party_can_access_job(auth.uid(), job_id)
    )
  );

DROP POLICY IF EXISTS "Allow authenticated read job-attachments" ON storage.objects;
CREATE POLICY "Allow authenticated read job-attachments" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'job-attachments'
    AND (
      NOT private.is_third_party(auth.uid())
      OR (
        (storage.foldername(name))[1] = 'third-party-media'
        AND private.third_party_can_access_job(auth.uid(), (storage.foldername(name))[2])
      )
      OR (
        (storage.foldername(name))[1] = 'jobs'
        AND private.third_party_can_access_job(auth.uid(), (storage.foldername(name))[2])
      )
    )
  );
