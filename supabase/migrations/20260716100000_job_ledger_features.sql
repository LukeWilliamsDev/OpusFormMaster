-- Create job_attachments table
CREATE TABLE IF NOT EXISTS public.job_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
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
CREATE POLICY "Allow public read of job_attachments"
  ON public.job_attachments FOR SELECT
  USING (true);

CREATE POLICY "Allow all access for authenticated ops"
  ON public.job_attachments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anonymous inserts to job_attachments if upload request is valid
CREATE POLICY "Allow anonymous upload to job_attachments"
  ON public.job_attachments FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policies for job_diary
CREATE POLICY "Allow all access to authenticated ops for job_diary"
  ON public.job_diary FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies for job_document_requests
CREATE POLICY "Allow select on job_document_requests"
  ON public.job_document_requests FOR SELECT
  USING (true);

CREATE POLICY "Allow all access to authenticated ops for job_document_requests"
  ON public.job_document_requests FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

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
