-- Keep Luke Williams' platform account as the reserved Opus Form admin.
-- His staff-facing job title is stored separately in public.staff.role.
-- This corrective migration is intentionally scoped to the canonical account.
UPDATE public.profiles
SET role = 'admin'::public.app_role,
    updated_at = now()
WHERE lower(email) = 'luke@opusform.co.uk'
  AND role IS DISTINCT FROM 'admin'::public.app_role;
