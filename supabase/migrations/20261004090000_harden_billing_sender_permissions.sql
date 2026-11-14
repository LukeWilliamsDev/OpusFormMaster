-- Billing and compliance-document writes are reserved for active operational
-- write roles. The UI is not a security boundary: this function is used by
-- RLS policies for quotes, invoices, final bills, and document requests.

CREATE OR REPLACE FUNCTION private.can_view_documents(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND status = 'active'
      AND role IN (
        'admin'::public.app_role,
        'director'::public.app_role,
        'logistics_coordinator'::public.app_role,
        'logistics_assistant'::public.app_role
      )
  );
$$;

REVOKE ALL ON FUNCTION private.can_view_documents(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_documents(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.can_send_documents(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND status = 'active'
      AND role IN (
        'admin'::public.app_role,
        'director'::public.app_role,
        'logistics_coordinator'::public.app_role
      )
  );
$$;

REVOKE ALL ON FUNCTION private.can_send_documents(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_send_documents(uuid) TO authenticated;

-- Preserve read-only billing visibility for assistants while moving every
-- mutation behind can_send_documents().
DROP POLICY IF EXISTS quotes_select_authenticated ON public.quotes;
CREATE POLICY quotes_select_authenticated ON public.quotes FOR SELECT TO authenticated
  USING (private.can_view_documents(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS invoices_select_ops ON public.invoices;
CREATE POLICY invoices_select_ops ON public.invoices FOR SELECT TO authenticated
  USING (
    private.can_view_documents(auth.uid())
    AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = invoices.job_id AND j.tenant_id = invoices.tenant_id)
  );

DROP POLICY IF EXISTS final_bills_select_ops ON public.final_bills;
CREATE POLICY final_bills_select_ops ON public.final_bills FOR SELECT TO authenticated
  USING (
    private.can_view_documents(auth.uid())
    AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = final_bills.job_id AND j.tenant_id = final_bills.tenant_id)
  );

DROP POLICY IF EXISTS compliance_requests_select_senders ON public.document_requests;
CREATE POLICY compliance_requests_select_senders ON public.document_requests FOR SELECT TO authenticated
  USING (private.can_view_documents(auth.uid()) AND tenant_id = private.current_tenant_id());

-- Keep destructive operations subject to the same relationship checks as
-- inserts and updates; tenant_id alone is not enough for a referenced row.
DROP POLICY IF EXISTS invoices_delete_ops ON public.invoices;
CREATE POLICY invoices_delete_ops ON public.invoices FOR DELETE TO authenticated
  USING (
    private.can_send_documents(auth.uid())
    AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = invoices.job_id AND j.tenant_id = invoices.tenant_id)
  );

DROP POLICY IF EXISTS final_bills_delete_ops ON public.final_bills;
CREATE POLICY final_bills_delete_ops ON public.final_bills FOR DELETE TO authenticated
  USING (
    private.can_send_documents(auth.uid())
    AND tenant_id = private.current_tenant_id()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = final_bills.job_id AND j.tenant_id = final_bills.tenant_id)
  );

DROP POLICY IF EXISTS compliance_requests_delete_senders ON public.document_requests;
CREATE POLICY compliance_requests_delete_senders ON public.document_requests FOR DELETE TO authenticated
  USING (
    private.can_send_documents(auth.uid())
    AND tenant_id = private.current_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public.staff s
      WHERE s.id = document_requests.worker_id
        AND s.tenant_id = document_requests.tenant_id
    )
  );

-- Reassert the certificate-check relationship guard in the final security
-- migration so a certificate record cannot point at staff from another
-- tenant, even if an earlier policy was deployed without this predicate.
DROP POLICY IF EXISTS staff_certificate_checks_insert_internal ON public.staff_certificate_checks;
CREATE POLICY staff_certificate_checks_insert_internal ON public.staff_certificate_checks
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = private.current_tenant_id()
    AND checked_by = auth.uid()
    AND private.can_use_certificate_checker(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.staff s
      WHERE s.id = staff_certificate_checks.staff_id
        AND s.tenant_id = private.current_tenant_id()
    )
  );
