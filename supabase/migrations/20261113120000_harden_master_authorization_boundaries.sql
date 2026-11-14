-- Master-remediation corrective migration.
--
-- This migration is intentionally forward-only and must be applied only after
-- the target environment's migration ledger has been reconciled. It closes
-- authorization gaps left by earlier permissive policies without rewriting
-- business data. Rollback is a reviewed corrective migration that restores the
-- exact prior policy only after the security exception is approved; do not
-- manually reset or edit production data.

-- Profiles: authenticated users may edit contact/display fields and the
-- password-change acknowledgement, but never identity, tenant, role, status,
-- or timestamps. The RLS policy alone is not sufficient because UPDATE grants
-- are column-blind unless table-level UPDATE is revoked first.
REVOKE UPDATE ON public.profiles FROM authenticated;
  GRANT UPDATE (full_name, phone_number, avatar_url)
  ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Users can update their own profile (except role)" ON public.profiles;
CREATE POLICY "Users can update their own safe profile fields"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- The later tenant/path-scoped compliance policies are permissive policies and
-- therefore cannot constrain an older FOR ALL policy. Remove the old bypass.
DROP POLICY IF EXISTS compliance_documents_ops_write ON storage.objects;

-- Separate the in-flight claim from the public `is_sent` flag so a failed
-- render/provider call can be released without rewinding a sent document.
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS send_status text NOT NULL DEFAULT 'draft';
ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS quotes_send_status_check;
ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_send_status_check
  CHECK (send_status IN ('draft', 'sending', 'sent'));

-- Sent/billed records are append-only at the state boundary. Client-side
-- guards improve UX, but this trigger closes the race where an old editor can
-- overwrite a record after another sender has claimed or completed delivery.
CREATE OR REPLACE FUNCTION private.prevent_sent_document_rewind()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private, pg_temp
AS $$
BEGIN
  -- Only the audited stale-send recovery RPCs may cross this boundary. The
  -- transaction-local flag is not granted as a callable application API.
  IF current_setting('opus.allow_document_recovery', true) IS DISTINCT FROM 'true' THEN
    IF TG_TABLE_NAME = 'quotes' THEN
      IF OLD.send_status = 'sending' THEN
        IF NOT (
          current_user = 'service_role'
          AND NEW.send_status IN ('draft', 'sent')
          AND ((NEW.send_status = 'sent' AND NEW.is_sent)
            OR (NEW.send_status = 'draft' AND NOT NEW.is_sent))
          AND (to_jsonb(NEW) - ARRAY['send_status', 'is_sent', 'updated_at']::text[])
              IS NOT DISTINCT FROM (to_jsonb(OLD) - ARRAY['send_status', 'is_sent', 'updated_at']::text[])
        ) THEN
          RAISE EXCEPTION 'A quotation being sent cannot be edited';
        END IF;
      ELSIF OLD.is_sent AND NOT NEW.is_sent THEN
        RAISE EXCEPTION 'A sent quotation cannot be returned to draft';
      END IF;
    ELSE
      IF OLD.status = 'sending' THEN
        IF NOT (
          current_user = 'service_role'
          AND NEW.status IN ('draft', 'sent')
          AND (to_jsonb(NEW) - ARRAY['status', 'sent_at', 'updated_at']::text[])
              IS NOT DISTINCT FROM (to_jsonb(OLD) - ARRAY['status', 'sent_at', 'updated_at']::text[])
        ) THEN
          RAISE EXCEPTION 'A document being sent cannot be edited';
        END IF;
      ELSIF OLD.status IN ('sent', 'billed')
            AND NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'A sent or billed document cannot be returned to another state';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.prevent_sent_document_rewind() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS prevent_sent_quote_rewind ON public.quotes;
