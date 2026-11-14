-- Ledger marker for a migration already applied remotely.
-- Remote version: 20261001013039
-- Remote migration name: 20260929120000_reconciled_foreman_schema
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
