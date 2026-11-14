-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260715124609
-- Remote migration name: 20260715135000_add_multi_tenancy
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