CREATE TRIGGER prevent_sent_quote_rewind
BEFORE UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION private.prevent_sent_document_rewind();
DROP TRIGGER IF EXISTS prevent_sent_invoice_rewind ON public.invoices;
CREATE TRIGGER prevent_sent_invoice_rewind
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION private.prevent_sent_document_rewind();
DROP TRIGGER IF EXISTS prevent_sent_final_bill_rewind ON public.final_bills;
CREATE TRIGGER prevent_sent_final_bill_rewind
BEFORE UPDATE ON public.final_bills
FOR EACH ROW EXECUTE FUNCTION private.prevent_sent_document_rewind();

-- Keep authorization helpers fail-closed for inactive accounts. SECURITY
-- DEFINER functions bypass table RLS intentionally, so status/role checks must
-- be explicit here.
CREATE OR REPLACE FUNCTION private.can_write_ops(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND status = 'active'
      AND role IN (
        'admin'::public.app_role,
        'director'::public.app_role,
        'logistics_coordinator'::public.app_role
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_view_schedule(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND status = 'active'
      AND role IN (
        'admin'::public.app_role,
        'director'::public.app_role,
        'logistics_coordinator'::public.app_role,
        'logistics_assistant'::public.app_role
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_view_documents(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND status = 'active'
      AND role IN (
        'admin'::public.app_role,
        'director'::public.app_role,
        'logistics_coordinator'::public.app_role,
        'logistics_assistant'::public.app_role
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_send_documents(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND status = 'active'
      AND role IN (
        'admin'::public.app_role,
        'director'::public.app_role,
        'logistics_coordinator'::public.app_role
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.is_third_party(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND status = 'active'
      AND role = 'third_party'::public.app_role
  );
$$;

-- Access is valid only for an active third-party account and an existing
-- assigned shift in the same tenant. The shift row is the existing source of
-- truth for access; this corrective migration does not silently change whether
-- historical assigned jobs remain visible.
CREATE OR REPLACE FUNCTION private.third_party_can_access_job(_user_id uuid, _job_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.third_party_staff_access a
      ON a.third_party_user_id = p.id
     AND a.tenant_id = p.tenant_id
    JOIN public.shifts sh
      ON sh.worker_id = a.staff_id
     AND sh.tenant_id = a.tenant_id
    WHERE p.id = _user_id
      AND p.status = 'active'
      AND p.role = 'third_party'::public.app_role
      AND a.tenant_id = private.current_tenant_id()
      AND sh.job_id = _job_id
  );
$$;

CREATE OR REPLACE FUNCTION private.third_party_owns_staff(_user_id uuid, _staff_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.third_party_staff_access a
      ON a.third_party_user_id = p.id
     AND a.tenant_id = p.tenant_id
    WHERE p.id = _user_id
      AND p.status = 'active'
      AND p.role = 'third_party'::public.app_role
      AND a.staff_id = _staff_id
      AND a.tenant_id = private.current_tenant_id()
  );
$$;

REVOKE ALL ON FUNCTION private.can_write_ops(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_write_ops(uuid) TO authenticated;
REVOKE ALL ON FUNCTION private.can_view_schedule(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_schedule(uuid) TO authenticated;
REVOKE ALL ON FUNCTION private.can_view_documents(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_documents(uuid) TO authenticated;
REVOKE ALL ON FUNCTION private.can_send_documents(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_send_documents(uuid) TO authenticated;
REVOKE ALL ON FUNCTION private.is_third_party(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_third_party(uuid) TO authenticated;
REVOKE ALL ON FUNCTION private.third_party_can_access_job(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.third_party_can_access_job(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION private.third_party_owns_staff(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.third_party_owns_staff(uuid, text) TO authenticated;

-- This unused lookup is an account-enumeration primitive. No application code
-- needs it, so revoke both public and authenticated execution.
REVOKE EXECUTE ON FUNCTION public.check_email_registered(text)
  FROM PUBLIC, anon, authenticated;

-- Password changes are completed through a narrow RPC rather than granting
-- users direct write access to the forced-reset flag.
CREATE OR REPLACE FUNCTION public.complete_password_change()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  UPDATE public.profiles
  SET must_change_password = false
  WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.complete_password_change() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_password_change() TO authenticated;

-- A transport timeout deliberately leaves a final bill in `sending` to avoid
-- duplicate delivery. After checking the provider outside this function, an
-- active document-sender can explicitly release a stale claim with an audit
-- reason; the database never auto-resets an uncertain delivery.
CREATE OR REPLACE FUNCTION public.recover_final_bill_send(
  p_final_bill_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
SET row_security = off
AS $$
DECLARE
  v_tenant_id uuid := private.current_tenant_id();
  v_job_id text;
BEGIN
  IF NOT private.can_send_documents(auth.uid())
     OR v_tenant_id IS NULL
     OR NULLIF(trim(p_reason), '') IS NULL
     OR length(trim(p_reason)) > 500 THEN
    RAISE EXCEPTION 'Not authorised to recover this invoice send claim';
  END IF;

  PERFORM set_config('opus.allow_document_recovery', 'true', true);

  UPDATE public.final_bills
  SET status = 'draft'
  WHERE id = p_final_bill_id
    AND tenant_id = v_tenant_id
    AND status = 'sending'
    AND updated_at < now() - interval '15 minutes'
  RETURNING job_id INTO v_job_id;

  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'The invoice is not an eligible stale send claim';
  END IF;

  INSERT INTO public.audit_logs (
    user_id, user_email, action, target_type, target_id, details, tenant_id
  )
  VALUES (
    auth.uid(),
    auth.jwt() ->> 'email',
    'FINAL_BILL_SEND_RECONCILED',
    'final_bill',
    p_final_bill_id::text,
    jsonb_build_object('job_id', v_job_id, 'reason', trim(p_reason)),
    v_tenant_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.recover_final_bill_send(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recover_final_bill_send(uuid, text) TO authenticated;

-- Quotes and interim invoices use different sent-state columns, but need the
-- same explicit operator recovery path after an uncertain provider outcome.
CREATE OR REPLACE FUNCTION public.recover_quote_or_invoice_send(
  p_document_kind text,
  p_document_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
SET row_security = off
AS $$
DECLARE
  v_tenant_id uuid := private.current_tenant_id();
  v_reference text;
BEGIN
  IF NOT private.can_send_documents(auth.uid())
     OR v_tenant_id IS NULL
     OR p_document_kind NOT IN ('quote', 'invoice')
     OR NULLIF(trim(p_reason), '') IS NULL
     OR length(trim(p_reason)) > 500 THEN
    RAISE EXCEPTION 'Not authorised to recover this document send claim';
  END IF;

  PERFORM set_config('opus.allow_document_recovery', 'true', true);

  IF p_document_kind = 'quote' THEN
    UPDATE public.quotes
    SET send_status = 'draft'
    WHERE id = p_document_id
      AND tenant_id = v_tenant_id
      AND is_sent = false
      AND send_status = 'sending'
      AND updated_at < now() - interval '15 minutes'
    RETURNING reference INTO v_reference;
  ELSE
    UPDATE public.invoices
    SET status = 'draft'
    WHERE id = p_document_id
      AND tenant_id = v_tenant_id
      AND status = 'sending'
      AND updated_at < now() - interval '15 minutes'
    RETURNING reference INTO v_reference;
  END IF;

  IF v_reference IS NULL THEN
    RAISE EXCEPTION 'The document is not an eligible stale send claim';
  END IF;

  INSERT INTO public.audit_logs (
    user_id, user_email, action, target_type, target_id, details, tenant_id
  )
  VALUES (
    auth.uid(),
    auth.jwt() ->> 'email',
    'DOCUMENT_SEND_RECONCILED',
    p_document_kind,
    p_document_id::text,
    jsonb_build_object('reference', v_reference, 'reason', trim(p_reason)),
    v_tenant_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.recover_quote_or_invoice_send(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recover_quote_or_invoice_send(text, uuid, text) TO authenticated;
