# Opus Form change contract — quote VAT and CC recipients

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** source, integration, dependency
**Accountable owner:** Luke Williams / Opus Form
**Source of truth:** User request in this conversation
**Evidence base:** `origin/dev`
**Evidence head:** working tree (uncommitted)
**Evidence fingerprint:** f1d136ea9dfda4c2ab9716397f244f9c4b2963b62479949e9273d98c24f925ea

## Intent

Apply the existing 20% default VAT convention to quotes and allow the quote sender to copy additional email recipients on the outbound quote email.

## Scope

### In scope

- Quote and extra-quote builder VAT calculation, display, draft persistence, and generated PDF/email summary.
- Optional comma-separated CC recipient input, draft persistence, client forwarding, and server-side validation/deduplication.
- Focused unit tests for totals and CC normalization.

### Changed files

- `docs/quality/changes/2026-10-11-quote-vat-cc.md`
- `src/opus/components/QuoteInvoiceBuilder.tsx`
- `src/opus/lib/billing.ts`
- `src/opus/lib/__tests__/billing.test.ts`
- `src/opus/lib/__tests__/quoteEmail.test.ts`
- `src/opus/lib/quoteEmail.ts`
- `src/opus/lib/quotePdf.tsx`
- `supabase/functions/send-quote-pdf/index.ts`
- `docs/quality/changes/2026-10-12-dependency-audit-remediation.md`
- `package-lock.json`

### Out of scope

- Final-bill/invoice VAT behavior, database/RLS policy changes, production deployment, and live email delivery.
- Changing the sender address or bypassing authenticated Edge Function authorization.

## Acceptance criteria

- [x] New quotes default to a 20% VAT rate, calculate VAT and gross totals from line-item net totals, and show net, VAT rate/amount, and total in the editor and generated PDF.
- [x] The selected VAT rate is saved and restored with quote drafts and is included in the sent quote record.
- [x] Quote send UI provides optional comma-separated CC recipients, persists them with the draft, and sends valid CC addresses to the email function.
- [x] The email function validates CC values server-side, rejects malformed addresses, deduplicates them against the primary recipient, and sends them through the provider's `cc` field.
- [x] Existing final-bill behavior remains unchanged.
- [x] Existing quote validation, authorization, tenant boundaries, attachment handling, and error handling remain intact.
- [x] Production dependency audit reports no high or critical vulnerabilities.

## Risk and approval gates

- VAT defaults to the established 20% convention but remains editable; the accountable owner must confirm this rate before release.
- CC recipients are untrusted input; server-side validation and existing authenticated role checks remain mandatory.
- Live Supabase deployment and live email delivery are not verified locally and require the named owner’s approval and release process.

## Verification evidence

| Check             | Evidence                                                                                                                                                                                                            | Result                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Focused tests     | `npm test -- --run src/opus/lib/__tests__/billing.test.ts src/opus/lib/__tests__/quoteEmail.test.ts` — 2 files, 5 tests passed                                                                                      | PASS                  |
| Production audit  | `npm audit --omit=dev --audit-level=high` — 0 vulnerabilities after locking `seroval@1.6.9` and `source-map-js@1.2.2`                                                                                               | PASS                  |
| Typecheck         | `npm run typecheck`                                                                                                                                                                                                 | PASS                  |
| Full quality gate | `npm run quality:gate` — lint, format, typecheck, and all 146 non-skipped tests passed; production build stopped by the repository environment guard because Vite Supabase variables are placeholder/non-production | BLOCKED (environment) |
| UI/accessibility  | Static review of quote editor placement, keyboard-native inputs, responsive grid classes, and existing role-gated send path; browser/live email not run                                                             | PASS (static only)    |
| Critic review     | Fresh read-only review against the final diff and this contract; no introduced blocking findings remain. A pre-existing role mismatch in the document-send surface was noted as out of scope and unchanged.         | PASS                  |

## Critic review

- Verdict: `PASS`
- Unresolved blocking findings: `none introduced by this change`
- Repair iterations: `2` (typecheck repair; final-bill/rounding/CC persistence repair)

## Release decision

- Automated gate: `BLOCKED — build requires approved production Vite Supabase environment variables`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Approval scope: confirm the 20% VAT default and approve outbound CC behavior before release.
