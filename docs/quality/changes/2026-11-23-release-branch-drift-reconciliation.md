# Release branch drift reconciliation

**Status:** READY_FOR_REVIEW
**Risk:** high
**Change category:** source, schema, release
**Accountable owner:** Opus Form operations owner
**Source of truth:** User decision that all approved changes must land on `promote-live` and that parallel release/date branches must not drift.

## Intent

Bring the approved job-date and range-only schedule changes onto the release branch while preserving the later media-upload release work. Leave one release source of truth and do not deploy or mutate remote services as part of this reconciliation.

## Scope

### In scope

- Reconcile `letta/job-date-live-baseline-93ca8499` into the release line based on `promote-live`.
- Preserve the release branch's compressed job media/video changes.
- Preserve the date migration, native date fields, schedule range filtering, date editors, and focused regression tests.
- Record branch/release provenance and a repeatable no-drift check.

### Out of scope

- Pushing branches or deploying Cloudflare/Supabase changes.
- Applying migrations or changing remote data.
- Merging unrelated `main`, `dev`, or dirty primary-worktree changes.
- Declaring production or authenticated browser acceptance.

### Changed files

- `docs/quality/changes/2026-11-23-release-branch-drift-reconciliation.md`
- `scripts/check-release-reconciliation.mjs`
- `src/integrations/supabase/types.ts`
- `src/opus/components/ActiveJobLedger.tsx`
- `src/opus/components/JobDetails.tsx`
- `src/opus/components/calendar/CalendarBoard.tsx`
- `src/opus/components/calendar/MonthCalendar.tsx`
- `src/opus/components/calendar/ProjectDayList.tsx`
- `src/opus/components/calendar/WeekGridProject.tsx`
- `src/opus/components/calendar/__tests__/jobPeriods.test.ts`
- `src/opus/components/calendar/jobPeriods.ts`
- `src/opus/context/PortalContext.tsx`
- `src/opus/pages/JobLedger.tsx`
- `src/opus/pages/LaborRoster.tsx`
- `src/opus/types/erp.ts`
- `supabase/functions/_shared/billing-pdf.ts`
- `supabase/functions/send-final-bill/index.ts`
- `supabase/functions/send-quote-pdf/index.ts`
- `supabase/migrations/20261116130700_add_job_date_period.sql`

The five historical date contracts and completion notes are intentionally not
copied as separate changed files: this single reconciliation contract is the
release-line evidence record, and the immutable source evidence remains
traceable through `d4812427bf0b466c7393fe655c68d00f037579e8`,
`8b666add526d9151cba568dcf474ad8e4ca2108e`,
`6549106d51add2d8ac6eedfefe4a65b79bed663a`,
`7e0ab9b8b78b85472c4bcffa4f4009e0305e2269`, and
`3db8dd8b3ead7ade3d0cef8e9614984a05e01165`. The committed reconciliation
check verifies those commits remain ancestors of the date baseline and fails if
the release diff contains files outside this contract's allowlist.

## Acceptance criteria

- [x] `promote-live` contains the approved date migration and all date-aware source changes.
- [x] Schedule → Sites excludes jobs without valid inclusive date ranges on mobile and desktop.
- [x] Date editing rejects partial, invalid, and reversed ranges and persists through the existing job path.
- [x] Staff scheduling and shift assignment behavior remain unchanged.
- [x] Compressed media/video release changes remain present after reconciliation.
- [x] A deterministic branch/provenance check identifies missing release-only changes before release validation.
- [x] Focused tests, typecheck, lint, build, and the staged contract gate pass; the full repository gate was run and its unchanged baseline formatting blocker is recorded.

## Invariants and risks

- Store dates as native database dates/ISO values and display them as UK dates.
- Do not widen tenant/RLS or role access while reconciling the branches.
- The date migration is a schema change; remote migration state and deployment provenance remain human approval gates.
- Existing dirty changes in the primary checkout are not present in this isolated worktree and must not be silently discarded.

## Risk and approval gates

- The date migration adds nullable `jobs` columns with a database check constraint;
  existing tenant/RLS policies remain the access boundary, and remote application
  requires migration-ledger reconciliation by the accountable owner.
- Before remote application, inspect the migration ledger and `jobs` schema. If
  neither column exists, apply the migration once. If exactly one column exists,
  add only the missing nullable `date` column through a reviewed corrective
  migration, then check rows before adding the constraint. If both columns exist
  without the constraint, check rows and add the constraint only after invalid
  rows are reviewed. If both columns and the constraint already exist, reconcile
  the ledger instead of replaying SQL. Never drop columns or rewrite production
  data; rollback is a reviewed forward corrective migration or a source revert.
