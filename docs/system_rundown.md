# Opus Form System Architecture & Development Rundown

This document provides a comprehensive overview of the **Opus Form** ERP portal codebase, database structure, role-based access controls (RBAC), and deployment guidelines.

---

## 1. Technological Stack Overview

Opus Form is structured as a modern SPA with a robust database backend:
* **Frontend Core**: built on **React 19** and **TypeScript**, packaged using **Vite**.
* **Routing**: Uses a dual routing setup. The root router is **TanStack Start/Router**, which loads the main React Router DOM SPA (`App.tsx`) under the splat (`/` and `/$`) routes. All sub-routing within the secure portal is handled via `react-router-dom`.
* **Styling**: Powered by **TailwindCSS** (via `@tailwindcss/vite` integration) for a Dark Corporate/Industrial aesthetic.
* **Backend & Database**: Standalone **Supabase** instance, leveraging PostgreSQL schemas, Row-Level Security (RLS) policies, triggers, and Deno edge functions.
* **PDF Utility**: Client-side document generation via `html2pdf.js` (clamped to a fixed 794x1122px viewport for print-to-scale compliance).
* **Map Proximity**: Leaflet-based map integration using postcode geocoding and the Haversine formula to compute distance-based schedule assignments.

---

## 2. Key Interface Map & Page Flow

Here is a map of the pages and public routes of the application:

```mermaid
graph TD
    A[Public Landing Page /] -->|Portal Access| B[Portal Login /portal]
    A -->|Direct Access| C[Credentials Upload Portal /submit-credentials]
    B -->|Operative Auth| D[Labor Roster Calendar View]
    B -->|Dispatcher/Admin Auth| E[Dashboard /portal/dashboard]
    B -->|admin@opusform.co.uk Auth| F[Audit Log Page /portal/audit]
    B -->|admin@opusform.co.uk Auth| J[Policies Page /portal/policies]
    
    E --> G[Job Ledger /portal/ledger]
    E --> H[Labor Roster & Dossier /portal/roster]
    E --> I[Pipeline & Quote Builder /portal/pipeline]
```

### Page Breakdown & Functions
1. **Landing Page (`/`)**: A clean splash page featuring the corporate branding and an entry path to the secure portal.
2. **Portal Authentication Page (`/portal`)**: Manages secure email/password logins, password reset trigger requests, and passwordless session updates. Incorporates staggered animation effects.
3. **Dashboard Page (`/portal/dashboard`)**: Displays project counts, crew size metrics, and features the **Expiry Radar** widget highlighting workers with upcoming or expired compliance certificates.
4. **Labor Roster & Dossier (`/portal/roster`)**:
   * **Roster View**: A clean list-only layout with active sorting (A-Z) and search capability (grid/matrix toggles have been removed).
   * **Dossier Drawer**: Slide-out drawer (`max-w-2xl`) with detailed employee profiles, postcodes, active certifications (CSCS, etc.), compliance history, and proximity scheduling maps.
5. **Job Ledger (`/portal/ledger`)**: Formats active sites, contractor info, and tracks concrete pour statuses (Current vs. Max contract pours).
6. **Pipeline & Quote Builder (`/portal/pipeline`)**: Tracks work stages (Quotes, Contracts, Jobs, Complete) and features a stepper-based invoice/quote editor generating standardized tax PDFs.
7. **System Audit Trail (`/portal/audit`)**: Restored strictly to the primary auditor. Displays timestamped events, category-filtered grids, and structured JSON diff tables comparing database changes.
8. **Compliance Policies Page (`/portal/policies`)**: Restored strictly to the primary auditor. Displays cards and links to view official company policies.
9. **Submit Credentials Page (`/submit-credentials`)**: A public, passwordless portal where operatives can drag-and-drop compliance documents. Validated against tokens in `document_requests`.
10. **Job Document Upload Page (`/job-upload/:token`)**: A public, passwordless portal where external third-parties can upload files requested for specific jobs.

---

## 3. Database Schema & Storage

The Supabase project (`fgpthpxmiroyebrzjdzo`) operates on the following tables:

