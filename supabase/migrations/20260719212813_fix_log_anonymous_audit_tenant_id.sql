-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260719212813
-- Remote migration name: fix_log_anonymous_audit_tenant_id
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
