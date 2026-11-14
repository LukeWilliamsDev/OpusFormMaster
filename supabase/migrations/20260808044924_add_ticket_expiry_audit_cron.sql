-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260808044924
-- Remote migration name: add_ticket_expiry_audit_cron
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
