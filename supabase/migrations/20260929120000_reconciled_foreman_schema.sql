-- Reconciled Foreman diary/issues schema. This migration is additive and keeps
-- the legacy diary payload (notes and hs_checklist) intact.

ALTER TABLE public.job_diary
  ADD COLUMN IF NOT EXISTS entry_status text NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS progress_status text NOT NULL DEFAULT 'on_track',
  ADD COLUMN IF NOT EXISTS work_summary text,
  ADD COLUMN IF NOT EXISTS blocker_details text,
  ADD COLUMN IF NOT EXISTS next_steps text,
  ADD COLUMN IF NOT EXISTS ready_for_next_shift text NOT NULL DEFAULT 'not_sure',
  ADD COLUMN IF NOT EXISTS issue_id uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by uuid;

ALTER TABLE public.job_diary
  DROP CONSTRAINT IF EXISTS job_diary_entry_status_check,
  DROP CONSTRAINT IF EXISTS job_diary_progress_status_check,
  DROP CONSTRAINT IF EXISTS job_diary_ready_for_next_shift_check,
  DROP CONSTRAINT IF EXISTS job_diary_work_summary_length_check,
  DROP CONSTRAINT IF EXISTS job_diary_blocker_details_length_check,
  DROP CONSTRAINT IF EXISTS job_diary_next_steps_length_check,
  ADD CONSTRAINT job_diary_entry_status_check
    CHECK (entry_status IN ('draft', 'submitted')),
  ADD CONSTRAINT job_diary_progress_status_check
    CHECK (progress_status IN ('on_track', 'at_risk', 'blocked')),
  ADD CONSTRAINT job_diary_ready_for_next_shift_check
    CHECK (ready_for_next_shift IN ('yes', 'no', 'not_sure')),
  ADD CONSTRAINT job_diary_work_summary_length_check
    CHECK (work_summary IS NULL OR length(work_summary) <= 10000),
  ADD CONSTRAINT job_diary_blocker_details_length_check
    CHECK (blocker_details IS NULL OR length(blocker_details) <= 10000),
  ADD CONSTRAINT job_diary_next_steps_length_check
    CHECK (next_steps IS NULL OR length(next_steps) <= 10000);

CREATE TABLE IF NOT EXISTS public.job_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT private.current_tenant_id()
    REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id text NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
  description text NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 10000),
  severity text NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  resolution_summary text CHECK (resolution_summary IS NULL OR length(resolution_summary) <= 10000),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_issues_tenant_job_idx ON public.job_issues(tenant_id, job_id);
CREATE INDEX IF NOT EXISTS job_issues_status_idx ON public.job_issues(tenant_id, status);

