-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260801083118
-- Remote migration name: open_audit_logs_to_tenant_admins
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
