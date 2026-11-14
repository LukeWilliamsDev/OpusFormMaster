-- Release blocker: labourer is intentionally no-portal and has no direct
-- Supabase path to Foreman operational data. Keep assignment, tenant, active
-- profile, and completed-job checks unchanged for supported operative roles.

CREATE OR REPLACE FUNCTION private.can_view_assigned_job(_user_id uuid, _job_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.staff s
      ON lower(s.email) = lower(p.email)
     AND s.tenant_id = private.current_tenant_id()
     AND s.is_archived = false
    JOIN public.shifts sh
      ON sh.worker_id = s.id
     AND sh.job_id = _job_id
     AND sh.tenant_id = s.tenant_id
    JOIN public.jobs j
      ON j.id = sh.job_id
     AND j.tenant_id = sh.tenant_id
    WHERE _user_id = auth.uid()
      AND p.id = _user_id
      AND p.status = 'active'
      AND p.role <> 'labourer'::public.app_role
      AND (sh.date >= CURRENT_DATE OR private.is_completed_job_status(j.status))
  );
$$;

CREATE OR REPLACE FUNCTION private.can_write_assigned_job(_user_id uuid, _job_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.staff s
      ON lower(s.email) = lower(p.email)
     AND s.tenant_id = private.current_tenant_id()
     AND s.is_archived = false
    JOIN public.shifts sh
      ON sh.worker_id = s.id
     AND sh.job_id = _job_id
     AND sh.tenant_id = s.tenant_id
    JOIN public.jobs j
      ON j.id = sh.job_id
     AND j.tenant_id = sh.tenant_id
    WHERE _user_id = auth.uid()
      AND p.id = _user_id
      AND p.status = 'active'
      AND p.role <> 'labourer'::public.app_role
      AND sh.date >= CURRENT_DATE
      AND NOT private.is_completed_job_status(j.status)
  );
$$;

REVOKE ALL ON FUNCTION private.can_view_assigned_job(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_assigned_job(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION private.can_write_assigned_job(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_write_assigned_job(uuid, text) TO authenticated;

-- The legacy own-assignment branches on jobs, shifts, and staff are separate
-- permissive policies, so role-checking only the helper is insufficient.
DROP POLICY IF EXISTS jobs_select_authenticated ON public.jobs;
CREATE POLICY jobs_select_authenticated ON public.jobs
  FOR SELECT TO authenticated USING (
    tenant_id = private.current_tenant_id()
    AND (
      private.can_view_schedule(auth.uid())
      OR private.third_party_can_access_job(auth.uid(), jobs.id)
      OR private.can_view_assigned_job(auth.uid(), jobs.id)
    )
  );

DROP POLICY IF EXISTS shifts_select_authenticated ON public.shifts;
CREATE POLICY shifts_select_authenticated ON public.shifts
  FOR SELECT TO authenticated USING (
    tenant_id = private.current_tenant_id()
    AND (
      private.can_view_schedule(auth.uid())
      OR private.can_view_site_foreman_job(auth.uid(), job_id)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        JOIN public.staff s ON lower(s.email) = lower(p.email)
        WHERE p.id = auth.uid()
          AND p.status = 'active'
          AND p.role <> 'labourer'::public.app_role
          AND s.id = shifts.worker_id
          AND s.tenant_id = shifts.tenant_id
          AND s.is_archived = false
          AND shifts.date >= CURRENT_DATE
      )
      OR private.third_party_owns_staff(auth.uid(), worker_id)
    )
  );

DROP POLICY IF EXISTS staff_select_authenticated ON public.staff;
CREATE POLICY staff_select_authenticated ON public.staff
  FOR SELECT TO authenticated USING (
    tenant_id = private.current_tenant_id()
    AND (
      private.can_view_schedule(auth.uid())
      OR private.can_view_site_foreman_staff(auth.uid(), id)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.status = 'active'
          AND p.role <> 'labourer'::public.app_role
          AND lower(p.email) = lower(staff.email)
          AND staff.is_archived = false
      )
      OR private.third_party_owns_staff(auth.uid(), id)
    )
  );

-- Do not trust client-supplied authorship or identity metadata on notes. The
-- job/tenant relationship remains policy-checked, while author fields are
-- stamped on insert and immutable on update.
CREATE OR REPLACE FUNCTION private.populate_job_note_author()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.job_id := OLD.job_id;
    NEW.tenant_id := OLD.tenant_id;
    NEW.user_id := OLD.user_id;
    NEW.user_email := OLD.user_email;
    NEW.author_type := OLD.author_type;
    NEW.author_staff_id := OLD.author_staff_id;
  ELSIF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
    SELECT email INTO NEW.user_email FROM public.profiles WHERE id = auth.uid();
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND status = 'active'
        AND role = 'site_foreman'::public.app_role
    ) THEN
      NEW.author_type := 'foreman';
      SELECT s.id INTO NEW.author_staff_id
      FROM public.staff s
      JOIN public.profiles p ON lower(p.email) = lower(s.email)
      WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND s.tenant_id = private.current_tenant_id()
        AND s.is_archived = false
      LIMIT 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS populate_job_note_author_trg ON public.job_notes;
CREATE TRIGGER populate_job_note_author_trg
  BEFORE INSERT OR UPDATE ON public.job_notes
  FOR EACH ROW EXECUTE FUNCTION private.populate_job_note_author();
