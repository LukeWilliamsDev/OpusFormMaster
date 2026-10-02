-- Allow a site foreman to raise an internal job note that operations staff
-- can answer, without exposing the wider internal job feed to the foreman.

CREATE TABLE IF NOT EXISTS public.job_note_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT private.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  note_id uuid NOT NULL REFERENCES public.job_notes(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_first_name text,
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_note_replies_note_idx
  ON public.job_note_replies (note_id, created_at);

ALTER TABLE public.job_note_replies ENABLE ROW LEVEL SECURITY;

-- Existing Telegram/operations notes use author_type for attribution. Extend
-- that constrained vocabulary rather than recording Foreman messages as ops.
ALTER TABLE public.job_notes DROP CONSTRAINT IF EXISTS job_notes_author_type_check;
ALTER TABLE public.job_notes
  ADD CONSTRAINT job_notes_author_type_check
  CHECK (author_type IN ('ops', 'operative', 'foreman'));

CREATE OR REPLACE FUNCTION private.populate_job_note_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
    SELECT email INTO NEW.user_email FROM public.profiles WHERE id = auth.uid();
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'site_foreman'::public.app_role
    ) THEN
      NEW.author_type := 'foreman';
      SELECT s.id INTO NEW.author_staff_id
      FROM public.staff s
      JOIN public.profiles p ON lower(p.email) = lower(s.email)
      WHERE p.id = auth.uid()
      LIMIT 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS populate_job_note_author_trg ON public.job_notes;
CREATE TRIGGER populate_job_note_author_trg
  BEFORE INSERT ON public.job_notes
  FOR EACH ROW EXECUTE FUNCTION private.populate_job_note_author();

DROP POLICY IF EXISTS job_notes_select_foreman ON public.job_notes;
CREATE POLICY job_notes_select_foreman ON public.job_notes
  FOR SELECT TO authenticated
  USING (
    tenant_id = private.current_tenant_id()
    AND private.can_view_site_foreman_job(auth.uid(), job_notes.job_id)
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS job_notes_insert_foreman ON public.job_notes;
CREATE POLICY job_notes_insert_foreman ON public.job_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = private.current_tenant_id()
    AND user_id = auth.uid()
    AND private.can_write_site_foreman_job(auth.uid(), job_notes.job_id)
  );

DROP POLICY IF EXISTS job_note_replies_select ON public.job_note_replies;
CREATE POLICY job_note_replies_select ON public.job_note_replies
  FOR SELECT TO authenticated
  USING (
    tenant_id = private.current_tenant_id()
    AND (
      private.can_write_ops(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.job_notes n
        WHERE n.id = job_note_replies.note_id
          AND n.user_id = auth.uid()
          AND private.can_view_site_foreman_job(auth.uid(), n.job_id)
      )
    )
  );

DROP POLICY IF EXISTS job_note_replies_insert ON public.job_note_replies;
CREATE POLICY job_note_replies_insert ON public.job_note_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = private.current_tenant_id()
    AND author_id = auth.uid()
    AND (
      (
        private.can_write_ops(auth.uid())
        AND EXISTS (
          SELECT 1
          FROM public.job_notes n
          WHERE n.id = job_note_replies.note_id
            AND n.tenant_id = private.current_tenant_id()
        )
      )
      OR (
        EXISTS (
          SELECT 1
          FROM public.job_notes n
          WHERE n.id = job_note_replies.note_id
            AND n.user_id = auth.uid()
            AND private.can_write_site_foreman_job(auth.uid(), n.job_id)
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION private.populate_job_note_reply_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  SELECT split_part(COALESCE(NULLIF(trim(full_name), ''), email), ' ', 1)
    INTO NEW.author_first_name
  FROM public.profiles
  WHERE id = NEW.author_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS populate_job_note_reply_author_trg ON public.job_note_replies;
CREATE TRIGGER populate_job_note_reply_author_trg
  BEFORE INSERT ON public.job_note_replies
  FOR EACH ROW EXECUTE FUNCTION private.populate_job_note_reply_author();

CREATE OR REPLACE FUNCTION private.audit_job_note_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text;
  v_job_id text;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
  SELECT job_id INTO v_job_id FROM public.job_notes WHERE id = NEW.note_id;
  INSERT INTO public.audit_logs(user_id, user_email, action, target_type, target_id, details, tenant_id)
  VALUES (
    auth.uid(), v_email, 'JOB_NOTE_REPLY_ADDED', 'jobs', v_job_id,
    jsonb_build_object('note_id', NEW.note_id, 'reply_id', NEW.id), NEW.tenant_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_job_note_reply_trg ON public.job_note_replies;
CREATE TRIGGER audit_job_note_reply_trg
  AFTER INSERT ON public.job_note_replies
  FOR EACH ROW EXECUTE FUNCTION private.audit_job_note_reply();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'job_note_replies'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_note_replies;
  END IF;
END $$;
