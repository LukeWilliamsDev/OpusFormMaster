-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260925015815
-- Remote migration name: 20260925020000_fix_storage_policy_outer_reference
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
