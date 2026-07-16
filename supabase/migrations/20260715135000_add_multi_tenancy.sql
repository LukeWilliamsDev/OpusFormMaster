-- Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    stripe_customer_id TEXT,
    lemon_squeezy_customer_id TEXT
);

-- Enable RLS on tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Add tenant_id to existing tables
ALTER TABLE public.profiles ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.staff ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.jobs ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.shifts ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.quotes ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.audit_logs ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.document_requests ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Create a default tenant for existing data (to avoid breaking current single-tenant app state)
DO $$
DECLARE
  default_tenant_id UUID;
BEGIN
  INSERT INTO public.tenants (name, slug) 
  VALUES ('Opus Form Default', 'opus-form-default')
  RETURNING id INTO default_tenant_id;

  UPDATE public.profiles SET tenant_id = default_tenant_id;
  UPDATE public.staff SET tenant_id = default_tenant_id;
  UPDATE public.jobs SET tenant_id = default_tenant_id;
  UPDATE public.shifts SET tenant_id = default_tenant_id;
  UPDATE public.quotes SET tenant_id = default_tenant_id;
  UPDATE public.audit_logs SET tenant_id = default_tenant_id;
  UPDATE public.document_requests SET tenant_id = default_tenant_id;
END $$;

-- Now make tenant_id NOT NULL for future inserts
ALTER TABLE public.profiles ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.staff ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.shifts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.quotes ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.audit_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.document_requests ALTER COLUMN tenant_id SET NOT NULL;

-- Tenant Policy: Users can see their own tenant
CREATE POLICY "Users can view their own tenant" ON public.tenants
    FOR SELECT TO authenticated
    USING (id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Helper: caller's own tenant_id (SECURITY DEFINER to avoid recursive RLS on profiles)
CREATE OR REPLACE FUNCTION private.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION private.current_tenant_id() TO authenticated;

-- Re-scope existing RLS policies to the caller's tenant so no admin/dispatcher/operative
-- can read or write another tenant's profiles/staff/jobs/shifts/quotes/audit_logs data.

-- profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) AND tenant_id = private.current_tenant_id());

-- staff
DROP POLICY IF EXISTS staff_select_authenticated ON public.staff;
CREATE POLICY staff_select_authenticated ON public.staff
  FOR SELECT TO authenticated
  USING (
    tenant_id = private.current_tenant_id() AND (
      private.can_write_ops(auth.uid()) OR
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.email = staff.email
      )
    )
  );

DROP POLICY IF EXISTS staff_insert_ops ON public.staff;
CREATE POLICY staff_insert_ops ON public.staff
  FOR INSERT TO authenticated
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS staff_update_ops ON public.staff;
CREATE POLICY staff_update_ops ON public.staff
  FOR UPDATE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS staff_delete_ops ON public.staff;
CREATE POLICY staff_delete_ops ON public.staff
  FOR DELETE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

-- jobs
DROP POLICY IF EXISTS jobs_select_authenticated ON public.jobs;
CREATE POLICY jobs_select_authenticated ON public.jobs
  FOR SELECT TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS jobs_insert_ops ON public.jobs;
CREATE POLICY jobs_insert_ops ON public.jobs
  FOR INSERT TO authenticated
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS jobs_update_ops ON public.jobs;
CREATE POLICY jobs_update_ops ON public.jobs
  FOR UPDATE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS jobs_delete_ops ON public.jobs;
CREATE POLICY jobs_delete_ops ON public.jobs
  FOR DELETE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

-- shifts
DROP POLICY IF EXISTS shifts_select_authenticated ON public.shifts;
CREATE POLICY shifts_select_authenticated ON public.shifts
  FOR SELECT TO authenticated
  USING (
    tenant_id = private.current_tenant_id() AND (
      private.can_write_ops(auth.uid()) OR
      EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.staff s ON s.email = p.email
        WHERE p.id = auth.uid() AND s.id = shifts.worker_id
      )
    )
  );

DROP POLICY IF EXISTS shifts_insert_ops ON public.shifts;
CREATE POLICY shifts_insert_ops ON public.shifts
  FOR INSERT TO authenticated
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS shifts_update_ops ON public.shifts;
CREATE POLICY shifts_update_ops ON public.shifts
  FOR UPDATE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS shifts_delete_ops ON public.shifts;
CREATE POLICY shifts_delete_ops ON public.shifts
  FOR DELETE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

-- quotes
DROP POLICY IF EXISTS quotes_select_authenticated ON public.quotes;
CREATE POLICY quotes_select_authenticated ON public.quotes
  FOR SELECT TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS quotes_insert_ops ON public.quotes;
CREATE POLICY quotes_insert_ops ON public.quotes
  FOR INSERT TO authenticated
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS quotes_update_ops ON public.quotes;
CREATE POLICY quotes_update_ops ON public.quotes
  FOR UPDATE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS quotes_delete_ops ON public.quotes;
CREATE POLICY quotes_delete_ops ON public.quotes
  FOR DELETE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

-- audit_logs (read access stays admin-email-restricted per security skill; add tenant scoping)
DROP POLICY IF EXISTS "Allow read to admin email only" ON public.audit_logs;
CREATE POLICY "Allow read to admin email only" ON public.audit_logs
    FOR SELECT
    USING (
        tenant_id = private.current_tenant_id() AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.email = 'admin@opusform.co.uk'
              AND profiles.role = 'admin'
        )
    );

-- document_requests (admin/dispatcher access only; anonymous link-based policies are unaffected)
DROP POLICY IF EXISTS select_all_auth ON public.document_requests;
CREATE POLICY select_all_auth ON public.document_requests
  FOR SELECT TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS admin_all ON public.document_requests;
CREATE POLICY admin_all ON public.document_requests
  FOR ALL TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());
