-- Allow Staff-access management roles to record a compliance item checked
-- outside the worker upload flow without granting them general staff writes.

CREATE OR REPLACE FUNCTION public.add_manual_staff_compliance(
  p_staff_id text,
  p_certificate_type text,
  p_expiry_date date,
  p_ticket_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
SET row_security = off
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_tenant_id uuid;
  v_staff public.staff%ROWTYPE;
  v_ticket jsonb;
  v_certificate_type text := NULLIF(trim(p_certificate_type), '');
  v_ticket_number text := NULLIF(trim(p_ticket_number), '');
  v_actor_email text;
BEGIN
  IF v_actor_id IS NULL OR NOT private.can_use_certificate_checker(v_actor_id) THEN
    RAISE EXCEPTION 'Not authorised to add staff compliance';
  END IF;

  IF p_staff_id IS NULL OR NULLIF(trim(p_staff_id), '') IS NULL THEN
    RAISE EXCEPTION 'Staff record is required';
  END IF;
  IF v_certificate_type IS NULL OR length(v_certificate_type) > 200 THEN
    RAISE EXCEPTION 'Compliance type is required and must be 200 characters or fewer';
  END IF;
  IF p_expiry_date IS NULL THEN
    RAISE EXCEPTION 'Expiry date is required';
  END IF;
  IF v_ticket_number IS NOT NULL AND length(v_ticket_number) > 200 THEN
    RAISE EXCEPTION 'Reference number must be 200 characters or fewer';
  END IF;

  SELECT *
    INTO v_staff
  FROM public.staff
  WHERE id = trim(p_staff_id)
    AND tenant_id = private.current_tenant_id()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff record not found';
  END IF;

  v_tenant_id := v_staff.tenant_id;
  v_ticket := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'type', v_certificate_type,
    'expiryDate', p_expiry_date::text,
    'ticketNumber', v_ticket_number,
    'verified', true,
    'manual', true,
    'createdAt', now()
  );

  UPDATE public.staff
  SET tickets = COALESCE(tickets, '[]'::jsonb) || jsonb_build_array(v_ticket)
  WHERE id = v_staff.id
    AND tenant_id = v_tenant_id;

  SELECT email
    INTO v_actor_email
  FROM public.profiles
  WHERE id = v_actor_id;

  INSERT INTO public.audit_logs (
    user_id,
    user_email,
    action,
    target_type,
    target_id,
    details,
    tenant_id
  )
  VALUES (
    v_actor_id,
    v_actor_email,
    'MANUAL_COMPLIANCE_ADDED',
    'staff',
    v_staff.id,
    jsonb_build_object(
      'ticket_id', v_ticket->>'id',
      'certificate_type', v_certificate_type,
      'expiry_date', p_expiry_date,
      'ticket_number', v_ticket_number,
      'manual', true,
      'ticket', v_ticket
    ),
    v_tenant_id
  );

  RETURN v_ticket;
END;
$$;

REVOKE ALL ON FUNCTION public.add_manual_staff_compliance(text, text, date, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_manual_staff_compliance(text, text, date, text)
  TO authenticated;
