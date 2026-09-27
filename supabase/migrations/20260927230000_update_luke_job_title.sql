-- Keep Luke's platform account role as admin while updating the staff-facing
-- job title shown in operational records.
UPDATE public.staff
SET role = 'Digital Solutions Architect',
    updated_at = now()
WHERE lower(name) = 'luke williams'
  AND lower(email) = 'lukewilliams141@gmail.com';
