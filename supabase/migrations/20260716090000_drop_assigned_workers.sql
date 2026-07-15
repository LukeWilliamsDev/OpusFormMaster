-- Consolidate deployments to the shifts table as the single source of truth.
-- jobs.assigned_workers (dateless) and shifts.is_removed (tombstones for
-- synthetic assigned-worker shifts) are removed.

-- 1. Defensively materialize any lingering assigned_workers into real shifts
--    for the current working week (Mon-Fri), skipping worker+day combos that
--    already have a shift. Believed to be empty in practice (seed data never
--    populated it), but converted rather than dropped silently.
INSERT INTO public.shifts (id, worker_id, job_id, date, is_removed, tenant_id)
SELECT
  'mig-' || j.id || '-' || w.worker_id || '-' || d.day::text,
  w.worker_id,
  j.id,
  d.day::date,
  false,
  j.tenant_id
FROM public.jobs j
CROSS JOIN LATERAL unnest(j.assigned_workers) AS w(worker_id)
CROSS JOIN LATERAL generate_series(
  date_trunc('week', now())::date,
  date_trunc('week', now())::date + 4,
  interval '1 day'
) AS d(day)
WHERE cardinality(j.assigned_workers) > 0
  AND j.status <> 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM public.shifts s
    WHERE s.worker_id = w.worker_id AND s.date = d.day::date
  );

-- 2. Tombstones only ever suppressed synthetic assigned-worker shifts; with
--    that mechanism gone they are dead rows.
DELETE FROM public.shifts WHERE is_removed = true;

-- 3. Drop the legacy columns.
ALTER TABLE public.jobs DROP COLUMN IF EXISTS assigned_workers;
ALTER TABLE public.shifts DROP COLUMN IF EXISTS is_removed;

-- Follow-up (deliberately NOT added now): a UNIQUE (worker_id, date) index
-- would enforce the one-deployment-per-day rule at the DB level, but the
-- client's current whole-table upsert-then-delete sync can transiently
-- violate it. Add once mutations are granular.
