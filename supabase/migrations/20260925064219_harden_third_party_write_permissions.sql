-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260925064219
-- Remote migration name: harden_third_party_write_permissions
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
