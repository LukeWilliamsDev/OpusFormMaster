-- submit_worker_documents (credential submission portal) inserted into
-- audit_logs without tenant_id, which has been NOT NULL since 20260715135000.
-- Derive tenant_id from the same document_requests row already looked up.
CREATE OR REPLACE FUNCTION public.submit_worker_documents(
  p_request_id uuid,
  p_new_tickets jsonb
)
RETURNS void AS $$
DECLARE
  v_worker_id text;
  v_worker_email text;
  v_completed_at timestamptz;
  v_expires_at timestamptz;
  v_tenant_id uuid;
  v_current_tickets jsonb;
  v_ticket jsonb;
  v_updated_tickets jsonb;
  v_new_type text;
  v_found boolean;
BEGIN
  -- Find request
  SELECT worker_id, completed_at, expires_at, tenant_id INTO v_worker_id, v_completed_at, v_expires_at, v_tenant_id
  FROM public.document_requests
  WHERE id = p_request_id;

  IF v_worker_id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_completed_at IS NOT NULL OR v_expires_at < now() THEN
    RAISE EXCEPTION 'Link has expired or already been used';
  END IF;

  -- Get current tickets
  SELECT tickets, email INTO v_current_tickets, v_worker_email FROM public.staff WHERE id = v_worker_id;
  IF v_current_tickets IS NULL THEN
    v_current_tickets := '[]'::jsonb;
  END IF;

  v_updated_tickets := '[]'::jsonb;

  -- Keep existing tickets that are NOT of the types being uploaded
  FOR v_ticket IN SELECT jsonb_array_elements(v_current_tickets) LOOP
    v_found := false;
    -- check if type matches any new ticket type
    FOR v_new_type IN SELECT jsonb_array_elements_text(jsonb_path_query_array(p_new_tickets, '$[*].type')) LOOP
      IF v_ticket->>'type' = v_new_type THEN
        v_found := true;
      END IF;
    END LOOP;

    IF NOT v_found THEN
      v_updated_tickets := v_updated_tickets || jsonb_build_array(v_ticket);
    END IF;
  END LOOP;

  -- Append the new tickets with verified: false
  FOR v_ticket IN SELECT jsonb_array_elements(p_new_tickets) LOOP
    v_updated_tickets := v_updated_tickets || jsonb_build_array(
      jsonb_build_object(
        'id', COALESCE(v_ticket->>'id', 't-uploaded-' || floor(random()*1000000)::text),
        'type', v_ticket->>'type',
        'expiryDate', v_ticket->>'expiryDate',
        'ticketNumber', v_ticket->>'ticketNumber',
        'documentUrl', v_ticket->>'documentUrl',
        'verified', false
      )
    );
  END LOOP;

  -- Update staff tickets
  UPDATE public.staff
  SET tickets = v_updated_tickets
  WHERE id = v_worker_id;

  -- Mark request as completed
  UPDATE public.document_requests
  SET completed_at = now()
  WHERE id = p_request_id;

  -- Log to audit trails
  INSERT INTO public.audit_logs (user_id, user_email, action, target_type, target_id, details, tenant_id)
  VALUES (
    NULL,
    COALESCE(v_worker_email, 'anonymous@opusform.co.uk'),
    'SUBMIT_DOCUMENTS',
    'staff',
    v_worker_id,
    jsonb_build_object('request_id', p_request_id, 'tickets_submitted', p_new_tickets),
    v_tenant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
