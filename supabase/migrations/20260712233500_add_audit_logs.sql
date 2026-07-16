-- Create public.audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    user_id uuid,
    user_email text,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text NOT NULL,
    details jsonb
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow read access to admin profiles
CREATE POLICY "Allow read to admin roles" ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- No INSERT policy for authenticated/client roles: audit_logs must only ever be
-- written by the SECURITY DEFINER trigger function below (owned by the table
-- owner, which bypasses RLS). This prevents any authenticated user — including
-- non-admins across tenants — from inserting fabricated rows directly via the
-- client, keeping the audit trail tamper-evident.

-- Trigger function to automatically log changes
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id uuid;
    current_user_email text;
    rec record;
    target_val text;
    act text;
    details_val jsonb;
BEGIN
    -- Get current authenticated user details from session context if available
    BEGIN
        current_user_id := auth.uid();
        current_user_email := (auth.jwt() ->> 'email');
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
        current_user_email := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        act := 'CREATE';
        rec := NEW;
        details_val := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        act := 'UPDATE';
        rec := NEW;
        details_val := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        act := 'DELETE';
        rec := OLD;
        details_val := to_jsonb(OLD);
    END IF;

    -- Extract text ID
    target_val := rec.id::text;

    INSERT INTO public.audit_logs (user_id, user_email, action, target_type, target_id, details)
    VALUES (current_user_id, current_user_email, act, TG_TABLE_NAME, target_val, details_val);

    RETURN rec;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop triggers if they exist to avoid duplication
DROP TRIGGER IF EXISTS audit_quotes_trigger ON public.quotes;
DROP TRIGGER IF EXISTS audit_jobs_trigger ON public.jobs;
DROP TRIGGER IF EXISTS audit_staff_trigger ON public.staff;
DROP TRIGGER IF EXISTS audit_shifts_trigger ON public.shifts;

-- Attach triggers to target tables
CREATE TRIGGER audit_quotes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

CREATE TRIGGER audit_jobs_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

CREATE TRIGGER audit_staff_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.staff
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

CREATE TRIGGER audit_shifts_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.shifts
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
