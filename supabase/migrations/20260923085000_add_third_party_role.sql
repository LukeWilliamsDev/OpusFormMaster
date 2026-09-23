-- Enum values must be committed before functions can cast to them.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'third_party';
