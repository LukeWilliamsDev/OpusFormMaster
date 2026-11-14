-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260930140949
-- Remote migration name: 20260930150000_restore_luke_platform_admin_role
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
