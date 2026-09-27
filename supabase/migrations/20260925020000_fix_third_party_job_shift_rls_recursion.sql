-- Avoid recursive jobs/shifts RLS evaluation for third-party access.
-- Jobs policies must not query shifts directly: shifts visibility is itself
-- protected by RLS and PostgreSQL detects the cross-table policy cycle.

CREATE OR REPLACE FUNCTION private.third_party_can_access_job(_user_id uuid, _job_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.third_party_staff_access a
    JOIN public.shifts sh ON sh.worker_id = a.staff_id
    WHERE a.third_party_user_id = _user_id
      AND a.tenant_id = private.current_tenant_id()
      AND sh.job_id = _job_id
      AND sh.tenant_id = a.tenant_id
  );
$$;

CREATE OR REPLACE FUNCTION private.third_party_owns_staff(_user_id uuid, _staff_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.third_party_staff_access a
    WHERE a.third_party_user_id = _user_id
      AND a.staff_id = _staff_id
      AND a.tenant_id = private.current_tenant_id()
  );
$$;

DROP POLICY IF EXISTS jobs_select_authenticated ON public.jobs;
CREATE POLICY jobs_select_authenticated ON public.jobs
  FOR SELECT TO authenticated
  USING (
    tenant_id = private.current_tenant_id()
    AND (
      private.can_view_schedule(auth.uid())
      OR private.third_party_can_access_job(auth.uid(), id)
    )
  );

DROP POLICY IF EXISTS shifts_select_authenticated ON public.shifts;
CREATE POLICY shifts_select_authenticated ON public.shifts
  FOR SELECT TO authenticated
  USING (
    tenant_id = private.current_tenant_id()
    AND (
      private.can_view_schedule(auth.uid())
      OR private.third_party_owns_staff(auth.uid(), worker_id)
    )
  );
