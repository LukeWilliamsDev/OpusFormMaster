-- Restrict full schedule visibility to scheduling roles while preserving each
-- field user's access to their own assigned shifts.

CREATE OR REPLACE FUNCTION private.can_write_ops(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role IN (
        'admin'::public.app_role,
        'director'::public.app_role,
        'logistics_coordinator'::public.app_role
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_view_schedule(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role IN (
        'admin'::public.app_role,
        'director'::public.app_role,
        'logistics_coordinator'::public.app_role,
        'logistics_assistant'::public.app_role
      )
  );
$$;

REVOKE ALL ON FUNCTION private.can_write_ops(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_write_ops(uuid) TO authenticated;
REVOKE ALL ON FUNCTION private.can_view_schedule(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_schedule(uuid) TO authenticated;

DROP POLICY IF EXISTS staff_select_authenticated ON public.staff;
CREATE POLICY staff_select_authenticated ON public.staff
  FOR SELECT TO authenticated
  USING (
    tenant_id = private.current_tenant_id()
    AND (
      private.can_view_schedule(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid() AND p.email = staff.email
      )
    )
  );

DROP POLICY IF EXISTS jobs_select_authenticated ON public.jobs;
CREATE POLICY jobs_select_authenticated ON public.jobs
  FOR SELECT TO authenticated
  USING (
    tenant_id = private.current_tenant_id()
    AND (
      private.can_view_schedule(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.shifts sh
        JOIN public.staff s ON s.id = sh.worker_id
        JOIN public.profiles p ON p.email = s.email
        WHERE p.id = auth.uid()
          AND sh.job_id = jobs.id
          AND sh.tenant_id = jobs.tenant_id
      )
    )
  );

DROP POLICY IF EXISTS shifts_select_authenticated ON public.shifts;
CREATE POLICY shifts_select_authenticated ON public.shifts
  FOR SELECT TO authenticated
  USING (
    tenant_id = private.current_tenant_id()
    AND (
      private.can_view_schedule(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        JOIN public.staff s ON s.email = p.email
        WHERE p.id = auth.uid() AND s.id = shifts.worker_id
      )
    )
  );

DROP POLICY IF EXISTS calendar_events_select_ops ON public.calendar_events;
CREATE POLICY calendar_events_select_ops ON public.calendar_events
  FOR SELECT TO authenticated
  USING (
    private.can_view_schedule(auth.uid())
    AND tenant_id = private.current_tenant_id()
  );
