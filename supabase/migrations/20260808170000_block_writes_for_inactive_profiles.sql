-- Enforce account status at the database layer: a disabled/archived user's
-- existing JWT stays valid until it expires, so RLS alone doesn't stop writes
-- in that window. This trigger re-checks profiles.status on every mutation.
-- Skips the check when auth.uid() is NULL (service-role calls from edge
-- functions), so admin actions on other accounts still work.
CREATE OR REPLACE FUNCTION private.reject_if_inactive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status <> 'active'
  ) THEN
    RAISE EXCEPTION 'Account is disabled or archived.' USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'calendar_events', 'document_requests', 'job_attachments', 'job_diary',
    'job_document_requests', 'job_notes', 'jobs', 'pours', 'profiles',
    'quotes', 'shifts', 'smtp_config', 'staff', 'tenants'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS reject_if_inactive ON public.%I;', t);
    EXECUTE format(
      'CREATE TRIGGER reject_if_inactive BEFORE INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION private.reject_if_inactive();', t
    );
  END LOOP;
END $$;
