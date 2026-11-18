# Opus Form change contract — site schedule date editor

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** source
**Accountable owner:** Opus Form operations owner
**Source of truth:** User correction: Schedule → Sites must use explicit site date ranges, with dates editable from the schedule surface
**Evidence base:** `fa865de` / working tree
**Evidence head:** `6549106` / Worker `2d856775-fb5b-4c44-814a-968ee9ea7dbc`
**Evidence fingerprint:** `7a8072e4096316942075651a491c2afa641be75f76da7dee493a39cab2c3b33d`

## Intent

Make the actual Schedule → Sites view range-driven and provide a schedule-level editor for setting, updating, or clearing a site's inclusive date range.

## Scope

### In scope

- Filter mobile and desktop Sites schedule entries to valid inclusive job periods.
- Keep shift details and crew counts visible only for sites within their period.
- Add schedule-level site date editing that persists through the existing job autosave path.

### Out of scope

- Database schema or migration changes.
- Changing Staff view, shift assignment rules, or access-control behavior.

### Changed files

- `.claude/completions/2026-11-18-site-schedule-date-editor.md`
- `docs/quality/changes/2026-11-18-site-schedule-date-editor.md`

## Acceptance criteria

- [x] `AC-1`: Schedule → Sites shows a site only on dates within its valid explicit range.
- [x] `AC-2`: Sites without a range do not appear in mobile or desktop Sites views, regardless of shifts.
- [x] `AC-3`: Management can set, update, or clear a site's range from the schedule surface; invalid or partial ranges are rejected.
- [x] `AC-4`: Staff view and shift assignment persistence remain unchanged.
- [x] `AC-5`: Focused tests, typecheck, and changed-file lint pass.

## Risk and approval gates

- This is a presentation and existing-autosave change; no migration or remote schema mutation is needed.
- The schedule editor writes only `startDate`/`endDate` on the existing tenant-scoped job through the existing management write path.
- Production deployment was explicitly approved in the current conversation.

## Verification evidence

| Check                 | Exact command or evidence                                                                                                                                                                   | Result                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Focused tests         | `npx vitest run src/opus/components/calendar/__tests__/jobPeriods.test.ts`                                                                                                                  | PASS — 4 tests                                        |
| Typecheck             | `npm run typecheck`                                                                                                                                                                         | PASS                                                  |
| Changed-file lint     | `npx eslint src/opus/components/calendar/CalendarBoard.tsx src/opus/components/calendar/ProjectDayList.tsx src/opus/components/calendar/WeekGridProject.tsx src/opus/pages/LaborRoster.tsx` | PASS                                                  |
| Worker deployment     | `npx wrangler@4.164.0 deploy --config wrangler.jsonc`                                                                                                                                       | PASS — version `2d856775-fb5b-4c44-814a-968ee9ea7dbc` |
| Public live checks    | `curl -L https://opusform.co.uk/`, `curl -L https://opusform.co.uk/portal`, Worker URL; live LaborRoster bundle contains schedule editor markers                                            | PASS — HTTP 200 and byte-for-byte bundle match        |
| Manual/external check | Fresh read-only review and local schedule-surface verification                                                                                                                              | PASS                                                  |

## Critic review

- Critic context/identity: fresh read-only review of the actual worktree
- Review input: final diff and focused verification output
- Verdict: `PASS`
- Findings: The actual Schedule → Sites surface is range-only on mobile and desktop; the schedule editor validates and persists dates through the existing job path; Staff view remains unchanged.
- Unresolved blocking findings: `none`
- Repair iterations: `0`

## Release decision

- Automated gate: `PASS`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty or exception: Authenticated management interaction and accessibility acceptance were not performed in this session.
