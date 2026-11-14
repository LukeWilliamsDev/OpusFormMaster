-- The full audit trail is a management control, not a single-account view.
-- Keep it tenant-scoped while allowing every admin and director account to
-- inspect the same evidence and use the guarded revert flow.
DROP POLICY IF EXISTS "Allow read to admin email only" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view their tenant audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins and directors can view their tenant audit logs" ON public.audit_logs;

CREATE POLICY "Admins and directors can view their tenant audit logs"
ON public.audit_logs
FOR SELECT TO authenticated
USING (
    tenant_id = private.current_tenant_id()
    AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.tenant_id = audit_logs.tenant_id
          AND p.role IN ('admin'::public.app_role, 'director'::public.app_role)
    )
);
