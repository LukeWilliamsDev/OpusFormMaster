-- Threaded responses for third-party job notes. Third parties can see the
-- complete history of their own notes; authorised internal operatives can
-- respond without granting them write access to the original note.

CREATE TABLE IF NOT EXISTS public.third_party_job_note_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  note_id uuid NOT NULL REFERENCES public.third_party_job_notes(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS third_party_job_note_replies_note_idx
  ON public.third_party_job_note_replies (note_id, created_at);

ALTER TABLE public.third_party_job_note_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY third_party_note_replies_select ON public.third_party_job_note_replies
  FOR SELECT TO authenticated USING (
    tenant_id = private.current_tenant_id()
    AND (
      private.can_write_ops(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.third_party_job_notes n
        WHERE n.id = note_id
          AND n.author_id = auth.uid()
          AND private.third_party_can_access_job(auth.uid(), n.job_id)
      )
    )
  );

CREATE POLICY third_party_note_replies_insert ON public.third_party_job_note_replies
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id = private.current_tenant_id()
    AND author_id = auth.uid()
    AND private.can_write_ops(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.third_party_job_notes n
      WHERE n.id = note_id
        AND n.tenant_id = private.current_tenant_id()
        AND private.can_write_ops(auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION private.audit_third_party_note_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_email text;
DECLARE v_job_id text;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
  SELECT job_id INTO v_job_id FROM public.third_party_job_notes WHERE id = NEW.note_id;
  INSERT INTO public.audit_logs(user_id, user_email, action, target_type, target_id, details, tenant_id)
  VALUES (
    auth.uid(), v_email, 'THIRD_PARTY_JOB_NOTE_REPLY_ADDED', 'third_party_job_note_replies', NEW.id::text,
    jsonb_build_object('note_id', NEW.note_id, 'job_id', v_job_id), NEW.tenant_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_third_party_note_reply_trg ON public.third_party_job_note_replies;
CREATE TRIGGER audit_third_party_note_reply_trg
  AFTER INSERT ON public.third_party_job_note_replies
  FOR EACH ROW EXECUTE FUNCTION private.audit_third_party_note_reply();
