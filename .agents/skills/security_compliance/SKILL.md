---
name: security-compliance
description: Audits code for hardcoded secrets, RLS policy validity, audit logging, and warning modals on destructive actions.
---

# Security & Compliance Agent Skill

## HARD RULES
- ZERO hardcoded credentials — all secrets via public.decrypted_smtp_config or vault.secrets.
- ALL destructive actions must trigger a warning modal overlay before any DB operation.
- RLS changes must never allow operatives to read other operatives' sensitive data.
- The system audit trail (`public.audit_logs` table and `/portal/audit` route) is restricted strictly to the primary administrator email `admin@opusform.co.uk` and must never be exposed to other admin accounts.
- All audit_log entries must include: table_name, operation, actor_id, timestamp, before/after payload.
- Flag any dependency with CVSS >= 7.0 as HIGH priority.

## EXECUTION PROTOCOL
1. **Check for secret exposure**: Audit env vars, inline strings, and logs.
2. **Coordinate with granular skills**:
   - For role shielding, role guards, and audit log access controls, consult [rbac_security](file:///c:/Users/Luke/Documents/OpusForm/.agents/skills/rbac_security/SKILL.md).
3. **Verify RLS policies**: Ensure they are unaffected or explicitly updated and secure.
4. **Confirm audit_log triggers**: Ensure triggers fire on all insert, update, and delete actions in scope.
5. **Check for missing warning modals**: Verify user interface flows for any destructive actions.
6. **Return SECURITY REPORT**: Structured with categories: CRITICAL · HIGH · MEDIUM · INFO.

- Never approve a merge that contains a CRITICAL finding.
