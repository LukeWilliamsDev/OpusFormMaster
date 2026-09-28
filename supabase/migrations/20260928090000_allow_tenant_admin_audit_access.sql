-- The full audit trail and policy library are admin sections. Access should
-- follow the admin role within the caller's tenant, not one account email.
DROP POLICY IF EXISTS "Allow read to admin email only" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view their tenant audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view their tenant audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        private.has_role(auth.uid(), 'admin'::public.app_role)
        AND tenant_id = private.current_tenant_id()
    );
