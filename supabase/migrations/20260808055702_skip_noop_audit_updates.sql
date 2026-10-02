-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260808055702
-- Remote migration name: skip_noop_audit_updates
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
