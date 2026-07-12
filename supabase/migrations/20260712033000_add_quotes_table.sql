CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  date text NOT NULL DEFAULT to_char(CURRENT_DATE, 'DD/MM/YYYY'),
  client_info jsonb NOT NULL,
  items jsonb NOT NULL,
  vat_rate numeric NOT NULL DEFAULT 20,
  totals jsonb NOT NULL,
  is_sent boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quotes_select_authenticated ON public.quotes;
CREATE POLICY quotes_select_authenticated ON public.quotes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS quotes_insert_ops ON public.quotes;
CREATE POLICY quotes_insert_ops ON public.quotes
  FOR INSERT TO authenticated WITH CHECK (private.can_write_ops(auth.uid()));

DROP POLICY IF EXISTS quotes_update_ops ON public.quotes;
CREATE POLICY quotes_update_ops ON public.quotes
  FOR UPDATE TO authenticated USING (private.can_write_ops(auth.uid()));

DROP POLICY IF EXISTS quotes_delete_ops ON public.quotes;
CREATE POLICY quotes_delete_ops ON public.quotes
  FOR DELETE TO authenticated USING (private.can_write_ops(auth.uid()));
