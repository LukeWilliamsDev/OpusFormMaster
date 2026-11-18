# Opus Form change contract — selected job schedule status

**Status:** READY_FOR_REVIEW
**Risk:** low
**Change category:** source
**Accountable owner:** Opus Form operations owner
**Source of truth:** User request to make missing job schedule dates obvious on the selected job
**Evidence base:** `0739120` / working tree
**Evidence head:** `3db8dd8` / Worker `12a5b6ea-11b3-403d-a481-ae7960737ada`
**Evidence fingerprint:** `6a176a8482abcd794283f2a7ccaf6f247cdb62cfe2198629f24e2f15c2b21375`

## Intent

Show a clear selected-job warning when no valid start/end range exists, including that the job will not appear in Sites.

## Scope

### In scope

- Show the existing period when valid dates exist.
- Show an amber “No schedule dates set · Not shown in Sites” status otherwise.

### Out of scope

- Database, persistence, access-control, or schedule filtering changes.

### Changed files

- `.claude/completions/2026-11-18-job-details-schedule-status.md`
- `docs/quality/changes/2026-11-18-job-details-schedule-status.md`

## Acceptance criteria

- [x] `AC-1`: A job with a valid range displays its formatted period.
- [x] `AC-2`: A job without a valid range visibly states that it is not shown in Sites.
- [x] `AC-3`: Typecheck, changed-file lint, and date regression tests pass.

## Risk and approval gates

- Source-only presentation change; no database or external-service mutation.
- Production deployment was explicitly approved in the current conversation.

## Verification evidence

| Check                 | Exact command or evidence                                                                                                                         | Result                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Focused tests         | `npx vitest run src/opus/components/calendar/__tests__/jobPeriods.test.ts`                                                                        | PASS — 4 tests                                        |
| Typecheck             | `npm run typecheck`                                                                                                                               | PASS                                                  |
| Changed-file lint     | `npx eslint src/opus/components/JobDetails.tsx`                                                                                                   | PASS                                                  |
| Worker deployment     | `npx wrangler@4.164.0 deploy --config wrangler.jsonc`                                                                                             | PASS — version `12a5b6ea-11b3-403d-a481-ae7960737ada` |
| Public live checks    | `curl -L https://opusform.co.uk/`, `curl -L https://opusform.co.uk/portal`, Worker URL; live JobLedger bundle contains warning and period markers | PASS — HTTP 200 and byte-for-byte bundle match        |
| Manual/external check | Fresh source review                                                                                                                               | PASS                                                  |

## Critic review

- Critic context/identity: source review of the actual selected-job change
- Review input: final diff and focused verification output
- Verdict: `PASS`
- Findings: Valid periods retain their formatted display; missing or invalid periods receive a clear Sites visibility warning. No persistence or authorization behavior changed.
- Unresolved blocking findings: `none`
- Repair iterations: `0`

## Release decision

- Automated gate: `PASS`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty or exception: Authenticated browser verification was not performed in this session.
