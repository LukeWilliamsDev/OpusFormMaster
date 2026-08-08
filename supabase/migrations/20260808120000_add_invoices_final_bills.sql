-- supabase/migrations/20260808120000_add_invoices_final_bills.sql
-- Job-scoped invoices (interim billing) and final_bills (merged, reviewed,
-- sent-to-client document combining a job's invoices).
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL REFERENCES public.jobs(id),
  reference text UNIQUE NOT NULL,
  date text NOT NULL DEFAULT to_char(CURRENT_DATE, 'DD/MM/YYYY'),
  client_info jsonb NOT NULL DEFAULT '{}',
  items jsonb NOT NULL DEFAULT '[]',
  vat_rate numeric NOT NULL DEFAULT 20,
  totals jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid NOT NULL DEFAULT private.current_tenant_id()
);

CREATE INDEX invoices_job_id_idx ON public.invoices(job_id);
CREATE INDEX invoices_tenant_id_idx ON public.invoices(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_select_ops ON public.invoices FOR SELECT TO authenticated
  USING (tenant_id = private.current_tenant_id());
CREATE POLICY invoices_insert_ops ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());
CREATE POLICY invoices_update_ops ON public.invoices FOR UPDATE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());
CREATE POLICY invoices_delete_ops ON public.invoices FOR DELETE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

CREATE TRIGGER invoices_set_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;


CREATE TABLE public.final_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL REFERENCES public.jobs(id),
  reference text UNIQUE NOT NULL,
  date text NOT NULL DEFAULT to_char(CURRENT_DATE, 'DD/MM/YYYY'),
  client_info jsonb NOT NULL DEFAULT '{}',
  items jsonb NOT NULL DEFAULT '[]',
  source_invoice_ids uuid[] NOT NULL DEFAULT '{}',
  vat_rate numeric NOT NULL DEFAULT 20,
  totals jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid NOT NULL DEFAULT private.current_tenant_id()
);

CREATE INDEX final_bills_job_id_idx ON public.final_bills(job_id);
CREATE INDEX final_bills_tenant_id_idx ON public.final_bills(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.final_bills TO authenticated;
GRANT ALL ON public.final_bills TO service_role;
ALTER TABLE public.final_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY final_bills_select_ops ON public.final_bills FOR SELECT TO authenticated
  USING (tenant_id = private.current_tenant_id());
CREATE POLICY final_bills_insert_ops ON public.final_bills FOR INSERT TO authenticated
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());
CREATE POLICY final_bills_update_ops ON public.final_bills FOR UPDATE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());
CREATE POLICY final_bills_delete_ops ON public.final_bills FOR DELETE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

CREATE TRIGGER final_bills_set_updated_at BEFORE UPDATE ON public.final_bills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.final_bills;
