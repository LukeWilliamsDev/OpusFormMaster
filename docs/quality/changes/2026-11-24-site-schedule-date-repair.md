# Opus Form change contract — site schedule date visibility

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** source | documentation
**Accountable owner:** Luke Williams / Opus Form owner
**Source of truth:** User decision in the 2026-11-24 conversation: every job must have an attached date period to appear in the Sites schedule.
**Evidence base:** `origin/promote-live` at `dd912b5688f45b3eb4c1969379277075098e5ea2`
**Evidence head:** working tree
**Evidence fingerprint:** `f775cafca89a4b46948eec53f80af23475bbd879dfd24c79853a918771e9229c`

## Intent

Restore an understandable, usable Sites schedule without showing undated jobs as if
they were scheduled. New jobs must receive a valid inclusive start/end period before
creation completes; existing undated jobs must be clearly surfaced for date entry.

## Scope

### In scope

- Require a valid date period during quote-to-job conversion.
- Give the Sites calendar a clear missing-date state for active jobs that are hidden by the date rule.
- Keep the existing invariant that only jobs whose period contains the viewed date appear in Sites.
- Give local/demo job fixtures valid periods so the schedule is not empty in demo mode.

### Out of scope

- Inventing or bulk-writing dates for existing production jobs.
- Changing Supabase schema, RLS, deployment, or external services.
- Showing undated jobs inside a dated Sites schedule.

### Changed files

- `docs/quality/changes/2026-11-24-site-schedule-date-repair.md`
- `.claude/completions/2026-11-24-site-schedule-date-repair.md`
- `src/opus/context/PortalContext.tsx`
- `src/opus/components/PipelineRegistry.tsx`
- `src/opus/components/ActiveJobLedger.tsx`
- `src/opus/components/JobDetails.tsx`
- `src/opus/components/HistoryTab.tsx`
- `src/opus/components/calendar/AssignSheet.tsx`
- `src/opus/components/calendar/CalendarBoard.tsx`
- `src/opus/hooks/useShiftActions.ts`

## Acceptance criteria

- [x] `AC-1`: A newly converted, activated, or edited active job cannot be saved/activated without valid start and end dates — evidence: conversion UI, status action, Job Ledger, Job Details, and source inspection.
- [x] `AC-2`: The Sites view and assignment picker continue to show/use only jobs whose inclusive period contains the selected date — evidence: existing `jobPeriods` tests, assignment mutation guard, and source inspection.
- [x] `AC-3`: Active jobs without dates are explicitly identified with a path to set dates instead of silently disappearing — evidence: calendar UI inspection.
- [x] `AC-4`: Demo/local jobs have valid date periods so the Sites schedule renders dated jobs — evidence: fixture inspection and full test/build checks.
- [x] `AC-5`: Existing dirty deployment-source changes remain untouched and no production/external side effect occurs — evidence: snapshot path and primary checkout status.

## Risk and approval gates

- Existing production rows with null dates remain unchanged; their actual schedule dates require owner-provided values or an approved data operation.
- The date period is an inclusive display filter, not proof that a job is staffed or deployed.
- Date controls and assignment actions remain behind the existing management write-role gates; this change adds no new role or data access path.
- Human approval required: yes for merging, publishing, or any production data backfill; no production or external action is authorized here.

## Verification evidence

| Check                     | Exact command or evidence                                               | Result                                                                                                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract                  | `QUALITY_BASE_REF= npm run quality:contract`                            | PASS after final evidence update                                                                                                                                                                         |
| Focused tests             | `npm test -- src/opus/components/calendar/__tests__/jobPeriods.test.ts` | PASS; 4 tests                                                                                                                                                                                            |
| Full tests                | `npm test`                                                              | PASS; 21 files, 191 passed, 1 skipped                                                                                                                                                                    |
| Typecheck                 | `npm run typecheck`                                                     | PASS                                                                                                                                                                                                     |
| Lint                      | `npm run lint -- --quiet`                                               | PASS; no errors reported                                                                                                                                                                                 |
| Formatting                | `npx prettier --check` on all changed files                             | PASS                                                                                                                                                                                                     |
| Build                     | `npm run build`                                                         | PASS; existing chunk-size/Vite/Nitro warnings only                                                                                                                                                       |
| Full checks               | `QUALITY_BASE_REF= npm run quality:gate`                                | BLOCKED only by two pre-existing baseline formatting failures: `docs/quality/changes/2026-11-13-opusform-master-remediation.md` and `docs/quality/changes/2026-11-19-job-media-video-and-compression.md` |
| Manual review             | Fresh read-only critic against actual diff                              | PASS after implementation repair                                                                                                                                                                         |
| External/production check | None performed; explicitly out of scope                                 | NOT APPLICABLE                                                                                                                                                                                           |

## Critic review

- Critic context/identity: fresh read-only context
- Review input: working-tree diff from `origin/promote-live`
- Verdict: PASS
- Findings: The implementation findings were repaired: fixture periods, mandatory conversion/edit/activation dates, missing-date recovery, assignment/reallocation guards, and role-boundary statement. The full quality gate is blocked only by the two pre-existing baseline formatting failures listed above.
- Unresolved blocking findings: None identified; existing production rows with null dates still require actual owner-provided values before appearing in Sites.
- Repair iterations: `2`

## Release decision

- Automated gate: `BLOCKED_BY_PRE_EXISTING_BASELINE_FORMAT`
- Release status: `NOT_RELEASED`
- Human approval: `PENDING`
- Residual uncertainty or exception: Existing live jobs with null date periods need actual dates before they can appear in Sites.
