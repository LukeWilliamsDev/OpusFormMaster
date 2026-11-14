-- Extend the field-user boundary without reopening commercial documents.
-- Operations chooses document audiences; field users may add image attachments
-- (including on completed sites) but cannot delete or share attachments.

ALTER TABLE public.job_attachments
  ADD COLUMN IF NOT EXISTS foreman_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS third_party_visible boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION private.can_write_site_foreman_photo(_user_id uuid, _job_id text)
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
    WHERE _user_id = auth.uid()
      AND p.id = _user_id
      AND p.status = 'active'
      AND p.role = 'site_foreman'::public.app_role
      AND own_shift.job_id = _job_id
      AND (
        own_shift.date >= CURRENT_DATE
        OR private.is_completed_job_status(j.status)
      )
  );
$$;

REVOKE ALL ON FUNCTION private.can_write_site_foreman_photo(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_write_site_foreman_photo(uuid, text) TO authenticated;

DROP POLICY IF EXISTS job_attachments_select_ops ON public.job_attachments;
CREATE POLICY job_attachments_select_ops ON public.job_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.jobs j
      WHERE j.id = job_attachments.job_id
        AND j.tenant_id = private.current_tenant_id()
    )
    AND (
      private.can_view_schedule(auth.uid())
      OR (
        private.is_third_party(auth.uid())
        AND (
          job_attachments.type IN ('image_before', 'image_after')
          OR (job_attachments.type = 'document' AND job_attachments.third_party_visible)
        )
        AND private.third_party_can_access_job(auth.uid(), job_attachments.job_id)
      )
      OR (
        private.can_view_assigned_job(auth.uid(), job_attachments.job_id)
        AND (
          job_attachments.type IN ('image_before', 'image_after')
          OR (job_attachments.type = 'document' AND job_attachments.foreman_visible)
        )
      )
    )
  );

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
      OR (
        private.can_write_site_foreman_photo(auth.uid(), job_attachments.job_id)
        AND job_attachments.type IN ('image_before', 'image_after')
      )
    )
    AND (
      private.can_write_ops(auth.uid())
      OR job_attachments.file_url LIKE ('jobs/' || job_attachments.job_id || '/%')
      OR job_attachments.file_url LIKE ('%/job-attachments/jobs/' || job_attachments.job_id || '/%')
    )
  );

-- Storage object names do not carry audience flags, so require a matching
-- metadata row for every field-user image or explicitly shared document.
DROP POLICY IF EXISTS job_attachments_storage_read ON storage.objects;
CREATE POLICY job_attachments_storage_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'job-attachments'
    AND (
      (
        (storage.foldername(storage.objects.name))[1] = 'jobs'
        AND EXISTS (
          SELECT 1
          FROM public.jobs j
          WHERE j.id = (storage.foldername(storage.objects.name))[2]
            AND j.tenant_id = private.current_tenant_id()
        )
        AND (
          private.can_view_schedule(auth.uid())
          OR (
            private.can_view_assigned_job(auth.uid(), (storage.foldername(storage.objects.name))[2])
            AND EXISTS (
              SELECT 1
              FROM public.job_attachments a
              WHERE a.job_id = (storage.foldername(storage.objects.name))[2]
                AND (
                  a.type IN ('image_before', 'image_after')
                  OR (a.type = 'document' AND a.foreman_visible)
                )
                AND (
                  a.file_url = storage.objects.name
                  OR a.file_url LIKE '%' || storage.objects.name
                )
            )
          )
          OR (
            private.is_third_party(auth.uid())
            AND private.third_party_can_access_job(auth.uid(), (storage.foldername(storage.objects.name))[2])
            AND EXISTS (
              SELECT 1
              FROM public.job_attachments a
              WHERE a.job_id = (storage.foldername(storage.objects.name))[2]
                AND (
                  a.type IN ('image_before', 'image_after')
                  OR (a.type = 'document' AND a.third_party_visible)
                )
                AND (
                  a.file_url = storage.objects.name
                  OR a.file_url LIKE '%' || storage.objects.name
                )
            )
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
        (storage.foldername(storage.objects.name))[1] = 'third-party-media'
        AND private.is_third_party(auth.uid())
        AND private.third_party_can_access_job(auth.uid(), (storage.foldername(storage.objects.name))[2])
      )
    )
  );

DROP POLICY IF EXISTS job_attachments_storage_foreman_write ON storage.objects;
CREATE POLICY job_attachments_storage_foreman_write
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-attachments'
    AND (storage.foldername(name))[1] = 'jobs'
    AND private.can_write_site_foreman_photo(auth.uid(), (storage.foldername(name))[2])
  );

DROP POLICY IF EXISTS job_attachments_storage_foreman_orphan_delete ON storage.objects;
CREATE POLICY job_attachments_storage_foreman_orphan_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'job-attachments'
    AND (storage.foldername(name))[1] = 'jobs'
    AND private.can_write_site_foreman_photo(auth.uid(), (storage.foldername(name))[2])
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
