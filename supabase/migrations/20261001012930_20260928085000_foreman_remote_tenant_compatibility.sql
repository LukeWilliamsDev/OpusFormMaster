-- Ledger marker for a migration already applied remotely.
-- Remote version: 20261001012930
-- Remote migration name: 20260928085000_foreman_remote_tenant_compatibility
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
