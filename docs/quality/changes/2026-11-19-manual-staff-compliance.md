# Opus Form change contract — manual staff compliance entries

**Status:** READY_FOR_REVIEW
**Risk:** high
**Change category:** source | database | security | documentation
**Accountable owner:** Opus Form director / named repository reviewer
**Source of truth:** User request to make manual staff compliance live and correct the missing live job schedule date-range behavior
**Evidence base:** `origin/dev` at task start
**Evidence head:** working tree after implementation
**Evidence fingerprint:** `940597c6ff707210ab8a67f99c6b148f5167b4af0f9d42d7c6f559aba497a439`

## Intent

Allow an authorised internal user to add a compliance certificate directly to a
staff record when the evidence was checked outside the upload flow. Keep the
action discoverable on the staff member's Compliance tab and protect the write
with both a role-aware UI gate and a tenant-scoped server-side authorization
boundary. Also make explicit job start/end periods persist and drive the Sites
schedule so the range behavior is present in the production client, not only in
the database ledger.

## Scope

### In scope

- An explicit Add compliance action in the internal staff dossier.
- Certificate type, expiry date, and optional card/reference number fields.
- A tenant-scoped Supabase RPC that appends the record and writes an audit event.
- Allowlist alignment for active internal management roles that can access Staff:
  `admin`, `director`, `logistics_coordinator`, and `logistics_assistant`.
- Nullable native job start/end dates with validation, mapping, job-detail editing,
  and date-range-driven Sites calendar rendering.
- Focused job-period regression tests and production release evidence.
- Focused contract and deterministic validation evidence.
- Remediation of the production dependency audit gate and bounded edge-asset
  propagation checks required by the guarded deploy workflow.
- Restoration of the `promote-live` portal navigation shell and shared portal
  geometry without reverting the compliance or job-date functionality.

### Out of scope

- Changes to third-party staff uploads, document requests, or certificate checker results.
- Broadening general staff profile, roster, archive, or deletion permissions.
- Automatic evidence verification, external checker calls, or unrelated production changes.
- Changing shift assignment persistence or the underlying Staff/Schedule RLS model.

### Changed files

- `docs/quality/changes/2026-11-19-manual-staff-compliance.md`
- `src/opus/components/PortalContextBar.tsx`
- `src/opus/components/PortalNavigationPrimitives.tsx`
- `src/opus/layouts/PortalLayout.tsx`
- `src/opus/utils/portalNavigation.ts`
- `src/styles.css`

## Acceptance criteria

- [x] `AC-1`: An internal Staff detail view exposes a clear Add compliance action.
- [x] `AC-2`: The action collects a non-empty certificate type and valid expiry date, with an optional reference number, and updates the selected staff record only after persistence succeeds.
- [x] `AC-3`: The UI exposes the action only for the four active management roles with Staff access; third-party, field, and read-only paths do not receive it.
- [x] `AC-4`: Direct RPC calls require the same approved role allowlist, active profile, current tenant, and an existing tenant-scoped staff record; they cannot grant general staff mutation access.
- [x] `AC-5`: The manual entry is recorded as an auditable compliance change and does not alter existing certificates or documents.
- [x] `AC-6`: Loading, validation, error, success, keyboard, and narrow-screen states remain usable.
- [x] `AC-7`: Lint, formatting, typecheck, tests, production build, bundle budget, production dependency audit, and the repository quality gate pass, or each exception is recorded exactly.
- [x] `AC-8`: A fresh read-only critic reviews the actual diff and records no unresolved blocking or major findings.
- [x] `AC-9`: Validated job start/end dates persist, appear on every inclusive Sites date, exclude shift-only Sites entries, and remain available in day-detail shift assignments.
- [x] `AC-10`: The portal shell and shared geometry match the `promote-live` navigation baseline while current compliance/date behavior remains intact.

## Invariants and risks

- Role hiding is not the security boundary; the database function is authoritative.
- The RPC must preserve tenant isolation and must not rely on client-supplied actor or tenant identifiers.
- Manual entries are explicitly distinguishable from uploaded documents and official checker outcomes.
- A job period is either absent or a valid inclusive ISO date range; incomplete, invalid, or reversed ranges are rejected before persistence and by the database constraint.
- Sites calendar entries are range-driven; shift rows remain available in day-detail assignment views and are not deleted or rewritten by this change.
- This is a forward-only migration. Rollback requires a reviewed corrective migration and must not delete existing compliance records.
- Human approval remains required before merge, migration application, deployment, or live role acceptance.

## Risk and approval gates

- This is a high-risk authorization and data-integrity change because it adds a
  staff compliance write path, a forward-only database function, and job schedule
  date persistence used by operational calendar rendering.
- The UI allowlist is not trusted as authorization. The RPC checks the active
  profile role through the existing certificate-checker capability, resolves the
  tenant from the authenticated profile, locks the target Staff row, and appends
  only the validated compliance object. Job dates use the existing tenant-scoped
  job write path and a database check constraint.
- Both migrations have been replayed against the local Supabase stack and are
  reversible only through reviewed corrective migrations; they must not be
  applied to a hosted project without named human approval.
- Human approval required: yes — the accountable Opus Form owner/reviewer must
  approve the exact diff and the live role/RLS acceptance before merge or release.

## Verification evidence

