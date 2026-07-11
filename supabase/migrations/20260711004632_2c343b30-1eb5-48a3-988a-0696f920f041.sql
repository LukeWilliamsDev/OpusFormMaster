
DROP TRIGGER IF EXISTS profiles_prevent_role_self_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_role_self_escalation
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_self_escalation();
