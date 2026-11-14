# Opus Form change contract — eligible quote suggestions

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** source, integration
**Accountable owner:** Luke Williams / Opus Form
**Source of truth:** User decision in this conversation
**Evidence base:** `origin/main`
**Evidence head:** working tree (uncommitted)
**Evidence fingerprint:** ecccb1a8041ce8225fb9798e3f9e73f1c65af6c4af5c6d5cca988d2a633464a7

## Intent

Make standalone quote recipient and line-item suggestions useful without resurfacing unrelated sent history. Suggestions must come only from draft invoices created for jobs and quotes still waiting to be sent.

## Scope

### In scope

- Derive client/email suggestions from `invoices.status = 'draft' AND job_id IS NOT NULL` and `quotes.is_sent = false`, excluding the Manchester test job.
- Derive deduplicated historical line-item suggestions from the same sources, excluding VAT-only rows.
- Add searchable recipient selection and live historical line-item suggestions to standalone quote mode only.
- Require category assignment, all five required categories, complete line fields, and explicit rendered-document confirmation before sending standalone quotes.

### Changed files

- `docs/quality/changes/2026-10-12-eligible-quote-suggestions.md`
- `src/opus/components/QuoteInvoiceBuilder.tsx`
- `src/components/ui/confirm-dialog.tsx`
- `src/opus/lib/eligibleQuoteData.ts`
- `src/opus/lib/__tests__/eligibleQuoteData.test.ts`

### Out of scope

- New catalogue tables, write-back/editing of historical records, final-bill behavior, production data mutation, and changing RLS policies.
- Including sent quotes, sent final bills, paid bills, or unrelated standalone history in suggestions.
- Including the Manchester test job in suggestions.

## Acceptance criteria

- [x] Recipient search fills the client and email fields from eligible records only.
- [x] Line-item suggestions use eligible historical descriptions, units, and rates; VAT-only rows are excluded.
- [x] Duplicate recipients and duplicate description/unit combinations are consolidated with recent data preferred.
- [x] A failure loading suggestions does not block manual quote creation or sending.
- [x] Job billing (`extraQuote`), final-bill mode, and existing tenant/RLS boundaries remain unchanged.
- [x] Sending is hard-blocked until Concrete works, Reinforcement / mesh, Pump / plant, Labour, and Site extras are represented and the rendered document is explicitly confirmed.

## Risk and approval gates

- Reads use the existing authenticated Supabase client and existing table RLS; no service-role or cross-tenant query is added to the browser.
- Historical client/email data is displayed only to the already-authorized operations user in the current tenant.
- Live data and authenticated browser acceptance remain required before release.

## Verification evidence

| Check               | Evidence                                                                                                                                               | Result                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| Focused tests       | `npm test -- --run src/opus/lib/__tests__/eligibleQuoteData.test.ts` — 6 passed                                                                        | PASS                   |
| Typecheck and tests | `npm run typecheck`; full Vitest — 176 passed, 1 skipped                                                                                               | PASS                   |
| Lint                | `npm run lint` — 0 errors, existing warnings only                                                                                                      | PASS                   |
| Full quality gate   | `npm run quality:gate` — contract, lint, format, typecheck, tests, production build, and bundle budget completed before the final category-gate repair | PASS (prior iteration) |
| UI/accessibility    | Static review of searchable recipient control, keyboard-native inputs, responsive dropdown, loading/empty/error fallback                               | PASS (static only)     |
| Critic review       | Fresh read-only review against the final category-gate diff; no blocking or major introduced findings remain                                           | PASS                   |

## Critic review

- Verdict: `PASS`
- Unresolved blocking findings: `none introduced by this change`
- Repair iterations: `2` (Manchester exclusion/malformed-item/loading repair; category hard-gate repair)

## Release decision

- Automated gate: `PENDING — local production build not run`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
