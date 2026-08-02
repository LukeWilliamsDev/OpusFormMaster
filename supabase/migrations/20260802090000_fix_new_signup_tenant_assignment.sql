-- The multi-tenancy migration (20260715135000_add_multi_tenancy.sql) made
-- profiles.tenant_id NOT NULL but never updated handle_new_user() to set it.
-- Every signup since then has been inserting a profiles row with no
-- tenant_id, which violates the NOT NULL constraint and fails the trigger
-- (and, since the trigger runs inside the auth.users insert transaction,
-- fails the signup itself).
--
-- Each new signup now gets its own tenant, since this app is multi-tenant
-- SaaS and signups are separate companies that should not share data.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  INSERT INTO public.tenants (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'tenant-' || replace(NEW.id::text, '-', '')
  )
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.profiles (id, email, full_name, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    new_tenant_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
