# Opus Form change contract — job list date editor

**Status:** READY_FOR_REVIEW
**Risk:** low
**Change category:** source
**Accountable owner:** Opus Form operations owner
**Source of truth:** User request to set site schedule dates directly from the Job Ledger list
**Evidence base:** `f6a8ec1` / working tree
**Evidence head:** `7e0ab9b` / Worker `e1352bdf-b42d-4983-ba27-23b151951db3`
**Evidence fingerprint:** `f7aa1e4df47cf4d14ccaa78e1fa2f8a284b5fa64e0091d3f8333b07e0a9ae955`

## Intent

Allow management users to set, update, or clear a job's inclusive schedule dates directly from each Job Ledger row.

## Scope

### In scope

- Add a per-job Set dates/Edit dates control to the Job Ledger list.
- Validate complete, real, non-reversed date ranges and allow clearing both dates.
- Persist changes through the existing management job update path.

### Out of scope

- Database schema, migration, or access-control changes.
- Changing Schedule → Sites range filtering or Staff view behavior.

### Changed files

- `.claude/completions/2026-11-18-job-list-date-editor.md`
- `docs/quality/changes/2026-11-18-job-list-date-editor.md`

## Acceptance criteria

- [x] `AC-1`: Each job row exposes Set dates or Edit dates without requiring navigation away from the list.
- [x] `AC-2`: Management can save, update, or clear dates; partial, invalid, or reversed ranges are rejected.
- [x] `AC-3`: Changes use the existing tenant-scoped job update/autosave path.
- [x] `AC-4`: Focused tests, typecheck, and changed-file lint pass.

## Risk and approval gates

- The dialog only updates existing `startDate`/`endDate` fields and introduces no schema or policy changes.
- Production deployment was explicitly approved in the current conversation.

## Verification evidence

| Check                 | Exact command or evidence                                                                                                                  | Result                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Focused tests         | `npx vitest run src/opus/components/calendar/__tests__/jobPeriods.test.ts`                                                                 | PASS — 4 tests                                        |
| Typecheck             | `npm run typecheck`                                                                                                                        | PASS                                                  |
| Changed-file lint     | `npx eslint src/opus/components/ActiveJobLedger.tsx src/opus/pages/JobLedger.tsx`                                                          | PASS                                                  |
| Worker deployment     | `npx wrangler@4.164.0 deploy --config wrangler.jsonc`                                                                                      | PASS — version `e1352bdf-b42d-4983-ba27-23b151951db3` |
| Public live checks    | `curl -L https://opusform.co.uk/`, `curl -L https://opusform.co.uk/portal`, Worker URL; live JobLedger bundle contains date-editor markers | PASS — HTTP 200 and byte-for-byte bundle match        |
| Manual/external check | Fresh read-only review after repair                                                                                                        | PASS                                                  |

## Critic review

- Critic context/identity: fresh read-only review after repair
- Review input: final diff and focused verification output
- Verdict: `PASS`
- Findings: Keyboard propagation, stale full-job snapshot use, and read-only role exposure were repaired. The existing tenant-scoped full-collection autosave path remains unchanged and is used with a functional latest-state update.
- Unresolved blocking findings: `none`
- Repair iterations: `0`

## Release decision

- Automated gate: `PASS`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty or exception: Authenticated Job Ledger interaction and accessibility acceptance were not performed in this session.
