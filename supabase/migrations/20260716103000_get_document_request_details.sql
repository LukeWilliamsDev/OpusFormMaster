-- Create a SECURITY DEFINER function to fetch document request details
-- including the worker name (bypasses staff table RLS for anonymous users).
CREATE OR REPLACE FUNCTION public.get_document_request_details(p_request_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', dr.id,
    'worker_id', dr.worker_id,
    'requested_certs', dr.requested_certs,
    'expires_at', dr.expires_at,
    'completed_at', dr.completed_at,
    'created_at', dr.created_at,
    'worker_name', COALESCE(s.name, 'Staff Member')
  ) INTO v_result
  FROM public.document_requests dr
  LEFT JOIN public.staff s ON s.id = dr.worker_id
  WHERE dr.id = p_request_id
    AND dr.completed_at IS NULL
    AND dr.expires_at > now();

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
