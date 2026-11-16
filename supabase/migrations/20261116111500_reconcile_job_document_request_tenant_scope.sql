-- Reconcile a live catalog drift: the canonical upload functions derive and
-- enforce tenant scope on job_document_requests, but an older production
-- schema was missing the tenant_id column.
--
-- This is forward-only and data-preserving. The value is derived from the
-- request's existing job relationship; no client-supplied tenant is trusted.

ALTER TABLE public.job_document_requests
  ADD COLUMN IF NOT EXISTS tenant_id uuid;

UPDATE public.job_document_requests AS request
SET tenant_id = job.tenant_id
FROM public.jobs AS job
WHERE request.job_id = job.id
  AND request.tenant_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.job_document_requests
    WHERE tenant_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot enforce tenant scope: an upload request has no matching job tenant';
  END IF;
END;
$$;

ALTER TABLE public.job_document_requests
  ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'job_document_requests_tenant_id_fkey'
      AND conrelid = 'public.job_document_requests'::regclass
  ) THEN
    ALTER TABLE public.job_document_requests
      ADD CONSTRAINT job_document_requests_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS job_document_requests_tenant_id_idx
  ON public.job_document_requests(tenant_id);
