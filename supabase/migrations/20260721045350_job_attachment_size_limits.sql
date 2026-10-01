-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260721045350
-- Remote migration name: job_attachment_size_limits
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
