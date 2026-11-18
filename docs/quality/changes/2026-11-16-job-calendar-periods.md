# Opus Form change contract — job calendar periods

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** source | database
**Accountable owner:** Opus Form operations owner
**Source of truth:** User request to store job start/end dates, show jobs on the calendar for those periods, and make the change live
**Evidence base:** `promote-live@2ac49ba` / working tree
**Evidence head:** working tree
**Evidence fingerprint:** `26cf35c6502aea0531bb6e66f977ee5ac331a8ddabeab711ef810f75c6585556`

## Intent

Let management record an inclusive start/end period for a job and see that job on every matching day in the month calendar, while retaining existing shift-based calendar behavior for jobs without a period.

## Scope

### In scope

- Add nullable native `date` columns for job start and end dates, preserving existing rows.
- Carry the dates through the ERP type, Supabase mapping, generated database types, and job edit form.
- Render dated jobs on each calendar day in the inclusive period, with UK-formatted period context and detail-panel visibility.
- Add focused tests for date-range inclusion and invalid/incomplete periods.
- Repair the four pre-existing lint blockers required for the release gate without changing their behavior.
- Apply the approved Supabase migration and deploy the matching Cloudflare Worker only after local checks and release approval.

### Out of scope

- Backfilling dates for existing jobs.
- Changing shift assignment rules, RLS policy behavior, or external services.
- Unrelated production refactors, schema changes, or external-service changes.

### Changed files

- `.claude/completions/2026-11-16-job-calendar-periods.md`
- `supabase/migrations/20261116130700_add_job_date_period.sql`
- `src/integrations/supabase/types.ts`
- `src/opus/types/erp.ts`
- `src/opus/context/PortalContext.tsx`
- `src/opus/components/JobDetails.tsx`
- `src/opus/components/calendar/MonthCalendar.tsx`
- `src/opus/components/calendar/jobPeriods.ts`
- `src/opus/components/calendar/__tests__/jobPeriods.test.ts`
- `docs/quality/changes/2026-11-16-job-calendar-periods.md`
- `supabase/functions/_shared/billing-pdf.ts`
- `supabase/functions/send-final-bill/index.ts`
- `supabase/functions/send-quote-pdf/index.ts`

## Acceptance criteria

- [x] `AC-1`: A management user can set, update, or clear a job's start and end dates; incomplete or reversed periods are not saved — evidence: source inspection and focused test.
- [x] `AC-2`: A job with a valid period appears on every inclusive date in that period in the month calendar, including days without shifts — evidence: focused unit test and source inspection.
- [x] `AC-3`: Jobs without a period continue to appear on dates with shifts, and jobs do not duplicate when both a range and shift overlap — evidence: focused unit test.
- [x] `AC-4`: Calendar and job detail displays use UK `DD/MM/YYYY` formatting while persisted values remain ISO/native dates — evidence: source inspection.
- [x] `AC-5`: Repository quality checks pass against the final diff — evidence: exact commands recorded below.

## Risk and approval gates

- Existing jobs must remain readable with null periods; the database constraint only rejects a non-null end before a non-null start.
- The change is management-only through the existing job edit permissions; no new access path is introduced.
- The migration is forward-only: do not drop the new columns during rollback. If release correction is needed, disable date writes/rendering, retain the columns and data, and deploy a forward corrective migration. Dropping columns requires a separate data-preservation query and named approval.
- The existing tenant/RLS boundary is preserved; the new fields are on the tenant-scoped jobs row and no policy is broadened.
- Human approval required: yes — the requester explicitly approved the full release scope; the accountable release owner must still accept the exact migration and Worker provenance before completion.

## Verification evidence

| Check                 | Exact command or evidence                                                                                                                         | Result                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Contract              | `npm run quality:contract`                                                                                                                        | NOT RUN                     |
| Deterministic checks  | `npm run quality:gate`                                                                                                                            | NOT RUN                     |
| Focused tests         | `npx vitest run src/opus/components/calendar/__tests__/jobPeriods.test.ts`                                                                        | PASS — 4 tests              |
| Full tests            | `npm run test`                                                                                                                                    | PASS — 191 tests, 1 skipped |
| Typecheck             | `npm run typecheck`                                                                                                                               | PASS                        |
| Build/budget          | `VITE_SUPABASE_URL=https://fgpthpxmiroyebrzjdzo.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_quality_gate_local npm run build:budget` | PASS                        |
| Lint                  | `npm run lint`                                                                                                                                    | NOT RUN after repairs       |
| Manual/external check | Read-only implementation/diff review; no remote migration, Worker deployment, browser, or live verification yet                                   | NOT RUN                     |

## Critic review

- Critic context/identity: fresh read-only review of the production-baseline worktree before release
- Review input: final working-tree diff, this contract, date rules, and verification output
- Verdict: `PASS`
- Findings: The source-level review found no blocking, major, or medium implementation findings. The remote migration, Worker deployment, and live acceptance remain explicit release gates and are not claimed as completed here.
- Unresolved blocking findings: `none`
- Repair iterations: `2`

## Release decision

- Automated gate: `PASS`
- Release status: `NOT_RELEASED`
- Human approval: `PENDING`
- Residual uncertainty or exception: Remote migration application and production/browser acceptance remain outside this task.
