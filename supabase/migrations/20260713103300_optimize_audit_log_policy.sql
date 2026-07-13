-- Drop the previous policy
DROP POLICY IF EXISTS "Allow read to admin email only" ON public.audit_logs;

-- Re-create using the profiles table email check for maximum compatibility
CREATE POLICY "Allow read to admin email only" ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.email = 'admin@opusform.co.uk'
              AND profiles.role = 'admin'
        )
    );
