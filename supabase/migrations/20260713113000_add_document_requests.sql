-- Create document requests table for passwordless submission
CREATE TABLE IF NOT EXISTS public.document_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id text REFERENCES public.staff(id) ON DELETE CASCADE,
  requested_certs text[] NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS select_all_auth ON public.document_requests;
DROP POLICY IF EXISTS select_anonymous ON public.document_requests;
DROP POLICY IF EXISTS update_anonymous ON public.document_requests;
DROP POLICY IF EXISTS admin_all ON public.document_requests;

-- Select policies
CREATE POLICY select_all_auth ON public.document_requests
  FOR SELECT TO authenticated
  USING (private.can_write_ops(auth.uid()));

CREATE POLICY select_anonymous ON public.document_requests
  FOR SELECT TO anon, authenticated
  USING (completed_at IS NULL AND expires_at > now());

CREATE POLICY update_anonymous ON public.document_requests
  FOR UPDATE TO anon, authenticated
  USING (completed_at IS NULL AND expires_at > now());

CREATE POLICY admin_all ON public.document_requests
  FOR ALL TO authenticated
  USING (private.can_write_ops(auth.uid()))
  WITH CHECK (private.can_write_ops(auth.uid()));

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('compliance-documents', 'compliance-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS upload_anonymous ON storage.objects;
DROP POLICY IF EXISTS select_anonymous ON storage.objects;
DROP POLICY IF EXISTS admin_all_storage ON storage.objects;

CREATE POLICY upload_anonymous ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'compliance-documents' 
    AND (storage.foldername(name))[1] = 'requests'
  );

CREATE POLICY select_anonymous ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'compliance-documents');

CREATE POLICY admin_all_storage ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'compliance-documents' 
  );

-- Function to submit worker documents anonymously
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
  v_current_tickets jsonb;
  v_ticket jsonb;
  v_updated_tickets jsonb;
  v_new_type text;
  v_found boolean;
BEGIN
  -- Find request
  SELECT worker_id, completed_at, expires_at INTO v_worker_id, v_completed_at, v_expires_at
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
  INSERT INTO public.audit_logs (user_id, user_email, action, target_type, target_id, details)
  VALUES (
    NULL, 
    COALESCE(v_worker_email, 'anonymous@opusform.co.uk'), 
    'SUBMIT_DOCUMENTS', 
    'staff', 
    v_worker_id, 
    jsonb_build_object('request_id', p_request_id, 'tickets_submitted', p_new_tickets)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
