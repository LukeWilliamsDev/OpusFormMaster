-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260808093244
-- Remote migration name: grant_private_usage_to_auth_admin
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
