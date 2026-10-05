-- Give site foremen the minimum additional read scope needed by the
-- assigned-site workspace: the crew and shifts for sites they are assigned to.
-- They remain unable to see unassigned sites, company-wide staff, or schedules.

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
    JOIN public.shifts own_shift
      ON own_shift.worker_id = own_staff.id
     AND own_shift.tenant_id = own_staff.tenant_id
    WHERE _user_id = auth.uid()
      AND p.id = _user_id
      AND p.status = 'active'
      AND p.role = 'site_foreman'::public.app_role
      AND own_shift.job_id = _job_id
      AND own_shift.date >= CURRENT_DATE
      AND own_shift.tenant_id = private.current_tenant_id()
      AND EXISTS (
        SELECT 1
        FROM public.jobs j
        WHERE j.id = _job_id
          AND j.tenant_id = private.current_tenant_id()
      )
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
    JOIN public.shifts own_shift
      ON own_shift.worker_id = own_staff.id
     AND own_shift.tenant_id = own_staff.tenant_id
    JOIN public.shifts target_shift
      ON target_shift.job_id = own_shift.job_id
     AND target_shift.tenant_id = own_shift.tenant_id
    JOIN public.staff target_staff
      ON target_staff.id = target_shift.worker_id
     AND target_staff.tenant_id = target_shift.tenant_id
    WHERE _user_id = auth.uid()
      AND p.id = _user_id
      AND p.status = 'active'
      AND p.role = 'site_foreman'::public.app_role
      AND own_shift.date >= CURRENT_DATE
      AND target_shift.worker_id = _staff_id
      AND target_shift.date >= CURRENT_DATE
      AND target_shift.tenant_id = private.current_tenant_id()
      AND EXISTS (
        SELECT 1
        FROM public.jobs j
        WHERE j.id = own_shift.job_id
          AND j.tenant_id = private.current_tenant_id()
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
      AND own_shift.tenant_id = private.current_tenant_id()
      AND j.status <> 'completed'
  );
$$;

