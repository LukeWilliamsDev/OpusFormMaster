-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260801083543
-- Remote migration name: drop_untracked_audit_logs_policy
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
