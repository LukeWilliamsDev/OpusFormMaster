-- Internal certificate verification records. The official CSCS checker remains
-- the source of truth; this table records what Opus Form checked and when.

CREATE TABLE IF NOT EXISTS public.staff_certificate_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id text NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  checked_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  certificate_type text NOT NULL DEFAULT 'CSCS',
  certificate_number text NOT NULL,
  result text NOT NULL CHECK (result IN ('verified', 'not_found', 'expired', 'mismatch', 'unable_to_verify')),
  expiry_date date,
  notes text,
  evidence_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_certificate_checks_staff_idx
  ON public.staff_certificate_checks (tenant_id, staff_id, created_at DESC);

CREATE OR REPLACE FUNCTION private.is_internal_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
      AND status = 'active'
      AND role <> 'third_party'::public.app_role
  );
$$;
GRANT EXECUTE ON FUNCTION private.is_internal_user(uuid) TO authenticated;

ALTER TABLE public.staff_certificate_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_certificate_checks_select_internal ON public.staff_certificate_checks
  FOR SELECT TO authenticated USING (
    tenant_id = private.current_tenant_id() AND private.is_internal_user(auth.uid())
  );

CREATE POLICY staff_certificate_checks_insert_internal ON public.staff_certificate_checks
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id = private.current_tenant_id()
    AND checked_by = auth.uid()
    AND private.is_internal_user(auth.uid())
  );

CREATE OR REPLACE FUNCTION private.audit_staff_certificate_check()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_email text;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.audit_logs(user_id, user_email, action, target_type, target_id, details, tenant_id)
  VALUES (
    auth.uid(), v_email, 'STAFF_CERTIFICATE_CHECK_RECORDED', 'staff', NEW.staff_id,
    jsonb_build_object(
      'certificate_type', NEW.certificate_type,
      'certificate_number', NEW.certificate_number,
      'result', NEW.result,
      'expiry_date', NEW.expiry_date,
      'evidence_path', NEW.evidence_path
    ), NEW.tenant_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_staff_certificate_check_trg ON public.staff_certificate_checks;
CREATE TRIGGER audit_staff_certificate_check_trg
  AFTER INSERT ON public.staff_certificate_checks
  FOR EACH ROW EXECUTE FUNCTION private.audit_staff_certificate_check();

INSERT INTO storage.buckets (id, name, public)
VALUES ('certificate-check-evidence', 'certificate-check-evidence', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS certificate_check_evidence_select_internal ON storage.objects;
CREATE POLICY certificate_check_evidence_select_internal ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'certificate-check-evidence'
    AND private.is_internal_user(auth.uid())
    AND (storage.foldername(name))[1] = private.current_tenant_id()::text
  );

DROP POLICY IF EXISTS certificate_check_evidence_insert_internal ON storage.objects;
CREATE POLICY certificate_check_evidence_insert_internal ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'certificate-check-evidence'
    AND private.is_internal_user(auth.uid())
    AND (storage.foldername(name))[1] = private.current_tenant_id()::text
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
