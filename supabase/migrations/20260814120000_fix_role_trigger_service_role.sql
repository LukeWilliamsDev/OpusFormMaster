-- Fix: prevent_role_self_escalation_trg rejected role writes from
-- admin-manage-user's service-role client because auth.uid() is null
-- for a service-role JWT. The edge function already gates the caller
-- (ADMIN_EMAIL check) before writing, so let a service-role caller
-- through and keep the admin-only check for authenticated callers.
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.role() <> 'service_role' AND NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'Only administrators can change roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
