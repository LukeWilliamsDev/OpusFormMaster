-- Make quote conversion retries safe for derived pours.
-- The client uses the quote's deterministic conversion job id and upserts each
-- pour by (job_id, pour_number), so a lost response cannot create duplicates.
-- This is tenant-safe because pours already enforce the parent job tenant via
-- RLS and the job foreign key.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.pours
    GROUP BY job_id, pour_number
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot add pours_job_id_pour_number_key until duplicate pour numbers are reconciled';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS pours_job_id_pour_number_key
  ON public.pours (job_id, pour_number);

-- Corrective path: if a future rollback removes client upserts, this index may
-- be dropped in a reviewed forward migration after duplicate protection is no
-- longer required. Do not delete or rewrite existing pour rows automatically.
