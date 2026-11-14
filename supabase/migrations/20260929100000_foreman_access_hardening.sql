-- Harden the Foreman access boundary after the initial workspace rollout.

CREATE OR REPLACE FUNCTION private.is_completed_job_status(_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(COALESCE(_status, ''))) IN ('completed', 'complete', 'closed');
$$;

REVOKE ALL ON FUNCTION private.is_completed_job_status(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_completed_job_status(text) TO authenticated;

CREATE OR REPLACE FUNCTION private.can_view_site_foreman_job(_user_id uuid, _job_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.staff own_staff ON lower(own_staff.email) = lower(p.email)
    JOIN public.shifts own_shift
      ON own_shift.worker_id = own_staff.id
     AND own_shift.tenant_id = own_staff.tenant_id
    JOIN public.jobs j
      ON j.id = own_shift.job_id
     AND j.tenant_id = own_shift.tenant_id
    WHERE _user_id = auth.uid()
      AND p.id = _user_id
      AND p.status = 'active'
      AND p.role = 'site_foreman'::public.app_role
      AND own_shift.job_id = _job_id
      AND own_shift.tenant_id = private.current_tenant_id()
      AND (
        own_shift.date >= CURRENT_DATE
        OR private.is_completed_job_status(j.status)
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_write_site_foreman_job(_user_id uuid, _job_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.staff own_staff ON lower(own_staff.email) = lower(p.email)
    JOIN public.shifts own_shift
      ON own_shift.worker_id = own_staff.id
     AND own_shift.tenant_id = own_staff.tenant_id
    JOIN public.jobs j
      ON j.id = own_shift.job_id
     AND j.tenant_id = own_shift.tenant_id
    WHERE _user_id = auth.uid()
      AND p.id = _user_id
      AND p.status = 'active'
      AND p.role = 'site_foreman'::public.app_role
      AND own_shift.job_id = _job_id
      AND own_shift.date >= CURRENT_DATE
      AND NOT private.is_completed_job_status(j.status)
      AND own_shift.tenant_id = private.current_tenant_id()
  );
$$;

REVOKE ALL ON FUNCTION private.can_view_site_foreman_job(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_site_foreman_job(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION private.can_write_site_foreman_job(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_write_site_foreman_job(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION private.can_view_site_foreman_staff(_user_id uuid, _staff_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.staff own_staff ON lower(own_staff.email) = lower(p.email)
    JOIN public.shifts own_shift
      ON own_shift.worker_id = own_staff.id
     AND own_shift.tenant_id = own_staff.tenant_id
    JOIN public.jobs j
      ON j.id = own_shift.job_id
     AND j.tenant_id = own_shift.tenant_id
    JOIN public.shifts target_shift
      ON target_shift.job_id = own_shift.job_id
     AND target_shift.tenant_id = own_shift.tenant_id
    WHERE _user_id = auth.uid()
      AND p.id = _user_id
      AND p.status = 'active'
      AND p.role = 'site_foreman'::public.app_role
      AND target_shift.worker_id = _staff_id
      AND target_shift.tenant_id = private.current_tenant_id()
      AND (
        (own_shift.date >= CURRENT_DATE AND target_shift.date >= CURRENT_DATE)
        OR private.is_completed_job_status(j.status)
      )
  );
$$;

REVOKE ALL ON FUNCTION private.can_view_site_foreman_staff(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_site_foreman_staff(uuid, text) TO authenticated;

-- Remove the older OR-combined storage read policy. The dedicated policy below
-- preserves management and third-party reads while making Foreman access use
-- the same assignment/completed predicate as table access.
DROP POLICY IF EXISTS job_attachments_storage_read ON storage.objects;
CREATE POLICY job_attachments_storage_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'job-attachments'
    AND (
      (
        (storage.foldername(storage.objects.name))[1] = 'jobs'
        AND EXISTS (
          SELECT 1 FROM public.jobs j
          WHERE j.id = (storage.foldername(storage.objects.name))[2]
            AND j.tenant_id = private.current_tenant_id()
        )
        AND (
          private.can_view_schedule(auth.uid())
          OR private.can_view_site_foreman_job(auth.uid(), (storage.foldername(storage.objects.name))[2])
          OR (
            private.is_third_party(auth.uid())
            AND private.third_party_can_access_job(auth.uid(), (storage.foldername(storage.objects.name))[2])
          )
        )
      )
      OR (
        (storage.foldername(storage.objects.name))[1] = 'third-party-media'
        AND private.is_third_party(auth.uid())
        AND private.third_party_can_access_job(auth.uid(), (storage.foldername(storage.objects.name))[2])
      )
    )
  );

DROP POLICY IF EXISTS job_attachments_storage_foreman_read ON storage.objects;

-- Keep Foreman uploads aligned with the canonical completed predicate.
DROP POLICY IF EXISTS job_attachments_storage_foreman_write ON storage.objects;
CREATE POLICY job_attachments_storage_foreman_write
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-attachments'
    AND (storage.foldername(name))[1] = 'jobs'
    AND private.can_write_site_foreman_job(auth.uid(), (storage.foldername(name))[2])
  );

-- Permit a Foreman to remove only an object whose metadata insert failed. A
-- Foreman cannot delete an attachment row or an object that is already
-- referenced by job_attachments.
DROP POLICY IF EXISTS job_attachments_storage_foreman_orphan_delete ON storage.objects;
CREATE POLICY job_attachments_storage_foreman_orphan_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'job-attachments'
    AND (storage.foldername(name))[1] = 'jobs'
    AND private.can_write_site_foreman_job(auth.uid(), (storage.foldername(name))[2])
    AND NOT EXISTS (
      SELECT 1
      FROM public.job_attachments a
      WHERE a.job_id = (storage.foldername(name))[2]
        AND (
          a.file_url = name
          OR a.file_url LIKE ('%/job-attachments/' || name)
        )
    )
  );
