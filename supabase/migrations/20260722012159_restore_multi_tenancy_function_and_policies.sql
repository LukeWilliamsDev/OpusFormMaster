-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260722012159
-- Remote migration name: restore_multi_tenancy_function_and_policies
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
