
-- Create a helper view to list users with their roles and last accessed times
CREATE OR REPLACE VIEW public.user_directory AS
SELECT 
  p.id,
  p.email,
  p.role,
  u.last_sign_in_at AS last_accessed
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id;

GRANT SELECT ON public.user_directory TO authenticated;
