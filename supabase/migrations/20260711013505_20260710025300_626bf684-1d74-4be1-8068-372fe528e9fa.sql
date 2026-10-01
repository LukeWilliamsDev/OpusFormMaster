-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260711013505
-- Remote migration name: 20260710025300_626bf684-1d74-4be1-8068-372fe528e9fa
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
