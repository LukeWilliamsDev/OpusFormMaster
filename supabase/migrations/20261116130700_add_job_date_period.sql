ALTER TABLE public.jobs
  ADD COLUMN start_date date,
  ADD COLUMN end_date date;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_date_period_check
  CHECK (
    (start_date IS NULL AND end_date IS NULL)
    OR (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= start_date)
  );
