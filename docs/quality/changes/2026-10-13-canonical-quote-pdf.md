# Opus Form change contract — canonical quote PDF preview

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** source
**Accountable owner:** Luke Williams / Opus Form
**Source of truth:** User decision in this conversation
**Evidence base:** `origin/main`
**Evidence head:** working tree (uncommitted)
**Evidence fingerprint:** 11ddff6a42937e9816990d76ea47df32fbad326e7abd1277479fb965e972c9b3

## Intent

Ensure the quote preview, downloaded PDF, and sent PDF are generated from the same renderer and data so the document the user reviews is the document the recipient receives.

## Scope

### In scope

- Use the vector PDF document component for the live preview.
- Pass the current quote reference and editable terms into preview, download, and send generation.
- Keep invoice and quote document titles and mode behavior aligned.
- Format currency-string rates consistently in the PDF.

### Changed files

- `docs/quality/changes/2026-10-13-canonical-quote-pdf.md`
- `src/opus/components/QuoteInvoiceBuilder.tsx`

### Out of scope

- Database schema, RLS, email-function authorization, and unrelated billing UI.

## Acceptance criteria

- [x] Preview and sent quote PDFs use the same vector renderer.
- [x] Preview, download, and send use the same reference, terms, items, totals, and client data.
- [x] Formatted currency strings and INCLUDED rates render correctly.
- [x] Job Billing and final-invoice behavior remain unchanged except for renderer parity.
- [x] The preview renders through a client-side PDF iframe without executing browser-only viewer components during server-side route rendering.

## Risk and approval gates

- No database or external-service contract changes are introduced.
- The edge email function continues to receive the generated PDF bytes; only their source is made canonical.
- The existing authenticated operations-role and tenant/RLS boundary remains unchanged; this change does not grant new document access.
- Authenticated browser acceptance remains required after deployment.

## Verification evidence

| Check         | Evidence                                                      | Result |
| ------------- | ------------------------------------------------------------- | ------ |
| Typecheck     | `npm run typecheck` passed                                    | PASS   |
| Tests         | Full Vitest — 178 passed, 1 skipped                           | PASS   |
| Build         | Production build and bundle budget passed                     | PASS   |
| Critic review | Read-only audit identified and repaired the renderer mismatch | PASS   |

## Critic review

- Verdict: `PASS`
- Unresolved blocking findings: `none`
- Repair iterations: `1` (unified preview/download/send renderer and data)

## Release decision

- Automated gate: `PASS`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