ALTER TABLE public.job_diary
  DROP CONSTRAINT IF EXISTS job_diary_issue_id_fkey,
  ADD CONSTRAINT job_diary_issue_id_fkey
    FOREIGN KEY (issue_id) REFERENCES public.job_issues(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS job_diary_issue_id_idx ON public.job_diary(issue_id);

CREATE OR REPLACE FUNCTION private.validate_job_diary_issue_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.issue_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.job_issues i
    WHERE i.id = NEW.issue_id
      AND i.job_id = NEW.job_id
      AND i.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'daily update issue must belong to the same job and tenant';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_job_diary_issue_link_trg ON public.job_diary;
CREATE TRIGGER validate_job_diary_issue_link_trg
  BEFORE INSERT OR UPDATE OF issue_id, job_id, tenant_id ON public.job_diary
  FOR EACH ROW EXECUTE FUNCTION private.validate_job_diary_issue_link();

-- A separate job and tenant FK does not prove that the job belongs to the
-- tenant, so enforce that relationship server-side for every write.
CREATE OR REPLACE FUNCTION private.validate_job_issue_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = NEW.job_id AND j.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'job issue job and tenant must match';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_job_issue_tenant_trg ON public.job_issues;
CREATE TRIGGER validate_job_issue_tenant_trg
  BEFORE INSERT OR UPDATE OF tenant_id, job_id ON public.job_issues
  FOR EACH ROW EXECUTE FUNCTION private.validate_job_issue_tenant();

CREATE OR REPLACE FUNCTION private.touch_job_issue_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS job_issues_set_updated_at ON public.job_issues;
CREATE TRIGGER job_issues_set_updated_at
  BEFORE UPDATE ON public.job_issues
  FOR EACH ROW EXECUTE FUNCTION private.touch_job_issue_updated_at();

-- Stamp diary authors and submission transitions from the authenticated actor;
-- clients cannot impersonate another author or rewrite submission history.
CREATE OR REPLACE FUNCTION private.stamp_job_diary_actor()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      NEW.created_by := auth.uid();
      NEW.tenant_id := private.current_tenant_id();
    ELSE
      NEW.created_by := OLD.created_by;
      NEW.job_id := OLD.job_id;
      NEW.tenant_id := OLD.tenant_id;
      NEW.date := OLD.date;
    END IF;
    NEW.updated_by := auth.uid();
    IF TG_OP = 'UPDATE' AND OLD.entry_status = 'submitted' THEN
      NEW.submitted_at := OLD.submitted_at;
      NEW.submitted_by := OLD.submitted_by;
    ELSIF NEW.entry_status = 'submitted' AND
      (TG_OP = 'INSERT' OR OLD.entry_status IS DISTINCT FROM 'submitted') THEN
      NEW.submitted_at := COALESCE(NEW.submitted_at, now());
      NEW.submitted_by := auth.uid();
    ELSIF NEW.entry_status = 'draft' AND TG_OP = 'INSERT' THEN
      NEW.submitted_at := NULL;
      NEW.submitted_by := NULL;
    END IF;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stamp_job_diary_actor_trg ON public.job_diary;
CREATE TRIGGER stamp_job_diary_actor_trg
  BEFORE INSERT OR UPDATE ON public.job_diary
  FOR EACH ROW EXECUTE FUNCTION private.stamp_job_diary_actor();

CREATE OR REPLACE FUNCTION private.stamp_job_issue_reporter()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      NEW.reported_by := auth.uid();
      NEW.tenant_id := private.current_tenant_id();
    ELSE
      NEW.reported_by := OLD.reported_by;
      NEW.job_id := OLD.job_id;
      NEW.tenant_id := OLD.tenant_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stamp_job_issue_reporter_trg ON public.job_issues;
CREATE TRIGGER stamp_job_issue_reporter_trg
  BEFORE INSERT OR UPDATE ON public.job_issues
  FOR EACH ROW EXECUTE FUNCTION private.stamp_job_issue_reporter();

-- Consolidate diary access while retaining assigned operative access.
DROP POLICY IF EXISTS "Allow ops full access to job_diary" ON public.job_diary;
DROP POLICY IF EXISTS "Allow operatives to view and log their own job diary" ON public.job_diary;
DROP POLICY IF EXISTS "Allow operatives to write their own job diary" ON public.job_diary;
DROP POLICY IF EXISTS "Allow operatives to update their own job diary" ON public.job_diary;
DROP POLICY IF EXISTS job_diary_select_site_foreman ON public.job_diary;
DROP POLICY IF EXISTS job_diary_insert_site_foreman ON public.job_diary;
DROP POLICY IF EXISTS job_diary_update_site_foreman ON public.job_diary;
DROP POLICY IF EXISTS job_diary_select_reconciled ON public.job_diary;
DROP POLICY IF EXISTS job_diary_insert_reconciled ON public.job_diary;
DROP POLICY IF EXISTS job_diary_update_reconciled ON public.job_diary;
CREATE POLICY job_diary_select_reconciled ON public.job_diary
  FOR SELECT TO authenticated USING (
    tenant_id = private.current_tenant_id() AND (
      private.can_write_ops(auth.uid()) OR
      private.can_view_assigned_job(auth.uid(), job_id) OR
      private.can_view_site_foreman_job(auth.uid(), job_id)
    )
  );
CREATE POLICY job_diary_insert_reconciled ON public.job_diary
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id = private.current_tenant_id() AND (
      private.can_write_ops(auth.uid()) OR
      private.can_write_assigned_job(auth.uid(), job_id) OR
      private.can_write_site_foreman_job(auth.uid(), job_id)
    )
  );
CREATE POLICY job_diary_update_reconciled ON public.job_diary
  FOR UPDATE TO authenticated USING (
    tenant_id = private.current_tenant_id() AND (
      private.can_write_ops(auth.uid()) OR
      private.can_write_assigned_job(auth.uid(), job_id) OR
      private.can_write_site_foreman_job(auth.uid(), job_id)
    )
  ) WITH CHECK (
    tenant_id = private.current_tenant_id() AND (
      private.can_write_ops(auth.uid()) OR
      private.can_write_assigned_job(auth.uid(), job_id) OR
      private.can_write_site_foreman_job(auth.uid(), job_id)
    )
  );

