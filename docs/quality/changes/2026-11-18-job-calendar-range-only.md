# Opus Form change contract — range-only calendar sites

**Status:** READY_FOR_REVIEW
**Risk:** low
**Change category:** source
**Accountable owner:** Opus Form operations owner
**Source of truth:** User correction: calendar Sites entries must require an explicit job date range, followed by explicit approval to make the correction live
**Evidence base:** `d5f2cad` / working tree
**Evidence head:** `8b666ad` / Worker `f8275756-2164-4c18-9a32-6c6b3254e4ce`
**Evidence fingerprint:** `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

## Intent

Prevent jobs without an explicit start/end period from appearing as Sites entries on the month calendar, even when they have shift assignments.

## Scope

### In scope

- Make month-calendar Sites chips derive only from valid inclusive job periods.
- Preserve shift assignments in the calendar day detail view.
- Add a regression test proving shift-only jobs are excluded.
- Deploy the correction through the existing Worker path and verify public bundle markers.

### Out of scope

- Changing shift assignment persistence or week/day staff scheduling.
- Changing production data or schema.

### Changed files

- `docs/quality/changes/2026-11-18-job-calendar-range-only.md`

## Acceptance criteria

- [x] `AC-1`: A valid-period job appears on each inclusive period date.
- [x] `AC-2`: A job without a valid period does not appear in month-calendar Sites entries, even when a shift exists.
- [x] `AC-3`: Existing shift assignment details remain available when opening a calendar day.
- [x] `AC-4`: Focused tests, typecheck, and changed-file lint pass.

## Risk and approval gates

- This is a presentation-only correction; it does not delete or alter shift records.
- No access-control, schema, tenant, or external-service behavior changes.
- Production deployment was explicitly approved in the current conversation.

## Verification evidence

| Check                 | Exact command or evidence                                                                                                                                        | Result                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Focused tests         | `npx vitest run src/opus/components/calendar/__tests__/jobPeriods.test.ts`                                                                                       | PASS — 4 tests                                        |
| Typecheck             | `npm run typecheck`                                                                                                                                              | PASS                                                  |
| Changed-file lint     | `npx eslint src/opus/components/calendar/jobPeriods.ts src/opus/components/calendar/MonthCalendar.tsx src/opus/components/calendar/__tests__/jobPeriods.test.ts` | PASS                                                  |
| Worker deployment     | `npx wrangler@4.164.0 deploy --config wrangler.jsonc`                                                                                                            | PASS — version `f8275756-2164-4c18-9a32-6c6b3254e4ce` |
| Public live checks    | `curl -L https://opusform.co.uk/`, `curl -L https://opusform.co.uk/portal`, Worker URL; live Calendar/PortalContext bundles checked                              | PASS — HTTP 200 and markers present                   |
| Manual/external check | Fresh read-only critic against actual diff                                                                                                                       | PASS                                                  |

## Critic review

- Critic context/identity: fresh read-only review of the actual worktree
- Review input: final diff and focused verification output
- Verdict: `PASS`
- Findings: Sites chips are range-only; shift assignments remain available in day detail. No schema, persistence, access-control, or external-service behavior changed.
- Unresolved blocking findings: `none`
- Repair iterations: `0`

## Release decision

- Automated gate: `PASS`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty or exception: Authenticated management-browser/accessibility acceptance was not performed in this session.