| Schema & Table | Key Fields | Purpose |
| :--- | :--- | :--- |
| `public.profiles` | `id (uuid)`, `email`, `role (app_role)`, `full_name`, `tenant_id` | Links auth users to application access level and tenant. |
| `public.staff` | `id (text)`, `name`, `role`, `email`, `postcode`, `tickets (jsonb)`, `is_archived (bool)`, `uploaded_certificates (jsonb)` | Core operative details, certifications, and compliance tickets database. |
| `public.jobs` | `id (text)`, `job_ref`, `site_name`, `postcode`, `current_pours`, `contract_max_pours`, `schedule_value`, `status` | Project definitions, pour tallies, site details, and financial allocations. |
| `public.shifts` | `id (text)`, `worker_id`, `job_id`, `date (date)` | Shift scheduler tracking associations. |
| `public.quotes` | `id (uuid)`, `reference`, `client_info (jsonb)`, `items (jsonb)`, `totals (jsonb)`, `vat_rate (numeric)` | Stores generated invoice and quote data (totals, clients, items). |
| `public.document_requests` | `id (uuid)`, `worker_id`, `requested_certs (text[])`, `expires_at`, `completed_at` | Session tokens for 48-hour secure operative document uploads. |
| `public.audit_logs` | `id (uuid)`, `user_email`, `action`, `target_type`, `target_id`, `details (jsonb)` | Central audit trail tracking logins, updates, and accesses. |
| `public.job_attachments` | `id (uuid)`, `job_id`, `file_name`, `file_url`, `type`, `uploaded_by` | Uploaded site drawings, before/after media, or other files linked to a job. |
| `public.job_diary` | `id (uuid)`, `job_id`, `date`, `hs_checklist (jsonb)`, `notes` | Daily Site Diary records including daily mandatory H&S checklists and pour notes. |
| `public.job_document_requests` | `id (uuid)`, `job_id`, `token`, `expires_at`, `completed_at` | Secure tokens used to request job-related files from external third parties. |

### Supabase Storage Buckets
* **`compliance-documents`**: A private bucket configured with strict RLS policies.
  * Operatives are allowed to perform `INSERT` only inside the `requests/<token>/` path via their temporary link.
  * Only authenticated administrators can fetch or view objects inside this bucket.
* **`policies`**: A public bucket used to store official company compliance PDFs (Anti-Bribery, Health & Safety, etc.). Reads bypass API listing constraints by hardcoding file keys for enhanced security.
* **`job-attachments`**: A private bucket with RLS policies allowing authenticated uploads and anonymous uploads via secure link to hold site diaries, media, or other attachments.

---

## 4. Role-Based Access Control (RBAC)

The security model is implemented on both the frontend and database levels:

### A. Role Matrix

* **Operatives (`role = 'operative'`)**:
  * **Frontend**: Restricted strictly to their own roster view `/portal/roster?view=calendar`. Cannot view dashboards, ledger, pipeline, or audit trails.
  * **Database RLS**: Can only select their own row in `public.staff` (matching email in JWT) and their own allocations in `public.shifts`.

* **Dispatchers (`role = 'dispatcher'`)**:
  * **Frontend**: Full operational access to dashboards, ledger, roster, and quote builder.
  * **Database RLS**: Authorized by the security helper `private.can_write_ops(auth.uid())` to view and update `staff`, `jobs`, `shifts`, and `quotes`.

* **Admins (`role = 'admin'`)**:
  * **Standard Admin**: Inherits full dispatcher dashboard capabilities.
  * **Primary Security Admin (`admin@opusform.co.uk`)**:
    * **Frontend**: Redirected strictly to the `/portal/audit` System Audit Trail and has access to the `/portal/policies` page. Locked out of dispatcher tools.
    * **Database RLS**: The *only* account permitted to query the `public.audit_logs` table (verified via `auth.jwt() ->> 'email'`).

### B. Prevention of Privilege Escalation
A database trigger on `public.profiles` (`prevent_role_self_escalation_trg`) enforces that roles cannot be modified except by users who already hold an `'admin'` role, calling the secure backend routine `private.has_role()`.

---

## 5. Local Development Setup

To run the application locally on your machine via Claude Code, follow these steps:

### 1. Install Dependencies
Navigate into the `opus-form-builder` folder and run the install command:
```bash
cd opus-form-builder
npm install
```

### 2. Configure Environment Variables
A `.env` file is already populated in the project root containing connections to the live Supabase project. If you need to verify or recreate it:
```env
VITE_SUPABASE_PROJECT_ID="fgpthpxmiroyebrzjdzo"
VITE_SUPABASE_URL="https://fgpthpxmiroyebrzjdzo.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<pub-anon-key>"
```

### 3. Spin Up Development Server
Run Vite's local dev utility:
```bash
npm run dev
```
Alternatively, execute the bootstrap batch scripts from your command terminal:
* Root: `dev.bat`
* Folder-level: `localDev.bat`

### 4. Enable Local SSL/TLS (Loopback Encryption)
If you require secure connection testing locally (highly recommended for authentication callback features and cookie handling), refer to [secure_hosting_guide.md](file:///c:/Users/Luke/Documents/OpusForm/opus-form-builder/secure_hosting_guide.md).
1. Install `mkcert` (via Chocolatey: `choco install mkcert` or Scoop: `scoop install mkcert`).
2. Run `mkcert -install` to register the local CA.
3. Run `mkcert localhost 127.0.0.1 ::1` to output certificates.
4. Bind them to Vite in `vite.config.ts`.
