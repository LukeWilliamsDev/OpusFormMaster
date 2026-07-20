-- Enable Realtime on staff so the compliance tab reflects anonymous
-- credential-portal submissions live instead of only on next login.
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff;
