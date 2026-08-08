-- auth.admin.deleteUser (GoTrue admin API) fails with "Database error loading
-- user" on this project even though a raw SQL DELETE FROM auth.users works
-- fine (verified via rollback-only diagnostic) -- likely schema drift in
-- auth.users from earlier migrations. Bypass GoTrue's broken delete path
-- with a direct SQL delete, restricted to service_role (called only from the
-- admin-manage-user edge function, which already gates on the admin email).
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM auth.users WHERE id = target_id;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO service_role;
