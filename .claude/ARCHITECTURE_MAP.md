# Architecture Map

Full detail: [docs/system_rundown.md](../docs/system_rundown.md)

---

## Directory Structure

```
src/
├── routes/          # TanStack Start root routes (__root.tsx, $.tsx splat → react-router-dom SPA)
├── components/       # Shared React components
├── hooks/
├── integrations/      # Supabase client, third-party integrations
├── lib/              # store.ts, utils
├── opus/              # Portal app (dashboard, roster, audit, policies, quotes)
```

## Key File Locations

- **Root router**: `src/routes/__root.tsx`, `src/router.tsx`
- **Server entry**: `src/server.ts`, `src/start.ts`
- **Supabase client**: `src/integrations/`
- **State**: `src/lib/store.ts`

## Database (Supabase Postgres, RLS everywhere)

| Table | Purpose |
|---|---|
| `public.staff` | Operative details, certs, tickets |
| `public.jobs` | Job/site definitions, pour tallies |
| `public.shifts` | Shift scheduling |
| `public.quotes` | Invoices/quotes |
| `public.document_requests` | 48h operative doc-upload tokens |
| `public.audit_logs` | Audit trail (admin@opusform.co.uk only) |
| `public.job_attachments`, `public.job_diary`, `public.job_document_requests` | Job files, site diary, third-party doc requests |

## RBAC

- **operative**: own roster only (`/portal/roster?view=calendar`), RLS scoped to own row
- **dispatcher**: full dashboard/ledger/roster/quotes via `private.can_write_ops()`
- **admin**: dispatcher powers + (if `admin@opusform.co.uk`) exclusive `/portal/audit`, `/portal/policies`, and sole read access to `audit_logs`
- Role escalation blocked by `prevent_role_self_escalation_trg` trigger

---

**Last Updated**: 2026-07-22
