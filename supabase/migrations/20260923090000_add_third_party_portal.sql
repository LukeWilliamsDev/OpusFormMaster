-- Least-privilege third-party portal.
-- Third parties submit staff for internal approval, then receive access only
-- to their approved staff and jobs where those staff have active/future shifts.

CREATE TABLE IF NOT EXISTS public.third_party_staff_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approved_staff_id text REFERENCES public.staff(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  name text NOT NULL,
  role text NOT NULL,
  email text,
  phone text,
  postcode text,
  notes text,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.third_party_staff_access (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  third_party_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_id text NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  approved_by uuid NOT NULL REFERENCES auth.users(id),
  approved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (third_party_user_id, staff_id)
);

CREATE TABLE IF NOT EXISTS public.third_party_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id text NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  file_size_bytes bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_attachments
  ADD COLUMN IF NOT EXISTS uploaded_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.third_party_job_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id text NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION private.audit_third_party_content()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_email text;
DECLARE v_tenant uuid;
BEGIN
  SELECT email, tenant_id INTO v_email, v_tenant FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.audit_logs(user_id, user_email, action, target_type, target_id, details, tenant_id)
  VALUES (
    auth.uid(), v_email,
    CASE WHEN TG_TABLE_NAME = 'third_party_job_notes' THEN 'THIRD_PARTY_JOB_NOTE_ADDED' ELSE 'THIRD_PARTY_ATTACHMENT_RECORDED' END,
    TG_TABLE_NAME, NEW.id::text,
    jsonb_build_object('job_id', NEW.job_id, 'file_name', to_jsonb(NEW)->>'file_name'), v_tenant
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS audit_third_party_notes_trg ON public.third_party_job_notes;
CREATE TRIGGER audit_third_party_notes_trg AFTER INSERT ON public.third_party_job_notes
  FOR EACH ROW EXECUTE FUNCTION private.audit_third_party_content();
DROP TRIGGER IF EXISTS audit_third_party_attachments_trg ON public.third_party_attachments;
CREATE TRIGGER audit_third_party_attachments_trg AFTER INSERT ON public.third_party_attachments
  FOR EACH ROW EXECUTE FUNCTION private.audit_third_party_content();

CREATE INDEX IF NOT EXISTS third_party_staff_submissions_submitter_idx
  ON public.third_party_staff_submissions (submitted_by, status);
CREATE INDEX IF NOT EXISTS third_party_staff_access_staff_idx
  ON public.third_party_staff_access (staff_id);
CREATE INDEX IF NOT EXISTS third_party_attachments_job_owner_idx
  ON public.third_party_attachments (job_id, uploaded_by);
CREATE INDEX IF NOT EXISTS third_party_job_notes_job_owner_idx
  ON public.third_party_job_notes (job_id, author_id);

ALTER TABLE public.third_party_staff_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.third_party_staff_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.third_party_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.third_party_job_notes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.is_third_party(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'third_party'::public.app_role AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION private.third_party_can_access_job(_user_id uuid, _job_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.third_party_staff_access a
    JOIN public.shifts sh ON sh.worker_id = a.staff_id
    WHERE a.third_party_user_id = _user_id
      AND sh.job_id = _job_id
      AND sh.date >= current_date
  );
$$;

CREATE OR REPLACE FUNCTION private.third_party_owns_staff(_user_id uuid, _staff_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.third_party_staff_access
    WHERE third_party_user_id = _user_id AND staff_id = _staff_id
  );
$$;

CREATE OR REPLACE FUNCTION private.prevent_third_party_staff_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF private.is_third_party(auth.uid()) THEN
    IF NEW.id <> OLD.id OR NEW.tenant_id <> OLD.tenant_id OR NEW.is_archived <> false THEN
      RAISE EXCEPTION 'Third-party staff ownership and archive state are immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS prevent_third_party_staff_escalation_trg ON public.staff;
CREATE TRIGGER prevent_third_party_staff_escalation_trg
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION private.prevent_third_party_staff_escalation();

CREATE OR REPLACE FUNCTION public.log_third_party_action(
  p_action text, p_target_type text, p_target_id text, p_details jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT (private.is_third_party(auth.uid()) OR private.can_write_ops(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.audit_logs(user_id, user_email, action, target_type, target_id, details, tenant_id)
  SELECT auth.uid(), v_email, p_action, p_target_type, p_target_id, p_details,
         tenant_id FROM public.profiles WHERE id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_third_party_action(text, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_third_party_staff(
  p_name text, p_role text, p_email text, p_phone text, p_postcode text, p_notes text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT private.is_third_party(auth.uid()) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  INSERT INTO public.third_party_staff_submissions
    (tenant_id, submitted_by, name, role, email, phone, postcode, notes)
  SELECT tenant_id, auth.uid(), trim(p_name), trim(p_role), nullif(trim(p_email), ''),
         nullif(trim(p_phone), ''), nullif(trim(p_postcode), ''), nullif(trim(p_notes), '')
  FROM public.profiles WHERE id = auth.uid()
  RETURNING id INTO v_id;
  INSERT INTO public.audit_logs(user_id, user_email, action, target_type, target_id, details, tenant_id)
  SELECT auth.uid(), email, 'THIRD_PARTY_STAFF_SUBMITTED', 'third_party_staff_submissions', v_id::text,
         jsonb_build_object('name', trim(p_name), 'role', trim(p_role)), tenant_id
  FROM public.profiles WHERE id = auth.uid();
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_third_party_staff(text, text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_third_party_staff(
  p_submission_id uuid, p_approve boolean, p_review_notes text
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s public.third_party_staff_submissions%ROWTYPE;
DECLARE v_staff_id text;
BEGIN
  IF NOT private.can_write_ops(auth.uid()) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT * INTO s FROM public.third_party_staff_submissions WHERE id = p_submission_id FOR UPDATE;
  IF s.id IS NULL OR s.status <> 'pending' THEN RAISE EXCEPTION 'Submission is not pending'; END IF;
  IF NOT p_approve THEN
    UPDATE public.third_party_staff_submissions
      SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_notes = p_review_notes
      WHERE id = p_submission_id;
    INSERT INTO public.audit_logs(user_id, user_email, action, target_type, target_id, details, tenant_id)
    SELECT auth.uid(), email, 'THIRD_PARTY_STAFF_REJECTED', 'third_party_staff_submissions', p_submission_id::text,
           jsonb_build_object('review_notes', p_review_notes), tenant_id
    FROM public.profiles WHERE id = auth.uid();
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
         jsonb_build_object('staff_id', v_staff_id, 'review_notes', p_review_notes), tenant_id
  FROM public.profiles WHERE id = auth.uid();
  RETURN 'approved';
END;
$$;
GRANT EXECUTE ON FUNCTION public.review_third_party_staff(uuid, boolean, text) TO authenticated;

DROP POLICY IF EXISTS staff_select_authenticated ON public.staff;
CREATE POLICY staff_select_authenticated ON public.staff FOR SELECT TO authenticated USING (
  tenant_id = private.current_tenant_id() AND (
    private.can_view_schedule(auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.email = staff.email)
    OR private.third_party_owns_staff(auth.uid(), id)
  )
);

DROP POLICY IF EXISTS jobs_select_authenticated ON public.jobs;
CREATE POLICY jobs_select_authenticated ON public.jobs FOR SELECT TO authenticated USING (
  tenant_id = private.current_tenant_id() AND (
    private.can_view_schedule(auth.uid())
    OR private.third_party_can_access_job(auth.uid(), id)
    OR EXISTS (
      SELECT 1 FROM public.shifts sh JOIN public.staff s ON s.id = sh.worker_id
      JOIN public.profiles p ON p.email = s.email
      WHERE p.id = auth.uid() AND sh.job_id = jobs.id AND sh.tenant_id = jobs.tenant_id
    )
  )
);

DROP POLICY IF EXISTS shifts_select_authenticated ON public.shifts;
CREATE POLICY shifts_select_authenticated ON public.shifts FOR SELECT TO authenticated USING (
  tenant_id = private.current_tenant_id() AND (
    private.can_view_schedule(auth.uid())
    OR private.third_party_owns_staff(auth.uid(), worker_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p JOIN public.staff s ON s.email = p.email
      WHERE p.id = auth.uid() AND s.id = shifts.worker_id
    )
  )
);

CREATE POLICY third_party_submissions_select ON public.third_party_staff_submissions
  FOR SELECT TO authenticated USING (
    submitted_by = auth.uid() OR private.can_write_ops(auth.uid())
  );
CREATE POLICY third_party_access_select ON public.third_party_staff_access
  FOR SELECT TO authenticated USING (
    third_party_user_id = auth.uid() OR private.can_write_ops(auth.uid())
  );
CREATE POLICY third_party_staff_update ON public.staff
  FOR UPDATE TO authenticated USING (
    private.third_party_owns_staff(auth.uid(), id) AND tenant_id = private.current_tenant_id()
  ) WITH CHECK (
    private.third_party_owns_staff(auth.uid(), id)
    AND tenant_id = private.current_tenant_id()
    AND is_archived = false
  );

CREATE POLICY third_party_notes_select ON public.third_party_job_notes
  FOR SELECT TO authenticated USING (
    (author_id = auth.uid() AND private.third_party_can_access_job(auth.uid(), job_id))
    OR private.can_write_ops(auth.uid())
  );
CREATE POLICY third_party_notes_insert ON public.third_party_job_notes
  FOR INSERT TO authenticated WITH CHECK (
    author_id = auth.uid() AND private.third_party_can_access_job(auth.uid(), job_id)
  );

CREATE POLICY third_party_attachments_select ON public.third_party_attachments
  FOR SELECT TO authenticated USING (
    (uploaded_by = auth.uid() AND private.third_party_can_access_job(auth.uid(), job_id))
    OR private.can_write_ops(auth.uid())
  );
CREATE POLICY third_party_attachments_insert ON public.third_party_attachments
  FOR INSERT TO authenticated WITH CHECK (
    uploaded_by = auth.uid() AND private.third_party_can_access_job(auth.uid(), job_id)
  );

DROP POLICY IF EXISTS job_attachments_select_ops ON public.job_attachments;
CREATE POLICY job_attachments_select_ops ON public.job_attachments FOR SELECT TO authenticated USING (
  private.can_write_ops(auth.uid()) OR
  (private.is_third_party(auth.uid()) AND uploaded_by_user_id = auth.uid() AND type IN ('image_before', 'image_after'))
);
DROP POLICY IF EXISTS job_attachments_insert_ops ON public.job_attachments;
CREATE POLICY job_attachments_insert_ops ON public.job_attachments FOR INSERT TO authenticated WITH CHECK (
  private.can_write_ops(auth.uid()) OR
  (private.is_third_party(auth.uid()) AND uploaded_by_user_id = auth.uid()
   AND type IN ('image_before', 'image_after')
   AND private.third_party_can_access_job(auth.uid(), job_id))
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('third-party-attachments', 'third-party-attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS third_party_attachments_storage_select ON storage.objects;
CREATE POLICY third_party_attachments_storage_select ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'third-party-attachments' AND (
    private.can_write_ops(auth.uid()) OR name LIKE (auth.uid()::text || '/%')
  )
);
DROP POLICY IF EXISTS third_party_attachments_storage_insert ON storage.objects;
CREATE POLICY third_party_attachments_storage_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'third-party-attachments'
  AND name LIKE (auth.uid()::text || '/%')
  AND private.third_party_can_access_job(auth.uid(), (storage.foldername(name))[2])
);

-- Existing internal job media remains available to non-third-party users. A
-- third party can only read or create its own owner-scoped media path.
DROP POLICY IF EXISTS "Allow authenticated read job-attachments" ON storage.objects;
CREATE POLICY "Allow authenticated read job-attachments" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'job-attachments' AND (
      NOT private.is_third_party(auth.uid())
      OR (
        (storage.foldername(name))[1] = 'third-party-media'
        AND (storage.foldername(name))[3] = auth.uid()::text
      )
    )
  );
DROP POLICY IF EXISTS "Allow authenticated upload job-attachments" ON storage.objects;
CREATE POLICY "Allow authenticated upload job-attachments" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'job-attachments' AND (
      NOT private.is_third_party(auth.uid())
      OR (
        (storage.foldername(name))[1] = 'third-party-media'
        AND (storage.foldername(name))[3] = auth.uid()::text
        AND private.third_party_can_access_job(auth.uid(), (storage.foldername(name))[2])
      )
    )
  );
