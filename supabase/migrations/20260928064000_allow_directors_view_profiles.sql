-- Directors may administer accounts through the trusted user-management
-- functions and must be able to see the same tenant user list as admins.
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins and directors can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    (
      private.has_role(auth.uid(), 'admin'::public.app_role)
      OR private.has_role(auth.uid(), 'director'::public.app_role)
    )
    AND tenant_id = private.current_tenant_id()
  );
