# Opus Form change contract — stable document references

**Status:** READY_FOR_REVIEW
**Risk:** high
**Change category:** schema-and-source
**Accountable owner:** Luke Williams / Opus Form
**Source of truth:** User-approved reference model in this conversation
**Evidence base:** Production read-only duplicate audit on 2026-10-13
**Evidence head:** working tree
**Evidence fingerprint:** 0370f5c4682413a1032ce6e6bc218bc3e4c70ff9a833a99629de9843fb23f6ba

## Intent

Replace random and count-derived document references for new records with stable, tenant-scoped numbers while preserving every existing historical reference.

## Reference model

- New jobs: `JOB-YY-0001`
- New quotes: `Q-YY-0001`
- New final invoices: `INV-YY-0001`
- Existing references remain unchanged and searchable.
- Quote and invoice numbers are persisted; numbering is allocated atomically through a tenant-aware RPC.

## Scope

### In scope

- Stable allocator-backed job, quote, and final-invoice references for new records.
- UI labels, persistence fields, list display, and compatibility with existing references.

### Out of scope

- Renaming historical records, changing CC behavior, or changing document permissions.

### Changed files

- `docs/quality/changes/2026-10-13-stable-document-references.md`
- `supabase/migrations/20261013140000_add_stable_document_references.sql`
- `src/integrations/supabase/types.ts`
- `src/opus/components/PipelineRegistry.tsx`
- `src/opus/components/QuoteInvoiceBuilder.tsx`
- `src/opus/components/billing/InvoiceList.tsx`
- `src/opus/components/billing/FinalBillList.tsx`
- `src/opus/lib/documentNaming.ts`
- `src/opus/lib/__tests__/documentNaming.test.ts`

## Risk and approval gates

- No historical job, quote, or invoice reference is renamed.
- Existing quote/job links are backfilled only when tenant and `job_ref` match exactly.
- New numbering uses a locked counter row rather than `COUNT(*)`, timestamps, or list position.
- The RPC validates the authenticated operations role and tenant ownership.
- Existing reference fields remain in place for edge-function and audit compatibility.
- The counter table is tenant-isolated and inaccessible to direct authenticated table writes; only the validated operations RPC can allocate numbers.
- Client allocation runs through the authenticated Supabase session and preserves the existing operations-role boundary; failed allocation falls back without granting access.
- Rollback path: stop allocating new numbers, revert the client migration commit, and retain the nullable columns/counters without rewriting historical references.

## Acceptance criteria

- [x] New builder documents show Job Ref beside Quote No. or Invoice No.
- [x] New jobs, quotes, and final invoices request stable numbers from the allocator.
- [x] Existing documents retain their original references.
- [x] Billing and pipeline lists prefer persisted references, with legacy fallback labels.
- [x] Formatting helpers and focused tests cover the new reference format.

## Release gates

- Apply the migration only after duplicate audit and authenticated staging acceptance.
- Verify allocator RPC access with an operations-role session before production use.
- Confirm existing quote conversion and email/PDF payloads remain backward-compatible.

## Verification evidence

| Check                      | Evidence                                                                   | Result  |
| -------------------------- | -------------------------------------------------------------------------- | ------- |
| Production duplicate audit | No duplicate `(tenant_id, job_ref)` or `(tenant_id, reference)` rows found | PASS    |
| Typecheck                  | `npm run typecheck`                                                        | PENDING |
| Tests                      | Full Vitest                                                                | PENDING |
| Build                      | Production build and bundle budget                                         | PENDING |

## Critic review

- Verdict: `PASS`
- Unresolved blocking findings: `none`
- Repair iterations: `0`

## Release decision

- Automated gate: `PENDING`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
