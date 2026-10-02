-- Release-security hardening for the Foreman workspace.
-- Keep field-user access, but make every assignment branch require the same
-- active profile, tenant, non-archived staff, and job-state checks.

CREATE OR REPLACE FUNCTION private.can_view_assigned_job(_user_id uuid, _job_id text)
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
      AND (
        sh.date >= CURRENT_DATE
        OR private.is_completed_job_status(j.status)
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_write_assigned_job(_user_id uuid, _job_id text)
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
      AND sh.date >= CURRENT_DATE
      AND NOT private.is_completed_job_status(j.status)
  );
$$;

REVOKE ALL ON FUNCTION private.can_view_assigned_job(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_assigned_job(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION private.can_write_assigned_job(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_write_assigned_job(uuid, text) TO authenticated;

-- The Foreman helpers must not resolve an archived staff row as the caller's
-- assignment. Target staff is also excluded from the Foreman staff slice.
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
    JOIN public.staff own_staff
      ON lower(own_staff.email) = lower(p.email)
     AND own_staff.tenant_id = private.current_tenant_id()
     AND own_staff.is_archived = false
    JOIN public.shifts own_shift
      ON own_shift.worker_id = own_staff.id
     AND own_shift.job_id = _job_id
     AND own_shift.tenant_id = own_staff.tenant_id
    JOIN public.jobs j
      ON j.id = own_shift.job_id
     AND j.tenant_id = own_shift.tenant_id
    WHERE _user_id = auth.uid()
      AND p.id = _user_id
      AND p.status = 'active'
      AND p.role = 'site_foreman'::public.app_role
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
    JOIN public.staff own_staff
      ON lower(own_staff.email) = lower(p.email)
     AND own_staff.tenant_id = private.current_tenant_id()
     AND own_staff.is_archived = false
    JOIN public.shifts own_shift
      ON own_shift.worker_id = own_staff.id
     AND own_shift.job_id = _job_id
     AND own_shift.tenant_id = own_staff.tenant_id
    JOIN public.jobs j
      ON j.id = own_shift.job_id
     AND j.tenant_id = own_shift.tenant_id
    WHERE _user_id = auth.uid()
      AND p.id = _user_id
      AND p.status = 'active'
      AND p.role = 'site_foreman'::public.app_role
      AND own_shift.date >= CURRENT_DATE
      AND NOT private.is_completed_job_status(j.status)
  );
$$;

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
    JOIN public.staff own_staff
      ON lower(own_staff.email) = lower(p.email)
     AND own_staff.tenant_id = private.current_tenant_id()
     AND own_staff.is_archived = false
    JOIN public.shifts own_shift
      ON own_shift.worker_id = own_staff.id
     AND own_shift.tenant_id = own_staff.tenant_id
    JOIN public.jobs j
      ON j.id = own_shift.job_id
     AND j.tenant_id = own_shift.tenant_id
    JOIN public.shifts target_shift
      ON target_shift.job_id = own_shift.job_id
     AND target_shift.tenant_id = own_shift.tenant_id
     AND target_shift.worker_id = _staff_id
    JOIN public.staff target_staff
      ON target_staff.id = target_shift.worker_id
     AND target_staff.tenant_id = target_shift.tenant_id
     AND target_staff.is_archived = false
    WHERE _user_id = auth.uid()
      AND p.id = _user_id
      AND p.status = 'active'
      AND p.role = 'site_foreman'::public.app_role
      AND (
        (own_shift.date >= CURRENT_DATE AND target_shift.date >= CURRENT_DATE)
        OR private.is_completed_job_status(j.status)
      )
  );
$$;

REVOKE ALL ON FUNCTION private.can_view_site_foreman_job(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_site_foreman_job(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION private.can_write_site_foreman_job(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_write_site_foreman_job(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION private.can_view_site_foreman_staff(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_site_foreman_staff(uuid, text) TO authenticated;

-- Tighten the shared authenticated policies too. A Foreman must not reach an
-- archived own staff/shift row through the legacy email-matching branches.
DROP POLICY IF EXISTS shifts_select_authenticated ON public.shifts;
CREATE POLICY shifts_select_authenticated ON public.shifts
  FOR SELECT TO authenticated
  USING (
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
  FOR SELECT TO authenticated
  USING (
    tenant_id = private.current_tenant_id()
    AND (
      private.can_view_schedule(auth.uid())
      OR private.can_view_site_foreman_staff(auth.uid(), id)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.status = 'active'
          AND lower(p.email) = lower(staff.email)
          AND staff.is_archived = false
      )
      OR private.third_party_owns_staff(auth.uid(), id)
    )
  );

-- Rebuild diary policies into one policy per operation. PostgreSQL combines
-- permissive policies with OR, so remove every historical field-user/Foreman
-- variant before restoring the management and assignment branches.
DROP POLICY IF EXISTS "Allow ops full access to job_diary" ON public.job_diary;
DROP POLICY IF EXISTS "Allow operatives to view and log their own job diary" ON public.job_diary;
DROP POLICY IF EXISTS "Allow operatives to write their own job diary" ON public.job_diary;
DROP POLICY IF EXISTS "Allow operatives to update their own job diary" ON public.job_diary;
DROP POLICY IF EXISTS job_diary_select_site_foreman ON public.job_diary;
DROP POLICY IF EXISTS job_diary_insert_site_foreman ON public.job_diary;
DROP POLICY IF EXISTS job_diary_update_site_foreman ON public.job_diary;
CREATE POLICY "Allow operatives to view and log their own job diary"
  ON public.job_diary FOR SELECT TO authenticated
  USING (
    tenant_id = private.current_tenant_id()
    AND (private.can_write_ops(auth.uid())
      OR private.can_view_assigned_job(auth.uid(), job_diary.job_id))
  );
CREATE POLICY "Allow operatives to write their own job diary"
  ON public.job_diary FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = private.current_tenant_id()
    AND (private.can_write_ops(auth.uid())
      OR private.can_write_assigned_job(auth.uid(), job_diary.job_id))
  );
CREATE POLICY "Allow operatives to update their own job diary"
  ON public.job_diary FOR UPDATE TO authenticated
  USING (
    tenant_id = private.current_tenant_id()
    AND (private.can_write_ops(auth.uid())
      OR private.can_write_assigned_job(auth.uid(), job_diary.job_id))
  )
  WITH CHECK (
    tenant_id = private.current_tenant_id()
    AND (private.can_write_ops(auth.uid())
      OR private.can_write_assigned_job(auth.uid(), job_diary.job_id))
  );

-- Metadata rows must follow the same assignment and completion rules as the
-- object path. Keep management and third-party branches intact, but remove
-- older permissive field-user and Foreman policies first.
DROP POLICY IF EXISTS "Allow authenticated read of job_attachments" ON public.job_attachments;
DROP POLICY IF EXISTS "Allow ops full access to job_attachments" ON public.job_attachments;
DROP POLICY IF EXISTS "Allow operatives to upload their own job attachments" ON public.job_attachments;
DROP POLICY IF EXISTS job_attachments_select_site_foreman ON public.job_attachments;
DROP POLICY IF EXISTS job_attachments_select_ops ON public.job_attachments;
CREATE POLICY job_attachments_select_ops ON public.job_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_attachments.job_id
        AND j.tenant_id = private.current_tenant_id()
    )
    AND (
      private.can_view_schedule(auth.uid())
      OR (
        private.is_third_party(auth.uid())
        AND job_attachments.type IN ('image_before', 'image_after')
        AND private.third_party_can_access_job(auth.uid(), job_attachments.job_id)
      )
      OR private.can_view_assigned_job(auth.uid(), job_attachments.job_id)
    )
  );

DROP POLICY IF EXISTS job_attachments_insert_ops ON public.job_attachments;
CREATE POLICY job_attachments_insert_ops ON public.job_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_attachments.job_id
        AND j.tenant_id = private.current_tenant_id()
    )
    AND (
      private.can_write_ops(auth.uid())
      OR private.can_write_assigned_job(auth.uid(), job_attachments.job_id)
    )
    AND (
      private.can_write_ops(auth.uid())
      OR job_attachments.file_url LIKE ('jobs/' || job_attachments.job_id || '/%')
      OR job_attachments.file_url LIKE ('%/job-attachments/jobs/' || job_attachments.job_id || '/%')
    )
  );

-- Replace the combined storage policies. Remove every older job-attachments
-- read/write policy so permissive policy OR semantics cannot bypass the same
-- tenant, assignment, and job-state checks.
DROP POLICY IF EXISTS "Allow read job-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read job-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload job-attachments" ON storage.objects;
DROP POLICY IF EXISTS job_attachments_storage_read ON storage.objects;
DROP POLICY IF EXISTS job_attachments_storage_ops_read ON storage.objects;
DROP POLICY IF EXISTS job_attachments_storage_ops_requests_read ON storage.objects;
DROP POLICY IF EXISTS job_attachments_storage_foreman_read ON storage.objects;
DROP POLICY IF EXISTS job_attachments_storage_ops_write ON storage.objects;
DROP POLICY IF EXISTS job_attachments_storage_foreman_write ON storage.objects;
DROP POLICY IF EXISTS job_attachments_storage_write ON storage.objects;
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
          OR private.can_view_assigned_job(auth.uid(), (storage.foldername(storage.objects.name))[2])
          OR (
            private.is_third_party(auth.uid())
            AND private.third_party_can_access_job(auth.uid(), (storage.foldername(storage.objects.name))[2])
          )
        )
      )
      OR (
        (storage.foldername(storage.objects.name))[1] = 'requests'
        AND private.can_write_ops(auth.uid())
        AND EXISTS (
          SELECT 1
          FROM public.job_attachments a
          JOIN public.jobs j ON j.id = a.job_id
          WHERE j.tenant_id = private.current_tenant_id()
            AND a.file_url LIKE '%' || storage.objects.name
        )
      )
      OR (
        private.is_third_party(auth.uid())
        AND (storage.foldername(storage.objects.name))[1] = 'third-party-media'
        AND private.third_party_can_access_job(auth.uid(), (storage.foldername(storage.objects.name))[2])
      )
    )
  );

