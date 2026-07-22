-- supabase/migrations/20260722120000_add_pours_table.sql
CREATE TABLE public.pours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  pour_number int NOT NULL,
  date date,
  mix_type text NOT NULL DEFAULT 'TBC',
  volume_m3 numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid
);

CREATE INDEX pours_job_id_idx ON public.pours(job_id);

ALTER TABLE public.pours ENABLE ROW LEVEL SECURITY;

CREATE POLICY pours_select_ops ON public.pours FOR SELECT TO authenticated
  USING (private.can_write_ops(auth.uid()));
CREATE POLICY pours_insert_ops ON public.pours FOR INSERT TO authenticated
  WITH CHECK (private.can_write_ops(auth.uid()));
CREATE POLICY pours_update_ops ON public.pours FOR UPDATE TO authenticated
  USING (private.can_write_ops(auth.uid())) WITH CHECK (private.can_write_ops(auth.uid()));
CREATE POLICY pours_delete_ops ON public.pours FOR DELETE TO authenticated
  USING (private.can_write_ops(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.pours;
