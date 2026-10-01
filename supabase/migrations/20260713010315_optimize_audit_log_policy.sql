-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260713010315
-- Remote migration name: optimize_audit_log_policy
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