-- Restore the Foreman object-write path after removing the older permissive
-- policy variants. Restore the Operations path alongside it.
DROP POLICY IF EXISTS job_attachments_storage_ops_write ON storage.objects;
CREATE POLICY job_attachments_storage_ops_write
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-attachments'
    AND (storage.foldername(name))[1] = 'jobs'
    AND private.can_write_ops(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.jobs j
      WHERE j.id = (storage.foldername(name))[2]
        AND j.tenant_id = private.current_tenant_id()
    )
  );

DROP POLICY IF EXISTS job_attachments_storage_foreman_write ON storage.objects;
CREATE POLICY job_attachments_storage_foreman_write
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-attachments'
    AND (storage.foldername(name))[1] = 'jobs'
    AND private.can_write_site_foreman_job(auth.uid(), (storage.foldername(name))[2])
  );

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

-- Notes and replies already delegate assignment to Foreman helpers; make the
-- author trigger equally strict so archived/inactive identities are never
-- stamped as Foreman authors on a metadata row.
CREATE OR REPLACE FUNCTION private.populate_job_note_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
    SELECT email INTO NEW.user_email FROM public.profiles WHERE id = auth.uid();
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND status = 'active'
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

-- Consolidate note access as well; otherwise the historical ops and Foreman
-- policies would remain permissive OR branches.
DROP POLICY IF EXISTS job_notes_select_ops ON public.job_notes;
DROP POLICY IF EXISTS job_notes_insert_ops ON public.job_notes;
DROP POLICY IF EXISTS job_notes_delete_ops ON public.job_notes;
DROP POLICY IF EXISTS job_notes_select_foreman ON public.job_notes;
DROP POLICY IF EXISTS job_notes_insert_foreman ON public.job_notes;
CREATE POLICY job_notes_select_ops ON public.job_notes
  FOR SELECT TO authenticated
  USING (
    tenant_id = private.current_tenant_id()
    AND (
      private.can_write_ops(auth.uid())
      OR (user_id = auth.uid()
        AND private.can_view_site_foreman_job(auth.uid(), job_notes.job_id))
    )
  );

