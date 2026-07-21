-- Enable Realtime on shifts for the same reason jobs is subscribed: the
-- roster should reflect changes made outside this session's own upsert loop
-- immediately instead of only on next login.
ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
