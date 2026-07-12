DROP TABLE IF EXISTS public.shifts CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TABLE IF EXISTS public.workers CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_role_self_escalation() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;