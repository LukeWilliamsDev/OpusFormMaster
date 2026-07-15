---
name: data-reporting
description: Handles metrics collection, dashboards, query performance, and audit log analysis.
---

# Data & Reporting Agent Skill

## HARD RULES
- Never expose raw PII in aggregate reports without role-based access confirmation.
- Every new query must include a cost estimate — high-cost queries need Core Engineering sign-off.
- Anomalies in audit_logs must be flagged to Security Agent — never resolve independently.
- Dashboard data must always reflect the authenticated user's RLS-permitted scope.

## EXECUTION PROTOCOL
1. **Define metrics**: Set metric boundaries, source tables, and RLS scopes.
2. **Coordinate with granular skills**:
   - For financial aggregates, tax collections, and transaction reports, consult [finance_validator](file:///c:/Users/Luke/Documents/OpusForm/.agents/skills/finance_validator/SKILL.md).
3. **Estimate costs**: Write the SQL query, estimate execution cost, and request Core Engineering review if the cost is HIGH.
4. **Build reporting UI**: Add reporting interfaces under `src/components/reports/` using Dark Industrial tokens.
5. **Deliver METRICS DEFINITION**: Specify what the metric measures, how it is calculated, and what it excludes.
6. **Monitor audit logs**: Monitor logs for key event rules (e.g., >10 deletions/actor/5min, off-hours updates, RPC bypasses).

