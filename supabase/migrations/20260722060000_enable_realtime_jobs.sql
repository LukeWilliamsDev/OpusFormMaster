-- Enable Realtime on jobs so the job ledger reflects changes made outside
-- this session's own upsert loop (e.g. direct DB edits, another tenant
-- session) immediately instead of only on next login.
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
