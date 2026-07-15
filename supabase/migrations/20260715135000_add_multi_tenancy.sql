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