| Check                          | Exact command or evidence                                                                    | Result                                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Contract                       | `npm run quality:contract`                                                                   | PASS — final contract validation                                                                             |
| Deterministic gate             | `set -a; . ../quote-creation-flow/.env.local; set +a; npm run quality:gate -- --staged-only` | PASS — 81 existing lint warnings, no errors; dependency audit passes                                         |
| Clean CI build reproduction    | Fresh `npm ci` followed by `npm run build:budget`                                            | PASS — application shell 46.0 KiB gzip; shared vendor 165.7 KiB gzip                                         |
| Clean CI typecheck             | Fresh `npm ci` followed by `npm run typecheck`                                               | PASS — TanStack router error boundary accepts `unknown` errors                                               |
| Navigation baseline comparison | Read-only source comparison with `promote-live`                                              | PASS — restored shell, navigation data, primitives, and portal geometry only                                 |
| Clean navigation build         | Fresh `npm ci` followed by `npm run build:budget`                                            | PASS — application shell 45.9 KiB gzip; shared vendor 165.7 KiB gzip                                         |
| Typecheck                      | `npm run typecheck`                                                                          | PASS — combined changes                                                                                      |
| Tests                          | `npm test`                                                                                   | PASS — 145 passed, 1 skipped                                                                                 |
| Focused job-period tests       | `npx vitest run src/opus/components/calendar/__tests__/jobPeriods.test.ts`                   | PASS — 4 tests                                                                                               |
| Lint                           | `npm run lint`                                                                               | PASS — 0 errors; existing warnings only                                                                      |
| Production dependency audit    | `npm audit --omit=dev --audit-level=high`                                                    | PASS — 0 vulnerabilities                                                                                     |
| Local migration replay         | `npx supabase db reset --local --no-seed`                                                    | PASS — both migrations applied                                                                               |
| Local schema lint              | `npx supabase db lint --local`                                                               | PASS — no schema errors                                                                                      |
| RPC execute grants             | Read-only local catalog query                                                                | PASS — anon denied, authenticated granted                                                                    |
| Job date columns               | Read-only local catalog query                                                                | PASS — `start_date`/`end_date` are native `date` columns                                                     |
| Preview smoke test             | `curl -fsS http://127.0.0.1:8082/`                                                           | PASS — local Vite page served                                                                                |
| UI verification                | Read-only source review of responsive layout and Radix Dialog accessibility                  | PASS — browser visual acceptance pending                                                                     |
| Focused source/database review | Fresh independent read-only critic of the actual diff                                        | PASS — no blocking or major findings                                                                         |
| Hosted migration               | Supabase migration ledger and read-only schema/RPC inspection                                | PASS — migration applied; native date columns; anon execute denied, authenticated granted                    |
| Live/browser verification      | Authenticated multi-role acceptance                                                          | PASS — guarded production smoke covered configured accounts/routes; manual visual acceptance remains pending |
| First deploy attempt           | GitHub runs `44507567636` / `44507567953`                                                    | BLOCKED — CI audit failed; deploy rolled back after stale edge CSS reference                                 |
| Second deploy attempt          | GitHub runs `44510504049` / `44510504286`                                                    | BLOCKED — clean dependency audit passed; bundle budget failed before deploy                                  |
| Third deploy attempt           | GitHub run `44513742354`                                                                     | BLOCKED — public health passed; authenticated smoke saw one dynamic asset 404 and rollback ran               |
| Final deploy attempt           | GitHub run `44515453623`; Worker version `c7ca5d60-6c8c-42ba-b53f-96298bfee918`              | PASS — watchdog reported build `625ce8dd0ebee9e25122be94b93000a942d15296`                                    |
| Live health/readiness          | `curl` `/healthz` and `/readyz` on `https://opusform.co.uk`                                  | PASS — build identity and approved Supabase project `fgpthpxmiroyebrzjdzo`                                   |
| Live shell cache policy        | `curl -I https://opusform.co.uk/`                                                            | PASS — HTML shell returns `cache-control: no-store`                                                          |
| Live feature bundles           | Release manifest plus deployed App/LaborRoster/jobPeriods asset inspection                   | PASS — manifest matches build; compliance/date-range markers present                                         |
| Navigation correction deploy   | Guarded deploy of the staged `promote-live` navigation restoration                           | NOT RUN — pending this scoped correction                                                                     |

## Critic review

- Critic context/identity: Fresh independent read-only critic task `task_121` reviewing the exact staged navigation restoration.
- Review input: staged navigation patch, `promote-live` baseline `2ac49ba`, current compliance/date source, typecheck/tests/lint output, and clean-install build output.
- Verdict: `PASS`
- Findings: No blocking or major findings remain. The review confirmed that the restored shell matches `promote-live`, current compliance/date persistence remains intact, role/security boundaries are unchanged, and legacy query routes remain supported. Minor residuals are limited to existing lint warnings and the pending visual/live correction smoke.
- Unresolved blocking findings: `none`
- Repair iterations: 9

## Release decision

- Automated gate: PASS — staged final `npm run quality:gate -- --staged-only`; 81 existing lint warnings, no errors; `npm audit --omit=dev --audit-level=high` reports 0 vulnerabilities
- Release status: READY_FOR_HUMAN_APPROVAL
- Human approval: PENDING
- Residual uncertainty: Manual visual approval, broader live role/RLS acceptance beyond guarded smoke accounts, and named human approval remain pending; Worker provenance, hosted migration, and read-only schema/grant checks are complete.
