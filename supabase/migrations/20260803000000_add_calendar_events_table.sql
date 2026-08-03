-- supabase/migrations/20260803000000_add_calendar_events_table.sql
-- Generic, non-shift calendar entries (e.g. site visits, meetings) shown
-- alongside shifts on the month Calendar page.
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  date date NOT NULL,
  job_id text REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid NOT NULL DEFAULT private.current_tenant_id()
);

CREATE INDEX calendar_events_date_idx ON public.calendar_events(date);
CREATE INDEX calendar_events_tenant_id_idx ON public.calendar_events(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendar_events_select_ops ON public.calendar_events FOR SELECT TO authenticated
  USING (tenant_id = private.current_tenant_id());
CREATE POLICY calendar_events_insert_ops ON public.calendar_events FOR INSERT TO authenticated
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());
CREATE POLICY calendar_events_update_ops ON public.calendar_events FOR UPDATE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());
CREATE POLICY calendar_events_delete_ops ON public.calendar_events FOR DELETE TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

CREATE TRIGGER calendar_events_set_updated_at BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