- The read-only inspection is: `select column_name, data_type from
information_schema.columns where table_schema = 'public' and table_name =
'jobs' and column_name in ('start_date', 'end_date');`, followed by `select
conname, pg_get_constraintdef(oid) from pg_constraint where conrelid =
'public.jobs'::regclass and conname = 'jobs_date_period_check';` and `select
count(*) from public.jobs where (start_date is null) <> (end_date is null)
or (start_date is not null and end_date < start_date);`. A one-column schema
  must be completed before the constraint is referenced. A partial schema is
  repaired only through a reviewed forward migration: fix or quarantine any
  invalid rows under named approval, add the constraint `NOT VALID`, validate it,
  then reconcile the migration ledger. This session does not run those queries.
- The release branch is the sole source of truth after promotion. The date-baseline
  branch is historical input only and must not receive follow-up release changes.
- No Supabase, Cloudflare, GitHub, Resend, or production command is authorized by
  this local reconciliation. Composio-first service routing remains required for
  any later connected-service action.

## Verification plan

- Compare the reconciled tree against both source branches and verify release-only media files remain.
- Run `node scripts/check-release-reconciliation.mjs --base 06c26b8 --date-baseline letta/job-date-live-baseline-93ca8499 --release HEAD` after the merge commit; it verifies ancestry, required date files, preserved media baseline files, historical evidence commits, and the exact release diff allowlist.
- Run the focused job-period tests, typecheck, changed-file lint, full quality gate, and a fresh read-only critic pass.
- Keep human approval **PENDING** for commit, push, migration application, and deployment.

## Verification evidence

| Check                    | Evidence                                                                                                                                                                                                                                                           | Result                                                                                                                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Branch inventory         | `origin/promote-live@06c26b8` is the remote release base and already contains the staff-dossier changes; the date baseline contains 11 approved schedule/date commits being reconciled; primary checkout dirty changes were preserved separately                   | PASS                                                                                                                                                                                                                                                   |
| Merge                    | Remote-based reconciliation from `origin/promote-live@06c26b8` applied cleanly; the date-baseline lineage merge required the intentional current-`JobDetails.tsx` resolution and retained the single reconciled release tree                                       | PASS                                                                                                                                                                                                                                                   |
| Focused tests            | `npx vitest run src/opus/components/calendar/__tests__/jobPeriods.test.ts` — 4 tests passed                                                                                                                                                                        | PASS                                                                                                                                                                                                                                                   |
| Typecheck                | `npm run typecheck`                                                                                                                                                                                                                                                | PASS                                                                                                                                                                                                                                                   |
| Changed-file lint        | `npx eslint` over reconciled schedule/date files — 0 errors, 10 existing warnings                                                                                                                                                                                  | PASS                                                                                                                                                                                                                                                   |
| UI source review         | Read-only review of responsive mobile `ProjectDayList`, desktop `WeekGridProject`, month calendar, labelled date controls, focusable buttons, and empty/invalid-range states; browser automation was not run because Playwright is unavailable in this environment | PASS — source review; browser acceptance pending                                                                                                                                                                                                       |
| Full quality gate        | `npm run quality:gate`                                                                                                                                                                                                                                             | BLOCKED — untouched baseline contracts `docs/quality/changes/2026-11-13-opusform-master-remediation.md` and `docs/quality/changes/2026-11-19-job-media-video-and-compression.md` fail the repository-wide Prettier check; all changed-file checks pass |
| Staged contract gate     | `QUALITY_BASE_REF=origin/promote-live node scripts/quality-gate.mjs --staged-only --contract-only`                                                                                                                                                                 | PASS — 19-file reconciliation manifest and fingerprint                                                                                                                                                                                                 |
| No-drift lineage         | `node scripts/check-release-reconciliation.mjs --base 06c26b8 --date-baseline letta/job-date-live-baseline-93ca8499 --release HEAD`                                                                                                                                | PASS — HEAD contains the date baseline, preserves all media baseline files, and matches the 19-file reconciliation allowlist                                                                                                                           |
| Live/schema verification | No remote migration, deployment, or authenticated browser check performed                                                                                                                                                                                          | NOT RUN                                                                                                                                                                                                                                                |

**Evidence base:** `origin/promote-live@06c26b8` (remote release base)
**Evidence head:** `aa9e3b1` (`Merge date baseline lineage into release reconciliation.`)
**Evidence fingerprint:** `f5c5b7d454790cf857c558c6be45606c91db3004e80d16781147dcd30d44dd00`

## Critic review

- Critic status: complete
- Verdict: PASS
- Findings: Historical evidence is traceable; the ref-based checker validates the exact merge tree, all media baseline files, overlapping JobDetails media behavior, date files, and the allowlist. Date filtering, editor validation, persistence path, role/RLS boundaries, and migration correction gates remain scoped.
- Unresolved blocking findings: none
- Repair iterations: 3

## Release decision

- Automated gate: PASS for staged contract, focused tests, typecheck, lint, build/budget, and post-commit release-lineage checks; repository-wide gate remains blocked by the unchanged baseline formatting exception recorded above.
- Release status: READY_FOR_HUMAN_APPROVAL
- Human approval: PENDING
- Residual uncertainty: The hosted deployment and authenticated production schedule have not been verified in this reconciliation.