-- Existing schedule/operations policies call these helpers directly. Include
-- account status here so an inactive profile cannot retain access through an
-- older permissive policy after its JWT has already been issued.
CREATE OR REPLACE FUNCTION private.can_view_schedule(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND status = 'active'
      AND role IN (
        'admin'::public.app_role,
        'director'::public.app_role,
        'logistics_coordinator'::public.app_role,
        'logistics_assistant'::public.app_role
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_write_ops(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND status = 'active'
      AND role IN (
        'admin'::public.app_role,
        'director'::public.app_role,
        'logistics_coordinator'::public.app_role
      )
  );
$$;

REVOKE ALL ON FUNCTION private.can_view_site_foreman_job(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_site_foreman_job(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION private.can_view_site_foreman_staff(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_site_foreman_staff(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION private.can_write_site_foreman_job(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_write_site_foreman_job(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION private.can_view_schedule(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_schedule(uuid) TO authenticated;
REVOKE ALL ON FUNCTION private.can_write_ops(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_write_ops(uuid) TO authenticated;

-- Rebuild the three legacy read policies so their old own-assignment branches
-- cannot bypass the active-profile checks above. Keep third-party access when
-- those helpers exist in the deployed project; the conditional branch keeps a
-- clean replay compatible with the older local migration history.
DO $$
BEGIN
  IF to_regprocedure('private.third_party_can_access_job(uuid,text)') IS NOT NULL
     AND to_regprocedure('private.third_party_owns_staff(uuid,text)') IS NOT NULL THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS jobs_select_authenticated ON public.jobs;
      CREATE POLICY jobs_select_authenticated ON public.jobs
        FOR SELECT TO authenticated
        USING (
          tenant_id = private.current_tenant_id()
          AND (
            private.can_view_schedule(auth.uid())
            OR private.can_view_site_foreman_job(auth.uid(), jobs.id)
            OR private.third_party_can_access_job(auth.uid(), jobs.id)
          )
        );

      DROP POLICY IF EXISTS shifts_select_authenticated ON public.shifts;
      CREATE POLICY shifts_select_authenticated ON public.shifts
        FOR SELECT TO authenticated
        USING (
          tenant_id = private.current_tenant_id()
          AND (
            private.can_view_schedule(auth.uid())
            OR (
              private.can_view_site_foreman_job(auth.uid(), shifts.job_id)
              AND shifts.date >= CURRENT_DATE
            )
            OR EXISTS (
              SELECT 1
              FROM public.profiles p
              JOIN public.staff s ON lower(s.email) = lower(p.email)
              WHERE p.id = auth.uid()
                AND p.status = 'active'
                AND s.id = shifts.worker_id
                AND s.tenant_id = shifts.tenant_id
                AND shifts.date >= CURRENT_DATE
            )
            OR private.third_party_owns_staff(auth.uid(), shifts.worker_id)
          )
        );

      DROP POLICY IF EXISTS staff_select_authenticated ON public.staff;
      CREATE POLICY staff_select_authenticated ON public.staff
        FOR SELECT TO authenticated
        USING (
          tenant_id = private.current_tenant_id()
          AND (
            private.can_view_schedule(auth.uid())
            OR private.can_view_site_foreman_staff(auth.uid(), staff.id)
            OR EXISTS (
              SELECT 1
              FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.status = 'active'
                AND lower(p.email) = lower(staff.email)
            )
            OR private.third_party_owns_staff(auth.uid(), staff.id)
          )
        );
    $policy$;
  ELSE
    EXECUTE $policy$
      DROP POLICY IF EXISTS jobs_select_authenticated ON public.jobs;
      CREATE POLICY jobs_select_authenticated ON public.jobs
        FOR SELECT TO authenticated
        USING (
          tenant_id = private.current_tenant_id()
          AND (
            private.can_view_schedule(auth.uid())
            OR private.can_view_site_foreman_job(auth.uid(), jobs.id)
          )
        );

      DROP POLICY IF EXISTS shifts_select_authenticated ON public.shifts;
      CREATE POLICY shifts_select_authenticated ON public.shifts
        FOR SELECT TO authenticated
        USING (
          tenant_id = private.current_tenant_id()
          AND (
            private.can_view_schedule(auth.uid())
            OR (
              private.can_view_site_foreman_job(auth.uid(), shifts.job_id)
              AND shifts.date >= CURRENT_DATE
            )
            OR EXISTS (
              SELECT 1
              FROM public.profiles p
              JOIN public.staff s ON lower(s.email) = lower(p.email)
              WHERE p.id = auth.uid()
                AND p.status = 'active'
                AND s.id = shifts.worker_id
                AND s.tenant_id = shifts.tenant_id
            )
          )
        );

      DROP POLICY IF EXISTS staff_select_authenticated ON public.staff;
      CREATE POLICY staff_select_authenticated ON public.staff
        FOR SELECT TO authenticated
        USING (
          tenant_id = private.current_tenant_id()
          AND (
            private.can_view_schedule(auth.uid())
            OR private.can_view_site_foreman_staff(auth.uid(), staff.id)
            OR EXISTS (
              SELECT 1
              FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.status = 'active'
                AND lower(p.email) = lower(staff.email)
            )
          )
        );
    $policy$;
  END IF;
END $$;

-- Some historical local migrations declared tenant_id on these tables without
-- a default, while the verified live schema does not have the column. Keep a
-- clean replay of the local history insertable without changing the live
-- schema shape.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'job_diary'
      AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.job_diary
      ALTER COLUMN tenant_id SET DEFAULT private.current_tenant_id();
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'job_attachments'
      AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.job_attachments
      ALTER COLUMN tenant_id SET DEFAULT private.current_tenant_id();
  END IF;
END $$;

-- Additive policies preserve existing management and third-party access while
-- granting only the assigned-site slice to a site foreman. The helpers enforce
-- the current tenant and the caller's own authenticated identity.
DROP POLICY IF EXISTS "Allow operatives to view and log their own job diary" ON public.job_diary;
DROP POLICY IF EXISTS "Allow operatives to write their own job diary" ON public.job_diary;
DROP POLICY IF EXISTS "Allow operatives to update their own job diary" ON public.job_diary;
DROP POLICY IF EXISTS "Allow operatives to upload their own job attachments" ON public.job_attachments;

-- Preserve the pre-existing operative/labourer surface. Foreman policies are
-- additive; introducing Foreman access must not revoke field-user access.
CREATE POLICY "Allow operatives to view and log their own job diary"
  ON public.job_diary FOR SELECT TO authenticated
  USING (
    tenant_id = private.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.shifts sh
      JOIN public.staff s ON s.id = sh.worker_id
      JOIN public.profiles p ON lower(p.email) = lower(s.email)
      WHERE p.id = auth.uid() AND sh.job_id = job_diary.job_id
    )
  );

CREATE POLICY "Allow operatives to write their own job diary"
  ON public.job_diary FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = private.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.shifts sh
      JOIN public.staff s ON s.id = sh.worker_id
      JOIN public.profiles p ON lower(p.email) = lower(s.email)
      WHERE p.id = auth.uid() AND sh.job_id = job_diary.job_id
    )
  );

CREATE POLICY "Allow operatives to update their own job diary"
  ON public.job_diary FOR UPDATE TO authenticated
  USING (
    tenant_id = private.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.shifts sh
      JOIN public.staff s ON s.id = sh.worker_id
      JOIN public.profiles p ON lower(p.email) = lower(s.email)
      WHERE p.id = auth.uid() AND sh.job_id = job_diary.job_id
    )
  )
  WITH CHECK (tenant_id = private.current_tenant_id());

CREATE POLICY "Allow operatives to upload their own job attachments"
  ON public.job_attachments FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = private.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.shifts sh
      JOIN public.staff s ON s.id = sh.worker_id
      JOIN public.profiles p ON lower(p.email) = lower(s.email)
      WHERE p.id = auth.uid() AND sh.job_id = job_attachments.job_id
    )
  );

DROP POLICY IF EXISTS jobs_select_site_foreman ON public.jobs;
CREATE POLICY jobs_select_site_foreman ON public.jobs
  FOR SELECT TO authenticated
  USING (private.can_view_site_foreman_job(auth.uid(), jobs.id));

DROP POLICY IF EXISTS shifts_select_site_foreman ON public.shifts;
CREATE POLICY shifts_select_site_foreman ON public.shifts
  FOR SELECT TO authenticated
  USING (private.can_view_site_foreman_job(auth.uid(), shifts.job_id));

DROP POLICY IF EXISTS staff_select_site_foreman ON public.staff;
CREATE POLICY staff_select_site_foreman ON public.staff
  FOR SELECT TO authenticated
  USING (private.can_view_site_foreman_staff(auth.uid(), staff.id));

DROP POLICY IF EXISTS job_diary_select_site_foreman ON public.job_diary;
CREATE POLICY job_diary_select_site_foreman ON public.job_diary
  FOR SELECT TO authenticated
  USING (private.can_view_site_foreman_job(auth.uid(), job_diary.job_id));

DROP POLICY IF EXISTS job_diary_insert_site_foreman ON public.job_diary;
CREATE POLICY job_diary_insert_site_foreman ON public.job_diary
  FOR INSERT TO authenticated
  WITH CHECK (private.can_write_site_foreman_job(auth.uid(), job_diary.job_id));

DROP POLICY IF EXISTS job_diary_update_site_foreman ON public.job_diary;
CREATE POLICY job_diary_update_site_foreman ON public.job_diary
  FOR UPDATE TO authenticated
  USING (private.can_write_site_foreman_job(auth.uid(), job_diary.job_id))
  WITH CHECK (private.can_write_site_foreman_job(auth.uid(), job_diary.job_id));

DROP POLICY IF EXISTS job_attachments_select_site_foreman ON public.job_attachments;
CREATE POLICY job_attachments_select_site_foreman ON public.job_attachments
  FOR SELECT TO authenticated
  USING (private.can_view_site_foreman_job(auth.uid(), job_attachments.job_id));

-- Replace the older assignment-only metadata policy with one that preserves
-- existing worker uploads but binds non-management metadata to the same job
-- path used by Storage. Service-role document submission is unaffected.
DROP POLICY IF EXISTS job_attachments_insert_ops ON public.job_attachments;
CREATE POLICY job_attachments_insert_ops ON public.job_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.jobs j
      WHERE j.id = job_attachments.job_id
        AND j.tenant_id = private.current_tenant_id()
    )
    AND (
      private.can_write_ops(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.shifts sh
        JOIN public.staff s ON s.id = sh.worker_id
        JOIN public.profiles p ON p.email = s.email
        WHERE p.id = auth.uid()
          AND p.status = 'active'
          AND sh.job_id = job_attachments.job_id
          AND sh.date >= CURRENT_DATE
          AND sh.tenant_id = private.current_tenant_id()
      )
    )
    AND (
      private.can_write_ops(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.jobs j
        WHERE j.id = job_attachments.job_id
          AND j.status <> 'completed'
          AND j.tenant_id = private.current_tenant_id()
      )
    )
    AND (
      job_attachments.file_url LIKE ('jobs/' || job_attachments.job_id || '/%')
      OR job_attachments.file_url LIKE ('%/job-attachments/jobs/' || job_attachments.job_id || '/%')
    )
  );

-- Remove the original broad local policy when this migration is replayed on a
-- clean database. The deployed project has a newer, already-scoped policy that
-- is deliberately left intact.
UPDATE storage.buckets
SET public = false
WHERE id = 'job-attachments';

DROP POLICY IF EXISTS "Allow read job-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read job-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload job-attachments" ON storage.objects;

DROP POLICY IF EXISTS "Allow ops delete job-attachments" ON storage.objects;
DROP POLICY IF EXISTS job_attachments_storage_ops_delete ON storage.objects;
CREATE POLICY job_attachments_storage_ops_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'job-attachments'
    AND private.can_write_ops(auth.uid())
    AND (storage.foldername(name))[1] = 'jobs'
    AND EXISTS (
      SELECT 1
      FROM public.jobs j
      WHERE j.id = (storage.foldername(name))[2]
        AND j.tenant_id = private.current_tenant_id()
    )
  );

-- Keep the size guard correct for both legacy public-style URLs and the new
-- direct object paths stored by the foreman uploader.
CREATE OR REPLACE FUNCTION public.sync_job_attachment_file_size()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_path text;
  v_real_size bigint;
BEGIN
  v_path := substring(NEW.file_url from '/job-attachments/(.*)$');
  IF v_path IS NULL AND NEW.file_url ~ '^(jobs|requests|third-party-media)/' THEN
    v_path := NEW.file_url;
  END IF;

  IF v_path IS NOT NULL THEN
    SELECT (metadata->>'size')::bigint
      INTO v_real_size
      FROM storage.objects
     WHERE bucket_id = 'job-attachments'
       AND name = v_path;
    IF v_real_size IS NOT NULL THEN
      NEW.file_size_bytes := v_real_size;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS job_attachments_storage_ops_read ON storage.objects;
CREATE POLICY job_attachments_storage_ops_read
  ON storage.objects FOR SELECT TO authenticated
  USING (
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

DROP POLICY IF EXISTS job_attachments_storage_ops_requests_read ON storage.objects;
CREATE POLICY job_attachments_storage_ops_requests_read
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'job-attachments'
    AND (storage.foldername(name))[1] = 'requests'
    AND private.can_write_ops(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.job_attachments a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE j.tenant_id = private.current_tenant_id()
        AND a.file_url LIKE ('%' || objects.name)
    )
  );

DROP POLICY IF EXISTS job_attachments_storage_foreman_read ON storage.objects;
CREATE POLICY job_attachments_storage_foreman_read
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'job-attachments'
    AND (storage.foldername(name))[1] = 'jobs'
    AND private.can_view_site_foreman_job(auth.uid(), (storage.foldername(name))[2])
  );

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

