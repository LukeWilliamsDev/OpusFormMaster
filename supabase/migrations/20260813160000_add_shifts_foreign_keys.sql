-- shifts carried only a tenant_id foreign key. Without declared relationships
-- to jobs and staff, PostgREST cannot resolve embedded selects such as
-- shifts.select("id, jobs(site_name)") — the request errors and the client
-- receives null, which is indistinguishable from "no rows".
--
-- That silently broke both /myweek and the shift reminder sender: each returned
-- an empty result that looked like a legitimate "nothing scheduled".
--
-- Verified zero orphan rows before adding these.

ALTER TABLE public.shifts
  ADD CONSTRAINT shifts_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE public.shifts
  ADD CONSTRAINT shifts_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.staff(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS shifts_job_id_idx ON public.shifts(job_id);
CREATE INDEX IF NOT EXISTS shifts_worker_id_date_idx ON public.shifts(worker_id, date);
