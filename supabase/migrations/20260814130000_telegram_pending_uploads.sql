-- Holds an uploaded file's storage location and disambiguation candidates
-- while the operative picks which open request/shift it belongs to.
-- No RLS: service-role only, same posture as telegram_links.
CREATE TABLE public.telegram_pending_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text NOT NULL,
  target_id text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  candidates jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
