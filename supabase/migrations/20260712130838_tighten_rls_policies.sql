-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260712130838
-- Remote migration name: tighten_rls_policies
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
