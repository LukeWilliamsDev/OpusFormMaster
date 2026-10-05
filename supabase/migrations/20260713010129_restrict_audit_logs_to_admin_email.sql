-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260713010129
-- Remote migration name: restrict_audit_logs_to_admin_email
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
