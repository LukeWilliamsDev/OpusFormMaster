-- select_anonymous on document_requests allowed any anon/authenticated caller to
-- SELECT * across ALL tenants' live requests (tokens, worker_id, tenant_id, requested_certs).
-- The anonymous submit-credentials flow already has a safe path via the
-- get_document_request_details() SECURITY DEFINER RPC (20260716103000), which
-- returns only the single row matching a known token. This mirrors the fix
-- already applied to job_document_requests in 20260719120000.
DROP POLICY IF EXISTS select_anonymous ON public.document_requests;
