-- Keep commercial documents outside the field-user information boundary.
-- Foremen and third parties may view site photos only; operations roles retain
-- their existing schedule/document access.

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
        AND job_attachments.type IN ('image_before', 'image_after')
        AND private.third_party_can_access_job(auth.uid(), job_attachments.job_id)
      )
      OR (
        private.can_view_assigned_job(auth.uid(), job_attachments.job_id)
        AND job_attachments.type IN ('image_before', 'image_after')
      )
    )
  );

-- Storage paths do not carry attachment type, so require a matching image
-- metadata row before an assigned field user or third party can read an object.
-- Operations request access remains unchanged.
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
                AND a.type IN ('image_before', 'image_after')
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
                AND a.type IN ('image_before', 'image_after')
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
