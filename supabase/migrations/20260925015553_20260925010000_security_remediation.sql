-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260925015553
-- Remote migration name: 20260925010000_security_remediation
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
