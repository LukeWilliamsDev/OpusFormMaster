# Opus Form change contract — CC recipient picker

**Status:** READY_FOR_REVIEW
**Risk:** low
**Change category:** source
**Accountable owner:** Luke Williams / Opus Form
**Source of truth:** User decision in this conversation
**Evidence base:** `origin/main`
**Evidence head:** working tree (uncommitted)
**Evidence fingerprint:** ac49ee641d771d71af1f7341f72e322d1ff24faafb288957a59edd07b06f2275

## Intent

Allow standalone quote users to add eligible prior recipients to CC while preserving manual comma-separated entry and preventing duplicate or primary-recipient CC addresses.

## Scope

### In scope

- Add a searchable prior-recipient picker beside the standalone quote CC field.
- Append a selected address to existing manual CC text rather than replacing it.
- Keep the existing validation and free-form entry behavior.
- Keep quote PDF rate display consistent with totals for formatted currency strings and INCLUDED rates.

### Changed files

- `docs/quality/changes/2026-10-13-cc-recipient-picker.md`
- `src/opus/components/QuoteInvoiceBuilder.tsx`
- `src/opus/lib/quoteEmail.ts`
- `src/opus/lib/__tests__/quoteEmail.test.ts`
- `src/opus/lib/quotePdf.tsx`

### Out of scope

- Job Billing, final invoices, database schema, RLS, and production email-function behavior.

## Acceptance criteria

- [x] Prior eligible recipients can be searched and added to CC.
- [x] Adding a prior recipient preserves manually typed CC addresses.
- [x] The primary recipient and duplicate CC addresses cannot be added.
- [x] Free-form comma/semicolon/whitespace-separated CC input continues to work.
- [x] Job Billing and final-invoice modes remain unchanged.
- [x] Quote PDF rates display formatted currency values and INCLUDED rates correctly.

## Risk and approval gates

- The picker uses the existing authenticated eligible-recipient data already loaded for standalone quotes; no new cross-tenant or service-role access is added.
- Manual entry remains available and existing CC validation remains authoritative before send.
- No database, RLS, edge-function, or billing-flow changes are included.

## Verification evidence

| Check         | Evidence                                                                                           | Result |
| ------------- | -------------------------------------------------------------------------------------------------- | ------ |
| Focused tests | CC append/deduplication tests — 3 passed                                                           | PASS   |
| Typecheck     | `npm run typecheck` passed                                                                         | PASS   |
| Quality gate  | `npm run quality:gate` — lint, format, typecheck, 178 passed/1 skipped tests, build, bundle budget | PASS   |
| Critic review | Fresh read-only review; no blocking or major findings                                              | PASS   |

## Critic review

- Verdict: `PASS`
- Unresolved blocking findings: `none`
- Repair iterations: `1` (added combobox semantics and Escape handling)

## Release decision

- Automated gate: `PENDING`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
