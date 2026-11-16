-- Stable, tenant-scoped document numbering. Existing references remain unchanged.
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS job_id text REFERENCES public.jobs(id),
  ADD COLUMN IF NOT EXISTS quote_number integer,
  ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;

ALTER TABLE public.final_bills
  ADD COLUMN IF NOT EXISTS invoice_number integer;

UPDATE public.quotes q
SET job_id = j.id
FROM public.jobs j
WHERE q.job_id IS NULL
  AND q.job_ref IS NOT NULL
  AND q.tenant_id = j.tenant_id
  AND q.job_ref = j.job_ref;

CREATE INDEX IF NOT EXISTS quotes_job_id_idx ON public.quotes(job_id);
CREATE INDEX IF NOT EXISTS quotes_tenant_quote_number_idx
  ON public.quotes(tenant_id, quote_number)
  WHERE quote_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS final_bills_tenant_invoice_number_idx
  ON public.final_bills(tenant_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_revision_positive CHECK (revision > 0);

CREATE UNIQUE INDEX IF NOT EXISTS jobs_tenant_job_ref_key
  ON public.jobs(tenant_id, job_ref);

CREATE UNIQUE INDEX IF NOT EXISTS quotes_tenant_quote_revision_key
  ON public.quotes(tenant_id, quote_number, revision)
  WHERE quote_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS final_bills_tenant_invoice_number_key
  ON public.final_bills(tenant_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.document_counters (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_kind text NOT NULL,
  scope_key text NOT NULL DEFAULT '',
  next_number integer NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id, document_kind, scope_key),
  CONSTRAINT document_counters_kind_check
    CHECK (document_kind IN ('job', 'quote', 'invoice')),
  CONSTRAINT document_counters_next_number_positive CHECK (next_number > 0)
);

ALTER TABLE public.document_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_counters FROM anon, authenticated;
GRANT ALL ON public.document_counters TO service_role;

CREATE OR REPLACE FUNCTION public.allocate_document_number(
  p_document_kind text,
  p_scope_id text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_tenant_id uuid := private.current_tenant_id();
  v_scope_key text := coalesce(p_scope_id, '');
  v_number integer;
BEGIN
  IF v_tenant_id IS NULL OR NOT private.can_write_ops(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised to allocate document numbers';
  END IF;

  IF p_document_kind NOT IN ('job', 'quote', 'invoice') THEN
    RAISE EXCEPTION 'Unsupported document kind: %', p_document_kind;
  END IF;

  IF p_document_kind = 'job' AND p_scope_id IS NOT NULL THEN
    RAISE EXCEPTION 'Job numbers cannot be scoped';
  END IF;

  IF p_document_kind = 'invoice' AND p_scope_id IS NOT NULL THEN
    RAISE EXCEPTION 'Invoice numbers cannot be scoped';
  END IF;

  IF p_document_kind = 'quote' AND p_scope_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.jobs WHERE id = p_scope_id AND tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'Quote scope does not belong to the current tenant';
  END IF;

  INSERT INTO public.document_counters (tenant_id, document_kind, scope_key, next_number)
  VALUES (v_tenant_id, p_document_kind, v_scope_key, 2)
  ON CONFLICT (tenant_id, document_kind, scope_key)
  DO UPDATE SET next_number = public.document_counters.next_number + 1
  RETURNING next_number - 1 INTO v_number;

  RETURN v_number;
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_document_number(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_document_number(text, text) TO authenticated;
