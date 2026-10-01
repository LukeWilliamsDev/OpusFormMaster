-- Ledger marker for a migration already applied remotely.
-- Remote version: 20260925021903
-- Remote migration name: fix_third_party_job_shift_rls_recursion
-- The schema change was applied under a historical remote version;
-- keep this local marker empty so future db push does not replay it.
DO $$ BEGIN NULL; END $$;
