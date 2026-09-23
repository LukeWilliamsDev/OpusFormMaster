-- Complete the note conversation loop. Both sides can reply to a note they
-- can see, and third parties see the internal responder's first name.

ALTER TABLE public.third_party_job_note_replies
  ADD COLUMN IF NOT EXISTS author_first_name text;

DROP POLICY IF EXISTS third_party_note_replies_insert ON public.third_party_job_note_replies;
CREATE POLICY third_party_note_replies_insert ON public.third_party_job_note_replies
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id = private.current_tenant_id()
    AND author_id = auth.uid()
    AND (
      (
        private.can_write_ops(auth.uid())
        AND EXISTS (
          SELECT 1 FROM public.third_party_job_notes n
          WHERE n.id = note_id AND n.tenant_id = private.current_tenant_id()
        )
      )
      OR (
        private.is_third_party(auth.uid())
        AND EXISTS (
          SELECT 1 FROM public.third_party_job_notes n
          WHERE n.id = note_id
            AND n.author_id = auth.uid()
            AND private.third_party_can_access_job(auth.uid(), n.job_id)
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION private.populate_third_party_note_reply_author()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  SELECT split_part(COALESCE(NULLIF(trim(full_name), ''), email), ' ', 1)
    INTO NEW.author_first_name
  FROM public.profiles
  WHERE id = NEW.author_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS populate_third_party_note_reply_author_trg ON public.third_party_job_note_replies;
CREATE TRIGGER populate_third_party_note_reply_author_trg
  BEFORE INSERT ON public.third_party_job_note_replies
  FOR EACH ROW EXECUTE FUNCTION private.populate_third_party_note_reply_author();

UPDATE public.third_party_job_note_replies r
SET author_first_name = split_part(COALESCE(NULLIF(trim(p.full_name), ''), p.email), ' ', 1)
FROM public.profiles p
WHERE p.id = r.author_id AND r.author_first_name IS NULL;
