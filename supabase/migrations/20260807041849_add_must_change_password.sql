-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260807041849
-- Remote migration name: add_must_change_password
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