CREATE POLICY job_notes_insert_ops ON public.job_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = private.current_tenant_id()
    AND (
      private.can_write_ops(auth.uid())
      OR (user_id = auth.uid()
        AND private.can_write_site_foreman_job(auth.uid(), job_notes.job_id))
    )
  );

CREATE POLICY job_notes_delete_ops ON public.job_notes
  FOR DELETE TO authenticated
  USING (tenant_id = private.current_tenant_id() AND private.can_write_ops(auth.uid()));

DROP POLICY IF EXISTS job_note_replies_select ON public.job_note_replies;
CREATE POLICY job_note_replies_select ON public.job_note_replies
  FOR SELECT TO authenticated
  USING (
    tenant_id = private.current_tenant_id()
    AND (
      private.can_write_ops(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.job_notes n
        WHERE n.id = job_note_replies.note_id
          AND n.tenant_id = private.current_tenant_id()
          AND n.user_id = auth.uid()
          AND private.can_view_site_foreman_job(auth.uid(), n.job_id)
      )
    )
  );

DROP POLICY IF EXISTS job_note_replies_insert ON public.job_note_replies;
CREATE POLICY job_note_replies_insert ON public.job_note_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = private.current_tenant_id()
    AND author_id = auth.uid()
    AND (
      (
        private.can_write_ops(auth.uid())
        AND EXISTS (
          SELECT 1 FROM public.job_notes n
          JOIN public.jobs j ON j.id = n.job_id
          WHERE n.id = job_note_replies.note_id
            AND n.tenant_id = private.current_tenant_id()
            AND j.tenant_id = private.current_tenant_id()
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.job_notes n
        WHERE n.id = job_note_replies.note_id
          AND n.tenant_id = private.current_tenant_id()
          AND n.user_id = auth.uid()
          AND private.can_write_site_foreman_job(auth.uid(), n.job_id)
      )
    )
  );
