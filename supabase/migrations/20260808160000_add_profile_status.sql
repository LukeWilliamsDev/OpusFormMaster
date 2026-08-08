-- Account management: add status to profiles for disable/archive.
DO $$ BEGIN
  CREATE TYPE public.profile_status AS ENUM ('active', 'disabled', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status public.profile_status NOT NULL DEFAULT 'active';
