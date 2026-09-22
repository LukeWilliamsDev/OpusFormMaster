-- Stage 2 groundwork: shift confirmation state, a notification dedupe ledger,
-- and pg_net so pg_cron can call an edge function on a schedule.

-- pg_cron alone can only run SQL. Scheduled notifications need an outbound
-- HTTP call, which is what pg_net provides.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Real domain state, so it belongs on the shift itself rather than in the
-- notification ledger. shifts has no start time, only a date.
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS declined_at timestamptz;

-- One ledger for every outbound Telegram message that must not repeat: shift
-- reminders, certificate expiry warnings, and anything later. The unique index
-- on (kind, dedupe_key) is what makes a resend impossible, so a cron that runs
-- twice or a retry after a partial failure is harmless.
CREATE TABLE IF NOT EXISTS public.telegram_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text NOT NULL,
  kind text NOT NULL,
  dedupe_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS telegram_notifications_dedupe_idx
  ON public.telegram_notifications(kind, dedupe_key);

ALTER TABLE public.telegram_notifications ENABLE ROW LEVEL SECURITY;

-- Written only by the notify function under the service role, so there is no
-- INSERT policy. Dispatchers and admins can read the send history.
CREATE POLICY telegram_notifications_select_ops ON public.telegram_notifications FOR SELECT TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());
