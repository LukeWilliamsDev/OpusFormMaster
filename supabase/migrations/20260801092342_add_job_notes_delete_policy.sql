-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260801092342
-- Remote migration name: add_job_notes_delete_policy
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
