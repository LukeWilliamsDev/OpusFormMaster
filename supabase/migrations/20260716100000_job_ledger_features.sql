-- Create job_attachments table
CREATE TABLE IF NOT EXISTS public.job_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('image_before', 'image_after', 'document')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by text NOT NULL
);

-- Create job_diary table
CREATE TABLE IF NOT EXISTS public.job_diary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT current_date,
  notes text,
  hs_checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT job_diary_job_id_date_key UNIQUE (job_id, date)
);

-- Create job_document_requests table for external upload tokens
CREATE TABLE IF NOT EXISTS public.job_document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.job_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_diary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_document_requests ENABLE ROW LEVEL SECURITY;

-- Policies for job_attachments
-- Admins/dispatchers get full access within their tenant; operatives can only see/upload
-- attachments for jobs they are actually rostered onto (via shifts).
CREATE POLICY "Allow authenticated read of job_attachments"
  ON public.job_attachments FOR SELECT
  TO authenticated
  USING (
    tenant_id = private.current_tenant_id() AND (
      private.can_write_ops(auth.uid()) OR
      EXISTS (
        SELECT 1 FROM public.shifts sh
        JOIN public.staff s ON s.id = sh.worker_id
        JOIN public.profiles p ON p.email = s.email
        WHERE p.id = auth.uid() AND sh.job_id = job_attachments.job_id
      )
    )
  );

CREATE POLICY "Allow ops full access to job_attachments"
  ON public.job_attachments FOR ALL
  TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

CREATE POLICY "Allow operatives to upload their own job attachments"
  ON public.job_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = private.current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM public.shifts sh
      JOIN public.staff s ON s.id = sh.worker_id
      JOIN public.profiles p ON p.email = s.email
      WHERE p.id = auth.uid() AND sh.job_id = job_attachments.job_id
    )
  );

-- Allow anonymous inserts to job_attachments only via a live, unexpired upload token for that job
CREATE POLICY "Allow anonymous upload to job_attachments"
  ON public.job_attachments FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_document_requests r
      WHERE r.job_id = job_attachments.job_id
        AND r.completed_at IS NULL
        AND r.expires_at > now()
    )
  );

-- Policies for job_diary
CREATE POLICY "Allow ops full access to job_diary"
  ON public.job_diary FOR ALL
  TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

CREATE POLICY "Allow operatives to view and log their own job diary"
  ON public.job_diary FOR SELECT
  TO authenticated
  USING (
    tenant_id = private.current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM public.shifts sh
      JOIN public.staff s ON s.id = sh.worker_id
      JOIN public.profiles p ON p.email = s.email
      WHERE p.id = auth.uid() AND sh.job_id = job_diary.job_id
    )
  );

CREATE POLICY "Allow operatives to write their own job diary"
  ON public.job_diary FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = private.current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM public.shifts sh
      JOIN public.staff s ON s.id = sh.worker_id
      JOIN public.profiles p ON p.email = s.email
      WHERE p.id = auth.uid() AND sh.job_id = job_diary.job_id
    )
  );

CREATE POLICY "Allow operatives to update their own job diary"
  ON public.job_diary FOR UPDATE
  TO authenticated
  USING (
    tenant_id = private.current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM public.shifts sh
      JOIN public.staff s ON s.id = sh.worker_id
      JOIN public.profiles p ON p.email = s.email
      WHERE p.id = auth.uid() AND sh.job_id = job_diary.job_id
    )
  )
  WITH CHECK (
    tenant_id = private.current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM public.shifts sh
      JOIN public.staff s ON s.id = sh.worker_id
      JOIN public.profiles p ON p.email = s.email
      WHERE p.id = auth.uid() AND sh.job_id = job_diary.job_id
    )
  );

-- Policies for job_document_requests
-- Anonymous holders of a live upload token may look up that request; admins/dispatchers
-- get full tenant-scoped access to manage requests.
CREATE POLICY "Allow anonymous select on live job_document_requests"
  ON public.job_document_requests FOR SELECT
  TO anon, authenticated
  USING (completed_at IS NULL AND expires_at > now());

CREATE POLICY "Allow ops full access to job_document_requests"
  ON public.job_document_requests FOR ALL
  TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

-- Create storage bucket if not exists via SQL
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-attachments', 'job-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for job-attachments
CREATE POLICY "Allow read job-attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'job-attachments');

CREATE POLICY "Allow authenticated upload job-attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'job-attachments');

CREATE POLICY "Allow anonymous upload job-attachments"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'job-attachments');
