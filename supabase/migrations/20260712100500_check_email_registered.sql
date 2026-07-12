CREATE OR REPLACE FUNCTION public.check_email_registered(_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE email = _email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_registered(text) TO anon, authenticated;
