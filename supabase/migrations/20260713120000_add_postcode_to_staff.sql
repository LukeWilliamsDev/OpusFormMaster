-- Add postcode column to public.staff table
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS postcode text;
