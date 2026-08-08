-- Daily cron job: log an audit_logs entry the first time a worker's ticket
-- (compliance document) crosses its expiry date. Expiry is stored inline on
-- staff.tickets (jsonb array), there is no separate documents table.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.check_expired_tickets()
RETURNS void AS $$
DECLARE
  v_staff record;
  v_ticket jsonb;
BEGIN
  FOR v_staff IN SELECT id, email, tickets FROM public.staff WHERE tickets IS NOT NULL LOOP
    FOR v_ticket IN SELECT jsonb_array_elements(v_staff.tickets) LOOP
      IF (v_ticket->>'expiryDate') IS NOT NULL
        AND (v_ticket->>'expiryDate')::date < current_date
        AND NOT EXISTS (
          SELECT 1 FROM public.audit_logs
          WHERE action = 'TICKET_EXPIRED'
            AND target_type = 'staff'
            AND target_id = v_staff.id
            AND details->>'ticket_id' = v_ticket->>'id'
        )
      THEN
        INSERT INTO public.audit_logs (user_id, user_email, action, target_type, target_id, details)
        VALUES (
          NULL,
          COALESCE(v_staff.email, 'system@opusform.co.uk'),
          'TICKET_EXPIRED',
          'staff',
          v_staff.id,
          jsonb_build_object(
            'ticket_id', v_ticket->>'id',
            'ticket_type', v_ticket->>'type',
            'expiry_date', v_ticket->>'expiryDate'
          )
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.check_expired_tickets() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule(
  'check-ticket-expiry',
  '0 6 * * *',
  $$SELECT public.check_expired_tickets();$$
);
