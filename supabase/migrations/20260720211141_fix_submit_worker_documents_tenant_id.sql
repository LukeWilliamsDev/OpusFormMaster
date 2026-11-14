-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260720211141
-- Remote migration name: fix_submit_worker_documents_tenant_id
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
