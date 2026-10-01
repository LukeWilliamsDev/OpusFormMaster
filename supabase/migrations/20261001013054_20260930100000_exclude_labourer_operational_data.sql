-- Ledger marker for a migration already applied remotely.
-- Remote version: 20261001013054
-- Remote migration name: 20260930100000_exclude_labourer_operational_data
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
