# Opus Form change contract — Foreman live rollout

**Status:** READY_FOR_REVIEW
**Risk:** high
**Change category:** source | database | security | documentation
**Accountable owner:** Opus Form director / named repository reviewer
**Source of truth:** Approved Foreman UX/security rollout and live role-boundary decisions
**Evidence base:** `25119de841988f57d9890c80f2e89da16bd92660`
**Evidence head:** `HEAD`
**Evidence fingerprint:** `00aa300993e472d8fe8491eece9f296cf47e2ed227d262471b13b08cc50de8a0`

## Intent

Ship the Foreman assigned-site workspace and role-specific portal boundaries while
preserving tenant isolation, private attachment access, completed-site protections,
and the existing management and third-party workflows.

## Scope

### In scope

- Foreman Today/site updates, issues, notes, replies, and assigned-site access.
- Management, third-party, and Labourer navigation, Help, route, and RLS boundaries.
- Tenant-compatible forward migrations and canonical remote ledger recording.
- Private attachment paths, live QA acceptance, and migration replay guards.
- Responsive, accessible UI and role-aware portal navigation.

### Out of scope

- Rewriting the older divergent production migration history.
- Running `supabase db push` against the historically divergent ledger.
- Autonomous human approval, legal/compliance sign-off, or unrelated product work.

### Changed files

- `.husky/pre-commit`
- `docs/releases/2026-10-01-foreman-live-migration-reconciliation.md`
- `docs/quality/changes/2026-10-01-foreman-release.md`
- `scripts/quality-gate.mjs`
- `src/components/application/app-navigation/base-components/nav-list.tsx`
- `src/components/application/app-navigation/sidebar-navigation/sidebar-slim.tsx`
- `src/components/ui/button.tsx`
- `src/integrations/supabase/types.ts`
- `src/opus/App.tsx`
- `src/opus/components/FeedTab.tsx`
- `src/opus/components/ForemanJobNotesPanel.tsx`
- `src/opus/components/ForemanTodaySiteUpdate.tsx`
- `src/opus/components/JobDetails.tsx`
- `src/opus/components/RosterView.tsx`
- `src/opus/components/ThirdPartyDataState.tsx`
- `src/opus/context/PortalContext.tsx`
- `src/opus/layouts/PortalLayout.tsx`
- `src/opus/lib/__tests__/attachmentUrl.test.ts`
- `src/opus/lib/attachmentUrl.ts`
- `src/opus/pages/CertificateCheckerPage.tsx`
- `src/opus/pages/ForemanSitePage.tsx`
- `src/opus/pages/ForemanSitesPage.tsx`
- `src/opus/pages/ForemanWorkspace.tsx`
- `src/opus/pages/LaborRoster.tsx`
- `src/opus/pages/MyShiftsPage.tsx`
- `src/opus/pages/PortalAuth.tsx`
- `src/opus/pages/PortalContact.tsx`
- `src/opus/pages/PortalHelp.tsx`
- `src/opus/utils/__tests__/siteStatus.test.ts`
- `src/opus/utils/siteStatus.ts`
- `src/routes/__root.tsx`
- `src/styles.css`
- `supabase/migrations/20260712031941_ab46798d-082b-4f7f-a693-0c1719ab9585.sql`
- `supabase/migrations/20260712110000_rename_workers_to_staff.sql`
- `supabase/migrations/20260722030000_fix_search_path_lints.sql`
- `supabase/migrations/20260723130000_fix_supabase_advisories.sql`
- `supabase/migrations/20260808130000_add_invoices_final_bills.sql`
- `supabase/migrations/20260808170000_block_writes_for_inactive_profiles.sql`
- `supabase/migrations/20260922120000_security_remediation.sql`
- `supabase/migrations/20260925010000_security_remediation.sql`
- `supabase/migrations/20260925020100_fix_storage_policy_outer_reference.sql`
- `supabase/migrations/20260928085000_foreman_remote_tenant_compatibility.sql`
- `supabase/migrations/20260928090100_site_foreman_workspace_access.sql`
- `supabase/migrations/20260929090000_foreman_job_note_conversations.sql`
- `supabase/migrations/20260929100000_foreman_access_hardening.sql`
- `supabase/migrations/20260929110000_foreman_release_security.sql`
- `supabase/migrations/20260929120000_reconciled_foreman_schema.sql`
- `supabase/migrations/20260929130000_management_certificate_access.sql`
- `supabase/migrations/20260930100000_exclude_labourer_operational_data.sql`

## Acceptance criteria

- [x] `AC-1`: All seven QA roles pass live login, landing, Help, and route-guard checks — evidence: `/tmp/live-acceptance-all.log`.
- [x] `AC-2`: Foreman diary, issue, note, attachment, and Operations reply mutations pass live — evidence: `/tmp/live-mutation-acceptance.log`.
- [x] `AC-3`: Labourer operational reads/writes and completed-site Foreman writes are denied live — evidence: `/tmp/live-mutation-acceptance.log`.
- [x] `AC-4`: Temporary mutation rows and attachment objects are removed; persistent QA accounts remain isolated in their own tenant — evidence: remote read-only cleanup query and tenant-scoped RLS policies.
- [x] `AC-5`: Local typecheck, tests, schema lint, build, and quality checks pass — evidence: recorded commands below and CI.

## Risk and approval gates

- RLS, tenant, storage, role, and completed-site boundaries are security-sensitive; remote schema and policy evidence was queried after deployment.
- Migrations are forward-only on the live project. Older historical migration divergence remains documented; do not run `supabase db push` until separately reconciled.
- QA credentials are stored outside Git with mode `0600` in the local secure QA file; the service-role key is never written to disk by this workflow.
- The release changes live schema, storage policy, and external Worker state; the user explicitly approved those effects.
- Human approval required: PENDING — repository reviewer should approve PR #40 and the live role rollout.

## Verification evidence

| Check                    | Exact command or evidence                               | Result                |
| ------------------------ | ------------------------------------------------------- | --------------------- |
| Contract                 | `QUALITY_BASE_REF=origin/main npm run quality:contract` | PASS                  |
| Typecheck                | `npm run typecheck`                                     | PASS                  |
| Tests                    | `npm test`                                              | 131 passed, 1 skipped |
| Schema                   | `npx supabase db lint --local`                          | PASS                  |
| Build                    | `npm run build`                                         | PASS                  |
| Live route acceptance    | `/tmp/live-acceptance-all.log`                          | PASS                  |
| Live mutation acceptance | `/tmp/live-mutation-acceptance.log`                     | PASS                  |
| Live endpoints           | `https://opusform.co.uk` and Worker endpoint            | HTTP 200              |
| Remote schema/RLS        | Composio Supabase read-only catalog/policy checks       | PASS                  |

## Critic review

- Critic context/identity: independent read-only chair review plus migration and release audits.
- Review input: commits `32eed6c`, `12e8074`, merged main, live schema evidence, local and live acceptance logs.
- Verdict: `PASS`
- Findings: deployment provenance was repaired by redeploying the clean source with commit identifiers; stale management Help assertions were corrected to open the menu before checking visibility.
- Unresolved blocking findings: `none`
- Repair iterations: `3`

## Release decision

- Automated gate: `PASS` locally; CI rerun pending after contract repair
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty or exception: older historical migration filenames remain divergent; current Foreman migrations are canonically recorded and safe to replay only through the documented forward/direct-application process.
