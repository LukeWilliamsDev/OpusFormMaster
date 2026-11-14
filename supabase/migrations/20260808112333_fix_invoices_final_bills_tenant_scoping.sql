-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260808112333
-- Remote migration name: fix_invoices_final_bills_tenant_scoping
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