-- The workspace listens for diary and attachment changes so a foreman does
-- not need to refresh before seeing an operations update or new file count.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'job_diary'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_diary;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'job_attachments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_attachments;
  END IF;
END $$;

-- Certificate checks are management/compliance actions, not field-workspace
-- actions. The earlier certificate migration used "non-third-party" as its
-- definition of internal, which unintentionally included site foremen and
-- labourers. Replace that broad capability with the approved management set
-- and require the referenced staff record to belong to the same tenant.
CREATE OR REPLACE FUNCTION private.can_use_certificate_checker(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND status = 'active'
      AND role IN (
        'admin'::public.app_role,
        'director'::public.app_role,
        'logistics_coordinator'::public.app_role,
        'logistics_assistant'::public.app_role
      )
  );
$$;

REVOKE ALL ON FUNCTION private.can_use_certificate_checker(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_use_certificate_checker(uuid) TO authenticated;

DROP POLICY IF EXISTS staff_certificate_checks_select_internal ON public.staff_certificate_checks;
CREATE POLICY staff_certificate_checks_select_internal ON public.staff_certificate_checks
  FOR SELECT TO authenticated
  USING (
    tenant_id = private.current_tenant_id()
    AND private.can_use_certificate_checker(auth.uid())
  );

DROP POLICY IF EXISTS staff_certificate_checks_insert_internal ON public.staff_certificate_checks;
CREATE POLICY staff_certificate_checks_insert_internal ON public.staff_certificate_checks
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = private.current_tenant_id()
    AND checked_by = auth.uid()
    AND private.can_use_certificate_checker(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.staff s
      WHERE s.id = staff_certificate_checks.staff_id
        AND s.tenant_id = private.current_tenant_id()
    )
  );

DROP POLICY IF EXISTS certificate_check_evidence_select_internal ON storage.objects;
CREATE POLICY certificate_check_evidence_select_internal ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'certificate-check-evidence'
    AND private.can_use_certificate_checker(auth.uid())
    AND (storage.foldername(name))[1] = private.current_tenant_id()::text
  );

DROP POLICY IF EXISTS certificate_check_evidence_insert_internal ON storage.objects;
CREATE POLICY certificate_check_evidence_insert_internal ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'certificate-check-evidence'
    AND private.can_use_certificate_checker(auth.uid())
    AND (storage.foldername(name))[1] = private.current_tenant_id()::text
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
