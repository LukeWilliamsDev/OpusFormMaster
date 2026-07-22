-- supabase/migrations/20260723120000_add_job_notes_table.sql
CREATE TABLE public.job_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid,
  user_email text,
  body text NOT NULL,
  reminder_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid NOT NULL DEFAULT private.current_tenant_id()
);

CREATE INDEX job_notes_job_id_idx ON public.job_notes(job_id);

ALTER TABLE public.job_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_notes_select_ops ON public.job_notes FOR SELECT TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());
CREATE POLICY job_notes_insert_ops ON public.job_notes FOR INSERT TO authenticated
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

ALTER PUBLICATION supabase_realtime ADD TABLE public.job_notes;
