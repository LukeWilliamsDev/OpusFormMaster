# Opus Form change contract — revert PDF parity experiment

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** source
**Accountable owner:** Luke Williams / Opus Form
**Source of truth:** User decision in this conversation
**Evidence base:** `da967e6` (last accepted quote release)
**Evidence head:** working tree (uncommitted)
**Evidence fingerprint:** b57ff155cbc3385b4f389eef75dd297dc02924d3648e92e2d0f8f48a3e708449

## Intent

Restore the quote PDF implementation that was live before the parity experiment, because the newer live preview/download path degraded the approved visual output and repeatedly failed in production.

## Scope

### In scope

- Restore the previous HTML live preview and native download/send PDF paths.
- Remove the parity experiment's browser-only viewer, iframe, HTML fallback, and payload-normalization additions.
- Preserve the recipient picker, quote safeguards, and earlier PDF rate/reference repairs already present at `da967e6`.

### Changed files

- `docs/quality/changes/2026-10-13-revert-pdf-parity.md`
- `src/opus/components/QuoteInvoiceBuilder.tsx`
- `src/opus/lib/quotePdf.tsx`
- `src/opus/lib/__tests__/quotePdf.test.ts`

### Out of scope

- CC recipient selection, quote safeguards, database/RLS, billing, and email-function behavior.

## Acceptance criteria

- [x] Quote preview uses the prior HTML visual renderer.
- [x] Download and send use the prior native PDF generator.
- [x] The parity experiment's iframe/viewer/fallback path is removed.
- [x] CC picker and quote safeguards remain present.

## Risk and approval gates

- This is an intentional rollback to a previously accepted implementation, not a database or permission change.
- The authenticated operations-role and tenant/RLS boundaries remain unchanged.
- Live authenticated browser acceptance is required after deployment.

## Verification evidence

| Check       | Evidence                                          | Result  |
| ----------- | ------------------------------------------------- | ------- |
| Typecheck   | `npm run typecheck`                               | PENDING |
| Tests       | Full test suite                                   | PENDING |
| Build       | Production build and bundle budget                | PENDING |
| Diff review | Confirm rollback is limited to PDF parity changes | PASS    |

## Critic review

- Verdict: `PASS`
- Unresolved blocking findings: `none`
- Repair iterations: `0` (intentional rollback)

## Release decision

- Automated gate: `PENDING`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
