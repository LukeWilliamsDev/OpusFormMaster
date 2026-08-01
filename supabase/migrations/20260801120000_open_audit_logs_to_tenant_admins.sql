-- audit_logs SELECT was hardcoded to a single email (admin@opusform.co.uk),
-- so every other tenant admin (e.g. Toby Green) got zero rows back with no
-- error, making the job's Audit tab look permanently empty/stuck loading.
-- Replace with the same role+tenant pattern used by profiles/jobs/etc.
DROP POLICY IF EXISTS "Allow read to admin email only" ON public.audit_logs;

CREATE POLICY "Admins can view their tenant audit logs" ON public.audit_logs
    FOR SELECT
    USING (
        private.has_role(auth.uid(), 'admin'::public.app_role)
        AND tenant_id = private.current_tenant_id()
    );
