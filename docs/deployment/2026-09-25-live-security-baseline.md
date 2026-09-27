# Live Security Baseline — 2026-09-25

## Target

- Supabase project: `fgpthpxmiroyebrzjdzo` (`OpusForm`, `eu-west-2`)
- Live database: PostgreSQL 17.6.1.141
- Current production data tenant: `Opus Form Default` (`1e0c8366-be16-4734-8314-7ab7fd6afadc`)
- Other tenant rows exist but currently have no profiles, staff, or jobs.

## Before remediation

- `http://opusform.co.uk/` returned `200 OK` rather than redirecting to HTTPS.
- Production HTML responses did not include the planned security headers.
- Unauthenticated `send-quote-pdf` reached payload validation and returned `toEmail is required`.
- `job-attachments` was public and had no storage size/MIME limits.
- `compliance-documents` retained anonymous path-based read/upload policies.
- Live migrations through `20260924093000` include third-party portal tables and policies; the remediation migration preserves those branches.

## Rollback evidence

The pre-change migration history, table/column inventory, bucket configuration, policy inventory, and SECURITY DEFINER function ACL/search-path inventory were captured through the authenticated Composio Supabase read-only tools immediately before deployment. The original live state remains recoverable through a corrective migration; no data rows are deleted by the remediation migration.

## Release boundary

No production write has been made at the time this record was created. Apply the reconciled migration first, verify its recorded migration version and bounded policy invariants, then deploy Edge Functions and release the frontend.
