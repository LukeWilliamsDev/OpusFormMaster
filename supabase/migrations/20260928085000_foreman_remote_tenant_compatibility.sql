-- Forward compatibility for deployed environments where the original
-- multi-tenant columns were not present on the legacy diary/attachment
-- tables. Backfill only from the referenced job; do not guess a tenant.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'job_diary'
      AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.job_diary ADD COLUMN tenant_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'job_attachments'
      AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.job_attachments ADD COLUMN tenant_id uuid;
  END IF;
END $$;

UPDATE public.job_diary d
SET tenant_id = j.tenant_id
FROM public.jobs j
WHERE d.tenant_id IS NULL
  AND j.id = d.job_id;

UPDATE public.job_attachments a
SET tenant_id = j.tenant_id
FROM public.jobs j
WHERE a.tenant_id IS NULL
  AND j.id = a.job_id;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.job_diary WHERE tenant_id IS NULL) THEN
    RAISE EXCEPTION 'job_diary contains rows without a tenant-matching job';
  END IF;
  IF EXISTS (SELECT 1 FROM public.job_attachments WHERE tenant_id IS NULL) THEN
    RAISE EXCEPTION 'job_attachments contains rows without a tenant-matching job';
  END IF;

  ALTER TABLE public.job_diary
    ALTER COLUMN tenant_id SET DEFAULT private.current_tenant_id(),
    ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.job_attachments
    ALTER COLUMN tenant_id SET DEFAULT private.current_tenant_id(),
    ALTER COLUMN tenant_id SET NOT NULL;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.job_diary'::regclass
      AND conname = 'job_diary_tenant_id_fkey'
  ) THEN
    ALTER TABLE public.job_diary
      ADD CONSTRAINT job_diary_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.job_attachments'::regclass
      AND conname = 'job_attachments_tenant_id_fkey'
  ) THEN
    ALTER TABLE public.job_attachments
      ADD CONSTRAINT job_attachments_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;
END $$;
