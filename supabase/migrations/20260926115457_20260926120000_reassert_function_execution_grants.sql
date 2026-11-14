-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260926115457
-- Remote migration name: 20260926120000_reassert_function_execution_grants
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
