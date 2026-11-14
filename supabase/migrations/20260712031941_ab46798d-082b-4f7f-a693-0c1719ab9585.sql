-- Historical reset migration. The deployed project has already passed this
-- point; keep the version as a no-op so a clean local replay cannot destroy
-- the schema created by the preceding migrations.
DO $$
BEGIN
  NULL;
END $$;