ALTER TABLE public.job_issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS job_issues_select_reconciled ON public.job_issues;
DROP POLICY IF EXISTS job_issues_insert_reconciled ON public.job_issues;
DROP POLICY IF EXISTS job_issues_update_ops ON public.job_issues;
DROP POLICY IF EXISTS job_issues_delete_ops ON public.job_issues;
CREATE POLICY job_issues_select_reconciled ON public.job_issues
  FOR SELECT TO authenticated USING (
    tenant_id = private.current_tenant_id() AND (
      private.can_write_ops(auth.uid()) OR
      private.can_view_assigned_job(auth.uid(), job_id) OR
      private.can_view_site_foreman_job(auth.uid(), job_id)
    )
  );
DROP POLICY IF EXISTS job_issues_insert_reconciled ON public.job_issues;
CREATE POLICY job_issues_insert_reconciled ON public.job_issues
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id = private.current_tenant_id() AND
    reported_by = auth.uid() AND (
      private.can_write_ops(auth.uid()) OR
      private.can_write_assigned_job(auth.uid(), job_id) OR
      private.can_write_site_foreman_job(auth.uid(), job_id)
    )
  );
-- Operations owns issue lifecycle updates in v1; Foremen and operatives have
-- no UPDATE policy, even when they can view or create an issue.
DROP POLICY IF EXISTS job_issues_update_ops ON public.job_issues;
CREATE POLICY job_issues_update_ops ON public.job_issues
  FOR UPDATE TO authenticated USING (
    tenant_id = private.current_tenant_id() AND private.can_write_ops(auth.uid())
  ) WITH CHECK (
    tenant_id = private.current_tenant_id() AND private.can_write_ops(auth.uid())
  );
-- Do not expose deletes; Operations can transition an issue to dismissed.
DROP POLICY IF EXISTS job_issues_delete_ops ON public.job_issues;

CREATE OR REPLACE FUNCTION private.audit_foreman_work_item()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_email text; v_action text; v_job_id text; v_tenant uuid; v_status text;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
  IF TG_TABLE_NAME = 'job_diary' THEN
    v_job_id := COALESCE(NEW.job_id, OLD.job_id);
    v_tenant := COALESCE(NEW.tenant_id, OLD.tenant_id);
    v_action := CASE
      WHEN TG_OP = 'INSERT' THEN 'JOB_DIARY_CREATED'
      WHEN NEW.entry_status = 'submitted' AND OLD.entry_status IS DISTINCT FROM 'submitted'
        THEN 'JOB_DIARY_SUBMITTED'
      ELSE 'JOB_DIARY_UPDATED'
    END;
  ELSE
    v_job_id := COALESCE(NEW.job_id, OLD.job_id);
    v_tenant := COALESCE(NEW.tenant_id, OLD.tenant_id);
    v_action := CASE WHEN TG_OP = 'INSERT' THEN 'JOB_ISSUE_CREATED' ELSE 'JOB_ISSUE_UPDATED' END;
  END IF;
  IF TG_OP = 'DELETE' THEN
    v_status := CASE WHEN TG_TABLE_NAME = 'job_issues'
      THEN to_jsonb(OLD) ->> 'status' ELSE to_jsonb(OLD) ->> 'entry_status' END;
  ELSE
    v_status := CASE WHEN TG_TABLE_NAME = 'job_issues'
      THEN to_jsonb(NEW) ->> 'status' ELSE to_jsonb(NEW) ->> 'entry_status' END;
  END IF;
  INSERT INTO public.audit_logs(user_id, user_email, action, target_type, target_id, details, tenant_id)
  VALUES (auth.uid(), v_email, v_action, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id)::text,
          jsonb_build_object('job_id', v_job_id, 'status', v_status), v_tenant);
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'foreman work item audit failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_job_diary_reconciled_trg ON public.job_diary;
CREATE TRIGGER audit_job_diary_reconciled_trg AFTER INSERT OR UPDATE ON public.job_diary
  FOR EACH ROW EXECUTE FUNCTION private.audit_foreman_work_item();
DROP TRIGGER IF EXISTS audit_job_issues_reconciled_trg ON public.job_issues;
CREATE TRIGGER audit_job_issues_reconciled_trg AFTER INSERT OR UPDATE ON public.job_issues
  FOR EACH ROW EXECUTE FUNCTION private.audit_foreman_work_item();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'job_issues') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_issues;
  END IF;
END $$;
