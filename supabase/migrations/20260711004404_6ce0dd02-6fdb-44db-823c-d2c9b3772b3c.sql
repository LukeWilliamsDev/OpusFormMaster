
-- 1. Grant USAGE on private schema to authenticated so RLS policies calling private.has_role() work
GRANT USAGE ON SCHEMA private TO authenticated;

-- 2. Helper: is caller admin or dispatcher?
CREATE OR REPLACE FUNCTION private.can_write_ops(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role IN ('admin', 'dispatcher')
  );
$$;
GRANT EXECUTE ON FUNCTION private.can_write_ops(uuid) TO authenticated;

-- 3. workers
CREATE TABLE public.workers (
  id text PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL,
  phone text,
  email text,
  is_archived boolean NOT NULL DEFAULT false,
  tickets jsonb NOT NULL DEFAULT '[]'::jsonb,
  uploaded_certificates jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workers TO authenticated;
GRANT ALL ON public.workers TO service_role;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workers_select_authenticated" ON public.workers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "workers_insert_ops" ON public.workers
  FOR INSERT TO authenticated WITH CHECK (private.can_write_ops(auth.uid()));
CREATE POLICY "workers_update_ops" ON public.workers
  FOR UPDATE TO authenticated USING (private.can_write_ops(auth.uid())) WITH CHECK (private.can_write_ops(auth.uid()));
CREATE POLICY "workers_delete_ops" ON public.workers
  FOR DELETE TO authenticated USING (private.can_write_ops(auth.uid()));
CREATE TRIGGER workers_set_updated_at BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. jobs
CREATE TABLE public.jobs (
  id text PRIMARY KEY,
  job_ref text NOT NULL,
  site_name text NOT NULL,
  main_contractor text,
  postcode text,
  current_pours integer NOT NULL DEFAULT 0,
  contract_max_pours integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  schedule_value numeric NOT NULL DEFAULT 0,
  assigned_workers text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_select_authenticated" ON public.jobs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "jobs_insert_ops" ON public.jobs
  FOR INSERT TO authenticated WITH CHECK (private.can_write_ops(auth.uid()));
CREATE POLICY "jobs_update_ops" ON public.jobs
  FOR UPDATE TO authenticated USING (private.can_write_ops(auth.uid())) WITH CHECK (private.can_write_ops(auth.uid()));
CREATE POLICY "jobs_delete_ops" ON public.jobs
  FOR DELETE TO authenticated USING (private.can_write_ops(auth.uid()));
CREATE TRIGGER jobs_set_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. shifts
CREATE TABLE public.shifts (
  id text PRIMARY KEY,
  worker_id text NOT NULL,
  job_id text NOT NULL,
  date date NOT NULL,
  is_removed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO authenticated;
GRANT ALL ON public.shifts TO service_role;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shifts_select_authenticated" ON public.shifts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "shifts_insert_ops" ON public.shifts
  FOR INSERT TO authenticated WITH CHECK (private.can_write_ops(auth.uid()));
CREATE POLICY "shifts_update_ops" ON public.shifts
  FOR UPDATE TO authenticated USING (private.can_write_ops(auth.uid())) WITH CHECK (private.can_write_ops(auth.uid()));
CREATE POLICY "shifts_delete_ops" ON public.shifts
  FOR DELETE TO authenticated USING (private.can_write_ops(auth.uid()));
CREATE TRIGGER shifts_set_updated_at BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX shifts_worker_id_idx ON public.shifts(worker_id);
CREATE INDEX shifts_job_id_idx ON public.shifts(job_id);
CREATE INDEX shifts_date_idx ON public.shifts(date);
