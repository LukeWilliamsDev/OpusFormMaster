-- Keep third-party submissions, ownership and job content inside the caller's
-- tenant. This is a corrective follow-up to the initial portal migration.

CREATE OR REPLACE FUNCTION private.third_party_can_access_job(_user_id uuid, _job_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.third_party_staff_access a
    JOIN public.shifts sh ON sh.worker_id = a.staff_id
    WHERE a.third_party_user_id = _user_id
      AND a.tenant_id = private.current_tenant_id()
      AND sh.job_id = _job_id
      AND sh.tenant_id = a.tenant_id
      AND sh.date >= current_date
  );
$$;

CREATE OR REPLACE FUNCTION private.third_party_owns_staff(_user_id uuid, _staff_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.third_party_staff_access
    WHERE third_party_user_id = _user_id
      AND staff_id = _staff_id
      AND tenant_id = private.current_tenant_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.review_third_party_staff(
  p_submission_id uuid, p_approve boolean, p_review_notes text
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s public.third_party_staff_submissions%ROWTYPE;
DECLARE v_staff_id text;
BEGIN
  IF NOT private.can_write_ops(auth.uid()) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT * INTO s FROM public.third_party_staff_submissions
    WHERE id = p_submission_id AND tenant_id = private.current_tenant_id() FOR UPDATE;
  IF s.id IS NULL OR s.status <> 'pending' THEN RAISE EXCEPTION 'Submission is not pending'; END IF;
  IF NOT p_approve THEN
    UPDATE public.third_party_staff_submissions
      SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_notes = p_review_notes
      WHERE id = p_submission_id;
    INSERT INTO public.audit_logs(user_id, user_email, action, target_type, target_id, details, tenant_id)
    SELECT auth.uid(), email, 'THIRD_PARTY_STAFF_REJECTED', 'third_party_staff_submissions', p_submission_id::text,
           jsonb_build_object('review_notes', p_review_notes), tenant_id FROM public.profiles WHERE id = auth.uid();
    RETURN 'rejected';
  END IF;
  v_staff_id := gen_random_uuid()::text;
  INSERT INTO public.staff(id, tenant_id, name, role, email, phone, postcode, is_archived, tickets, uploaded_certificates)
    VALUES (v_staff_id, s.tenant_id, s.name, s.role, s.email, s.phone, s.postcode, false, '[]'::jsonb, '[]'::jsonb);
  INSERT INTO public.third_party_staff_access(tenant_id, third_party_user_id, staff_id, approved_by)
    VALUES (s.tenant_id, s.submitted_by, v_staff_id, auth.uid());
  UPDATE public.third_party_staff_submissions
    SET status = 'approved', approved_staff_id = v_staff_id, reviewed_by = auth.uid(), reviewed_at = now(), review_notes = p_review_notes
    WHERE id = p_submission_id;
  INSERT INTO public.audit_logs(user_id, user_email, action, target_type, target_id, details, tenant_id)
    SELECT auth.uid(), email, 'THIRD_PARTY_STAFF_APPROVED', 'third_party_staff_submissions', p_submission_id::text,
           jsonb_build_object('staff_id', v_staff_id, 'review_notes', p_review_notes), tenant_id FROM public.profiles WHERE id = auth.uid();
  RETURN 'approved';
END;
$$;

DROP POLICY IF EXISTS third_party_submissions_select ON public.third_party_staff_submissions;
CREATE POLICY third_party_submissions_select ON public.third_party_staff_submissions
  FOR SELECT TO authenticated USING (
    tenant_id = private.current_tenant_id()
    AND (submitted_by = auth.uid() OR private.can_write_ops(auth.uid()))
  );
DROP POLICY IF EXISTS third_party_access_select ON public.third_party_staff_access;
CREATE POLICY third_party_access_select ON public.third_party_staff_access
  FOR SELECT TO authenticated USING (
    tenant_id = private.current_tenant_id()
    AND (third_party_user_id = auth.uid() OR private.can_write_ops(auth.uid()))
  );
DROP POLICY IF EXISTS third_party_notes_select ON public.third_party_job_notes;
CREATE POLICY third_party_notes_select ON public.third_party_job_notes
  FOR SELECT TO authenticated USING (
    tenant_id = private.current_tenant_id()
    AND ((author_id = auth.uid() AND private.third_party_can_access_job(auth.uid(), job_id))
      OR private.can_write_ops(auth.uid()))
  );
DROP POLICY IF EXISTS third_party_notes_insert ON public.third_party_job_notes;
CREATE POLICY third_party_notes_insert ON public.third_party_job_notes
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id = private.current_tenant_id()
    AND author_id = auth.uid() AND private.third_party_can_access_job(auth.uid(), job_id)
  );
DROP POLICY IF EXISTS third_party_attachments_select ON public.third_party_attachments;
CREATE POLICY third_party_attachments_select ON public.third_party_attachments
  FOR SELECT TO authenticated USING (
    tenant_id = private.current_tenant_id()
    AND ((uploaded_by = auth.uid() AND private.third_party_can_access_job(auth.uid(), job_id))
      OR private.can_write_ops(auth.uid()))
  );
DROP POLICY IF EXISTS third_party_attachments_insert ON public.third_party_attachments;
CREATE POLICY third_party_attachments_insert ON public.third_party_attachments
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id = private.current_tenant_id()
    AND uploaded_by = auth.uid() AND private.third_party_can_access_job(auth.uid(), job_id)
  );
