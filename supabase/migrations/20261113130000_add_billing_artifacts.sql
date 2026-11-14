-- Trusted billing PDF artifacts.
--
-- The browser may still render a local preview, but customer-facing email
-- attachments are generated from persisted billing rows by the Edge Functions
-- and stored here before delivery. This migration is forward-only; rollback is
-- a reviewed corrective migration and must not restore client-supplied PDF
-- bytes as an email source of truth.

INSERT INTO storage.buckets (id, name, public)
VALUES ('billing-artifacts', 'billing-artifacts', false)
ON CONFLICT (id) DO UPDATE SET public = false;

CREATE TABLE IF NOT EXISTS public.billing_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  document_kind text NOT NULL CHECK (document_kind IN ('quote', 'invoice', 'final_bill')),
  document_id uuid NOT NULL,
  storage_path text NOT NULL,
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  byte_size bigint NOT NULL CHECK (byte_size > 0),
  status text NOT NULL DEFAULT 'generated'
    CHECK (status IN ('generated', 'sent', 'reconciliation_required')),
  generated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_kind, document_id)
);

CREATE INDEX IF NOT EXISTS billing_artifacts_tenant_idx
  ON public.billing_artifacts (tenant_id);
CREATE INDEX IF NOT EXISTS billing_artifacts_status_idx
  ON public.billing_artifacts (status);

DROP TRIGGER IF EXISTS billing_artifacts_set_updated_at ON public.billing_artifacts;
CREATE TRIGGER billing_artifacts_set_updated_at
  BEFORE UPDATE ON public.billing_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.billing_artifacts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.billing_artifacts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.billing_artifacts FROM authenticated;
GRANT SELECT ON public.billing_artifacts TO authenticated;
GRANT ALL ON public.billing_artifacts TO service_role;

DROP POLICY IF EXISTS billing_artifacts_select_documents ON public.billing_artifacts;
CREATE POLICY billing_artifacts_select_documents
  ON public.billing_artifacts FOR SELECT
  TO authenticated
  USING (
    tenant_id = private.current_tenant_id()
    AND private.can_view_documents(auth.uid())
  );

-- Only service-role Edge Functions may create, replace, or mark an artifact.
-- Authenticated users can read an artifact row only after the document-view
-- policy above has passed; Storage reads use the same tenant/document boundary.
DROP POLICY IF EXISTS billing_artifacts_storage_select ON storage.objects;
CREATE POLICY billing_artifacts_storage_select
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'billing-artifacts'
    AND EXISTS (
      SELECT 1
      FROM public.billing_artifacts a
      WHERE a.storage_path = storage.objects.name
        AND a.tenant_id = private.current_tenant_id()
        AND private.can_view_documents(auth.uid())
    )
  );

DROP POLICY IF EXISTS billing_artifacts_storage_service_insert ON storage.objects;
CREATE POLICY billing_artifacts_storage_service_insert
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'billing-artifacts');

DROP POLICY IF EXISTS billing_artifacts_storage_service_update ON storage.objects;
CREATE POLICY billing_artifacts_storage_service_update
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'billing-artifacts')
  WITH CHECK (bucket_id = 'billing-artifacts');

DROP POLICY IF EXISTS billing_artifacts_storage_service_delete ON storage.objects;
CREATE POLICY billing_artifacts_storage_service_delete
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'billing-artifacts');

-- Explicitly reconcile an artifact after an operator has checked the provider
-- result or a post-send database write failed. This never sends mail itself.
CREATE OR REPLACE FUNCTION public.reconcile_billing_artifact(
  p_document_kind text,
  p_document_id uuid,
  p_status text,
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
  v_storage_path text;
BEGIN
  IF NOT private.can_send_documents(auth.uid())
     OR v_tenant_id IS NULL
     OR p_document_kind NOT IN ('quote', 'invoice', 'final_bill')
     OR p_status NOT IN ('generated', 'sent', 'reconciliation_required')
     OR NULLIF(trim(p_reason), '') IS NULL
     OR length(trim(p_reason)) > 500 THEN
    RAISE EXCEPTION 'Not authorised to reconcile this billing artifact';
  END IF;

  UPDATE public.billing_artifacts
  SET status = p_status,
      sent_at = CASE WHEN p_status = 'sent' THEN COALESCE(sent_at, now()) ELSE NULL END
  WHERE tenant_id = v_tenant_id
    AND document_kind = p_document_kind
    AND document_id = p_document_id
  RETURNING storage_path INTO v_storage_path;

  IF v_storage_path IS NULL THEN
    RAISE EXCEPTION 'Billing artifact not found';
  END IF;

  INSERT INTO public.audit_logs (
    user_id, user_email, action, target_type, target_id, details, tenant_id
  )
  VALUES (
    auth.uid(),
    auth.jwt() ->> 'email',
    'BILLING_ARTIFACT_RECONCILED',
    p_document_kind,
    p_document_id::text,
    jsonb_build_object('storage_path', v_storage_path, 'status', p_status, 'reason', trim(p_reason)),
    v_tenant_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_billing_artifact(text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_billing_artifact(text, uuid, text, text) TO authenticated;

-- Corrective path: if the renderer, artifact retention, or document identity
-- contract changes, replace this table/policies in a reviewed forward
-- migration. Do not make the bucket public or grant direct artifact mutation
-- to authenticated users.
