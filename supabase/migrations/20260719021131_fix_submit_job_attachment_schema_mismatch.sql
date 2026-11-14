-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260719021131
-- Remote migration name: fix_submit_job_attachment_schema_mismatch
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
