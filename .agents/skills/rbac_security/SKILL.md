---
name: rbac-security
description: Route shielding, endpoint role guards, and IT admin audit logs.
---

# RBAC Security Agent Skill

## HARD RULES
- Log all mutations to the system audit trail (`public.audit_logs`).
- Restrict read access of `public.audit_logs` strictly to `admin@opusform.co.uk` and profiles with `admin` role. Block other admins or staff.
- Database tools and inspectors must run under read-only credentials.
- Enforce strict Least Privilege controls on all API gateways and page guards.

## EXECUTION PROTOCOL
1. **Verify Guards**: Inspect routing maps and route protection guards.
2. **Audit Logging**: Confirm that triggers or endpoint code log the target table, operation, user ID, timestamp, and differences.
3. **Verify Restrictive RLS**: Audit SELECT access on auditing logs to ensure only authorized administrators can query them.
