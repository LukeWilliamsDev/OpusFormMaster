-- Reconciliation migration. The remote project has 4 migrations applied
-- directly (not through this folder) between 2026-07-19 02:09 and 02:39 UTC:
--   fix_submit_job_attachment_schema_mismatch, replace_app_role_enum_with_org_roles,
--   rename_inbound_sales_rep_job_title, harden_job_tables_rls_and_function_search_paths.
-- Their exact original SQL isn't recoverable, so this captures the resulting
-- live state as idempotent statements instead of replaying history. Data-only
-- changes (the job title rename) are not included here; there's no schema
-- object to reconcile and no way to know the prior value safely.

-- 1. submit_job_attachment schema-mismatch fix: job_attachments never got a
--    tenant_id column, so the version in 20260719120000_secure_job_document_uploads.sql
--    (which inserts tenant_id) does not match what's live. This restores the
--    live, working definition.
CREATE OR REPLACE FUNCTION public.submit_job_attachment(
  p_token text,
  p_file_name text,
  p_file_url text
)
RETURNS void AS $$
DECLARE
  v_job_id text;
BEGIN
  SELECT job_id INTO v_job_id
  FROM public.job_document_requests
  WHERE token = p_token
    AND completed_at IS NULL
    AND expires_at > now();

  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'This upload link is invalid, expired, or has already been completed.';
  END IF;

  INSERT INTO public.job_attachments (job_id, type, file_name, file_url, uploaded_by)
  VALUES (v_job_id, 'document', p_file_name, p_file_url, 'External Contributor (via Link)');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 2. replace_app_role_enum_with_org_roles: profiles.role now uses these 6
--    organizational roles. Adding IF NOT EXISTS is a no-op live but makes the
--    enum reproducible from a clean database.
DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'director';
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'logistics_coordinator';
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'logistics_assistant';
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'site_foreman';
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'labourer';
END $$;

-- 3. harden_job_tables_rls_and_function_search_paths (a): pin search_path on
--    every SECURITY DEFINER function that was missing it.
ALTER FUNCTION public.check_email_registered(text) SET search_path TO 'public';
ALTER FUNCTION public.complete_job_document_request(text) SET search_path TO 'public';
ALTER FUNCTION public.get_document_request_details(uuid) SET search_path TO 'public';
ALTER FUNCTION public.get_job_document_request_details(text) SET search_path TO 'public';
ALTER FUNCTION public.handle_new_user() SET search_path TO 'public';
ALTER FUNCTION public.is_valid_job_document_token(text) SET search_path TO 'public';
ALTER FUNCTION public.log_anonymous_audit(text, text, text, text, jsonb) SET search_path TO 'public';
ALTER FUNCTION public.prevent_role_self_escalation() SET search_path TO 'public';
ALTER FUNCTION public.process_audit_log() SET search_path TO 'public';
ALTER FUNCTION public.set_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.submit_job_attachment(text, text, text) SET search_path TO 'public';

-- 3. harden_job_tables_rls_and_function_search_paths (b): explicit per-action
--    RLS policies on jobs / job_attachments / job_document_requests / shifts,
--    scoped through private.can_write_ops().
DROP POLICY IF EXISTS jobs_select_authenticated ON public.jobs;
CREATE POLICY jobs_select_authenticated ON public.jobs FOR SELECT TO authenticated
  USING (private.can_write_ops(auth.uid()));
DROP POLICY IF EXISTS jobs_insert_ops ON public.jobs;
CREATE POLICY jobs_insert_ops ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (private.can_write_ops(auth.uid()));
DROP POLICY IF EXISTS jobs_update_ops ON public.jobs;
CREATE POLICY jobs_update_ops ON public.jobs FOR UPDATE TO authenticated
  USING (private.can_write_ops(auth.uid())) WITH CHECK (private.can_write_ops(auth.uid()));
DROP POLICY IF EXISTS jobs_delete_ops ON public.jobs;
CREATE POLICY jobs_delete_ops ON public.jobs FOR DELETE TO authenticated
  USING (private.can_write_ops(auth.uid()));

DROP POLICY IF EXISTS job_attachments_select_ops ON public.job_attachments;
CREATE POLICY job_attachments_select_ops ON public.job_attachments FOR SELECT TO authenticated
  USING (private.can_write_ops(auth.uid()));
DROP POLICY IF EXISTS job_attachments_insert_ops ON public.job_attachments;
CREATE POLICY job_attachments_insert_ops ON public.job_attachments FOR INSERT TO authenticated
  WITH CHECK (private.can_write_ops(auth.uid()));
DROP POLICY IF EXISTS job_attachments_update_ops ON public.job_attachments;
CREATE POLICY job_attachments_update_ops ON public.job_attachments FOR UPDATE TO authenticated
  USING (private.can_write_ops(auth.uid())) WITH CHECK (private.can_write_ops(auth.uid()));
DROP POLICY IF EXISTS job_attachments_delete_ops ON public.job_attachments;
CREATE POLICY job_attachments_delete_ops ON public.job_attachments FOR DELETE TO authenticated
  USING (private.can_write_ops(auth.uid()));

DROP POLICY IF EXISTS job_document_requests_select_ops ON public.job_document_requests;
CREATE POLICY job_document_requests_select_ops ON public.job_document_requests FOR SELECT TO authenticated
  USING (private.can_write_ops(auth.uid()));
DROP POLICY IF EXISTS job_document_requests_insert_ops ON public.job_document_requests;
CREATE POLICY job_document_requests_insert_ops ON public.job_document_requests FOR INSERT TO authenticated
  WITH CHECK (private.can_write_ops(auth.uid()));
DROP POLICY IF EXISTS job_document_requests_update_ops ON public.job_document_requests;
CREATE POLICY job_document_requests_update_ops ON public.job_document_requests FOR UPDATE TO authenticated
  USING (private.can_write_ops(auth.uid())) WITH CHECK (private.can_write_ops(auth.uid()));
DROP POLICY IF EXISTS job_document_requests_delete_ops ON public.job_document_requests;
CREATE POLICY job_document_requests_delete_ops ON public.job_document_requests FOR DELETE TO authenticated
  USING (private.can_write_ops(auth.uid()));

DROP POLICY IF EXISTS shifts_select_authenticated ON public.shifts;
CREATE POLICY shifts_select_authenticated ON public.shifts FOR SELECT TO authenticated
  USING (
    private.can_write_ops(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.staff s ON s.email = p.email
      WHERE p.id = auth.uid() AND s.id = shifts.worker_id
    )
  );
DROP POLICY IF EXISTS shifts_insert_ops ON public.shifts;
CREATE POLICY shifts_insert_ops ON public.shifts FOR INSERT TO authenticated
  WITH CHECK (private.can_write_ops(auth.uid()));
DROP POLICY IF EXISTS shifts_update_ops ON public.shifts;
CREATE POLICY shifts_update_ops ON public.shifts FOR UPDATE TO authenticated
  USING (private.can_write_ops(auth.uid())) WITH CHECK (private.can_write_ops(auth.uid()));
DROP POLICY IF EXISTS shifts_delete_ops ON public.shifts;
CREATE POLICY shifts_delete_ops ON public.shifts FOR DELETE TO authenticated
  USING (private.can_write_ops(auth.uid()));
