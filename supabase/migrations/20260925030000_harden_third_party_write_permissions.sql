-- Keep certificate renewal uploads usable for owned approved staff while
-- preventing third parties from writing to completed site records.

DROP POLICY IF EXISTS third_party_staff_documents_insert ON public.third_party_staff_documents;
CREATE POLICY third_party_staff_documents_insert ON public.third_party_staff_documents
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id = private.current_tenant_id()
    AND uploaded_by = auth.uid()
    AND (
      (
        staff_id IS NULL
        AND private.third_party_owns_submission(auth.uid(), submission_id)
      )
      OR (
        staff_id IS NOT NULL
        AND private.third_party_owns_staff(auth.uid(), staff_id)
        AND EXISTS (
          SELECT 1
          FROM public.third_party_staff_submissions submission
          WHERE submission.id = submission_id
            AND submission.approved_staff_id = staff_id
            AND submission.submitted_by = auth.uid()
            AND submission.tenant_id = private.current_tenant_id()
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION private.third_party_can_write_job(_user_id uuid, _job_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = _job_id
      AND j.tenant_id = private.current_tenant_id()
      AND lower(j.status) NOT IN ('completed', 'complete', 'closed')
      AND private.third_party_can_access_job(_user_id, _job_id)
  );
$$;

DROP POLICY IF EXISTS third_party_notes_insert ON public.third_party_job_notes;
CREATE POLICY third_party_notes_insert ON public.third_party_job_notes
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id = private.current_tenant_id()
    AND author_id = auth.uid()
    AND private.third_party_can_write_job(auth.uid(), job_id)
  );

DROP POLICY IF EXISTS third_party_attachments_insert ON public.third_party_attachments;
CREATE POLICY third_party_attachments_insert ON public.third_party_attachments
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id = private.current_tenant_id()
    AND uploaded_by = auth.uid()
    AND private.third_party_can_write_job(auth.uid(), job_id)
  );
