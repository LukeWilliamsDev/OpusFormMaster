-- Certificate Checker is an internal management tool. Field roles must not
-- reach it through direct Supabase calls even though they have no portal route.
-- Logistics assistants retain the explicitly supported checker capability.
CREATE OR REPLACE FUNCTION private.is_internal_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND status = 'active'
      AND role IN (
        'admin'::public.app_role,
        'director'::public.app_role,
        'logistics_coordinator'::public.app_role,
        'logistics_assistant'::public.app_role
      )
  );
$$;

REVOKE ALL ON FUNCTION private.is_internal_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_internal_user(uuid) TO authenticated;
