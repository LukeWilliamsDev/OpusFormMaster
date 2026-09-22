-- Telegram identity binding. A link resolves a Telegram account to a staff row;
-- the role is always read fresh from that row, never stored here.

CREATE TABLE public.telegram_invites (
  token text PRIMARY KEY,
  target_id text NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  used_at timestamptz,
  tenant_id uuid NOT NULL DEFAULT private.current_tenant_id()
);

CREATE TABLE public.telegram_links (
  telegram_user_id text PRIMARY KEY,
  target_id text NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  class text NOT NULL DEFAULT 'staff' CHECK (class IN ('staff', 'guest')),
  telegram_username text,
  linked_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  last_seen_at timestamptz,
  tenant_id uuid NOT NULL DEFAULT private.current_tenant_id()
);

-- One live link per staff member. Revoked rows keep their history.
CREATE UNIQUE INDEX telegram_links_active_target_idx
  ON public.telegram_links(target_id) WHERE revoked_at IS NULL;
CREATE INDEX telegram_invites_target_idx ON public.telegram_invites(target_id);

ALTER TABLE public.telegram_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;

-- Dispatchers and admins read invites and links from the portal. Writes go
-- exclusively through the RPCs below, so no INSERT/UPDATE policy exists. The
-- edge function uses the service role and bypasses these policies entirely.
CREATE POLICY telegram_invites_select_ops ON public.telegram_invites FOR SELECT TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());
CREATE POLICY telegram_links_select_ops ON public.telegram_links FOR SELECT TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

-- Token generation stays server-side so the client never chooses it.
CREATE OR REPLACE FUNCTION public.create_telegram_invite(p_target_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
  v_token text;
BEGIN
  IF NOT private.can_write_ops(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised to create Telegram invites';
  END IF;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');

  -- Supersede any unused invite for this person so only the newest link works.
  UPDATE public.telegram_invites
     SET used_at = now()
   WHERE target_id = p_target_id AND used_at IS NULL;

  INSERT INTO public.telegram_invites (token, target_id)
  VALUES (v_token, p_target_id);

  -- audit_logs.tenant_id is NOT NULL with no default, so it must be set here.
  INSERT INTO public.audit_logs (user_id, user_email, action, target_type, target_id, details, tenant_id)
  VALUES (auth.uid(), auth.jwt() ->> 'email', 'telegram_invite_created', 'staff', p_target_id,
          jsonb_build_object('expires_in_days', 7), private.current_tenant_id());

  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_telegram_link(p_target_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NOT private.can_write_ops(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised to revoke Telegram links';
  END IF;

  UPDATE public.telegram_links
     SET revoked_at = now()
   WHERE target_id = p_target_id AND revoked_at IS NULL;

  UPDATE public.telegram_invites
     SET used_at = now()
   WHERE target_id = p_target_id AND used_at IS NULL;

  INSERT INTO public.audit_logs (user_id, user_email, action, target_type, target_id, details, tenant_id)
  VALUES (auth.uid(), auth.jwt() ->> 'email', 'telegram_link_revoked', 'staff', p_target_id,
          '{}'::jsonb, private.current_tenant_id());
END;
$$;

REVOKE ALL ON FUNCTION public.create_telegram_invite(text) FROM public;
REVOKE ALL ON FUNCTION public.revoke_telegram_link(text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_telegram_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_telegram_link(text) TO authenticated;

-- Archiving a staff member kills their Telegram access with no human step.
CREATE OR REPLACE FUNCTION private.revoke_telegram_on_archive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.is_archived IS TRUE AND COALESCE(OLD.is_archived, false) IS FALSE THEN
    UPDATE public.telegram_links
       SET revoked_at = now()
     WHERE target_id = NEW.id AND revoked_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER revoke_telegram_on_archive_trg
  AFTER UPDATE OF is_archived ON public.staff
  FOR EACH ROW EXECUTE FUNCTION private.revoke_telegram_on_archive();
