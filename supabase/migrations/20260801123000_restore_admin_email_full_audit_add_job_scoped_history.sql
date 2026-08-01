-- The full audit trail (/portal/audit) is intentionally restricted to one
-- designated compliance account, not every tenant admin -- restore that
-- (undoing the earlier open-to-all-admins policy, per explicit product
-- decision) but keep the tenant scoping so it's not a single global account
-- across tenants.
DROP POLICY IF EXISTS "Admins can view their tenant audit logs" ON public.audit_logs;
CREATE POLICY "Allow read to admin email only" ON public.audit_logs
    FOR SELECT
    USING (
        tenant_id = private.current_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.email = 'admin@opusform.co.uk'
              AND profiles.role = 'admin'
        )
    );

-- Job Details' History tab needs its own narrower read: any ops user
-- (admin/dispatcher) viewing a job in their tenant can see that job's audit
-- rows, without granting the broad full-trail access above. RLS ORs policies
-- together, so this only adds job-scoped rows, it never widens the policy
-- above.
CREATE POLICY "Ops roles can view job-scoped audit logs" ON public.audit_logs
    FOR SELECT
    USING (
        target_type = 'jobs'
        AND tenant_id = private.current_tenant_id()
        AND private.can_write_ops(auth.uid())
    );
