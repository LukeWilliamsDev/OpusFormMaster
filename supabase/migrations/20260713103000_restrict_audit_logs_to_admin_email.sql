-- Drop existing selective read policy on audit logs
DROP POLICY IF EXISTS "Allow read to admin roles" ON public.audit_logs;

-- Re-create the policy restricted strictly to admin@opusform.co.uk
CREATE POLICY "Allow read to admin email only" ON public.audit_logs
    FOR SELECT
    USING (
        (auth.jwt() ->> 'email') = 'admin@opusform.co.uk'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
