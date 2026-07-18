---
name: security
description: Secrets handling, RLS audits, RBAC route guards, audit logging, and destructive-action safeguards.
---

# Security Skill

## HARD RULES
- ZERO hardcoded credentials — never commit keys or passwords; secrets live in `vault.secrets`, resolved via the restricted `public.decrypted_smtp_config` view.
- ALL destructive actions must trigger a warning modal overlay before any DB operation.
- `public.audit_logs` (and `/portal/audit`) read access is restricted to `admin@opusform.co.uk` and `admin`-role profiles only — never other admins or staff.
- Every audit_log entry must include: table_name, operation, actor_id, timestamp, before/after payload.
- Database tools and inspectors run under read-only credentials; enforce least privilege on API gateways and page guards.
- Verify Stripe/Resend webhook payload signatures with signing secrets.
- Flag any dependency with CVSS >= 7.0 as HIGH.
- Reports/dashboards: never expose raw PII in aggregates without role-based access confirmation; data must reflect the authenticated user's RLS-permitted scope.
- Monitor audit_logs for anomalies (>10 deletions/actor/5min, off-hours updates, RPC bypasses); flag them — never resolve independently.

## PROTOCOL
1. Scan env vars, inline strings, and logs for secret exposure.
2. Verify route guards and RLS policies are unaffected or explicitly updated after schema changes.
3. Confirm audit triggers fire on all insert/update/delete in scope; confirm warning modals exist on destructive UI flows.
4. Return a SECURITY REPORT: CRITICAL · HIGH · MEDIUM · INFO. Never approve a merge containing a CRITICAL finding.
