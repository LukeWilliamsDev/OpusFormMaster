-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260808234007
-- Remote migration name: fix_process_audit_log_tenant_id
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
