# Change Management

**Document:** QMS-006  
**Version:** 1.0  
**Last Reviewed:** July 2026

---

## 1. Purpose

Defines how changes to the Opus Form platform — code, database schema, configuration, and documentation — are proposed, reviewed, approved, and deployed.

---

## 2. Change Categories

| Category          | Examples                                                              | Approval Required                    |
| :---------------- | :-------------------------------------------------------------------- | :----------------------------------- |
| **Critical Fix**  | Security patch, data breach response, production outage               | Immediate — post-deploy review       |
| **Schema Change** | Database migration, new table, column modification, RLS policy change | Implementation plan + admin approval |
| **Feature**       | New page, component, edge function, integration                       | Implementation plan + admin approval |
| **Minor Fix**     | UI bug, typo, styling adjustment                                      | Direct commit to Dev branch          |
| **Documentation** | QMS updates, README changes, memory updates                           | Direct commit                        |

---

## 3. Change Process

### Standard Changes (Schema / Feature)

```
1. Developer Creates Implementation Plan (Artifact)
       ↓
2. Plan Reviewed by Admin
       ↓
3. Admin Approves or Requests Changes
       ↓
4. Developer Implements Changes
       ↓
5. Developer Verifies Changes (Manual Testing)
       ↓
6. Changes Committed to Dev Branch
       ↓
7. Walkthrough Artifact Created Summarising Changes
       ↓
8. Admin Reviews & Merges to Production
```

### Critical Fixes

```
1. Issue Identified (Severity: Critical/High)
       ↓
2. Fix Implemented Immediately
       ↓
3. Post-Deploy Review Within 24 Hours
       ↓
4. Root Cause Analysis & Documentation
```

---

## 4. Source Control

| Practice                | Standard                                                                 |
| :---------------------- | :----------------------------------------------------------------------- |
| **Primary branch**      | `Dev` branch for all development work                                    |
| **Commit convention**   | Use `/commit` skill: stage, commit with descriptive message, push to Dev |
| **Database migrations** | Versioned SQL files in `supabase/migrations/` with timestamp prefixes    |
| **No force-push**       | Never force-push to shared branches                                      |
| **Secrets**             | Never committed to source. Stored in Supabase Vault.                     |

---

## 5. Deployment

| Component               | Deployment Method                                                     |
| :---------------------- | :-------------------------------------------------------------------- |
| **Frontend**            | Cloudflare Pages — auto-deploys from Git on push to production branch |
| **Edge Functions**      | Supabase CLI — `supabase functions deploy <name>`                     |
| **Database Migrations** | Supabase CLI — `supabase db push` or applied via MCP tool             |
| **Configuration**       | Environment variables managed via Supabase dashboard and `.env`       |

---

## 6. Rollback Procedures

- **Frontend:** Cloudflare Pages supports instant rollback to any previous deployment
- **Database:** Migrations are append-only. Reversals require a new corrective migration with admin approval
- **Edge Functions:** Previous versions can be redeployed via Supabase CLI

---

## 7. Review & Audit

- All changes are tracked in Git commit history
- Database changes are additionally logged in `public.audit_logs`
- Quarterly reviews assess change frequency, incident rates, and process adherence
- Security-impacting changes trigger a security headers and RLS policy review
