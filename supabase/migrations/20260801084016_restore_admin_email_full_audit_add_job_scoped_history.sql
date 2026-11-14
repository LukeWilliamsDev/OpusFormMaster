-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260801084016
-- Remote migration name: restore_admin_email_full_audit_add_job_scoped_history
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
