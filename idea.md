# Opus Form

ERP portal for labor and compliance management in construction (concrete pour focused). SPA + Supabase backend.

## Stack

React 19 + TypeScript, TanStack Start/Router (root) + react-router-dom (portal sub-routes), Vite, TailwindCSS, Supabase (Postgres + RLS + Deno edge functions), Leaflet maps, html2pdf.js.

## What it does

- **Roster**: labor roster + operative dossier (certs, compliance, postcode-based proximity scheduling via Haversine).
- **Ledger**: active job sites, contractors, concrete pour tracking (current vs max contract pours).
- **Pipeline**: quote/contract/job stage tracker with stepper-based invoice/quote PDF builder.
- **Compliance**: operatives upload certs (CSCS etc) via passwordless token link (`/submit-credentials`); expiry tracked on dashboard "Expiry Radar".
- **Job documents**: external third parties upload job files via passwordless token link (`/job-upload/:token`).
- **Audit trail**: full audit log, locked to primary security admin only.
- **Policies**: company compliance PDFs (H&S, anti-bribery, etc).

## Roles (RBAC, enforced frontend + DB RLS)

- **Operative**: own roster/calendar only.
- **Dispatcher**: full ops — dashboard, ledger, roster, pipeline.
- **Admin**: dispatcher powers.
- **Primary security admin** (`admin@opusform.co.uk`): locked to audit trail + policies only, no ops tools.

## DB (Supabase project `fgpthpxmiroyebrzjdzo`)

Tables: profiles, staff, jobs, shifts, quotes, document_requests, audit_logs, job_attachments, job_diary, job_document_requests.
Storage buckets: compliance-documents (private), policies (public), job-attachments (private).
