-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260720212941
-- Remote migration name: enable_realtime_staff
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
