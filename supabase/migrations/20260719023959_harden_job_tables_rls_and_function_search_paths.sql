-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260719023959
-- Remote migration name: harden_job_tables_rls_and_function_search_paths
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
