# Opus Form change contract — master remediation

**Status:** READY_FOR_REVIEW
**Risk:** critical
**Change category:** cross-system-remediation
**Accountable owner:** Luke Williams / Opus Form
**Source of truth:** 2026-11-13 read-only Opus Form audit, four independent domain audits, and two adversarial reconciliation reviews
**Evidence base:** `promote-live@6562e22` versus clean `origin/main@d344fb1`; no live mutation performed
**Evidence head:** `origin/main@d344fb1` remediation worktree
**Evidence fingerprint:** 3b8ec0d98229d49cd4e946e118e79cd13245f09d9af8be5d96a1a218022e648a

## Intent

Turn the audit findings into a dependency-ordered remediation set that makes the
product safer and more reliable without mixing stale source, live deployment,
remote schema, or human approval claims. The work must leave production and
external services untouched until the required gates are explicitly verified.

## Scope

### In scope

- Final-bill recipient wiring, durable billing state, retry/idempotency behavior,
  VAT correctness, document references, and date storage.
- Trusted server-rendered billing PDF artifacts, hash/byte tracking, and private
  tenant-scoped artifact storage for customer-facing email.
- Tenant, role, profile, admin-user, Edge Function, Storage, public-upload, and
  third-party authorization boundaries identified by the audit.
- Quote conversion consistency, calendar-range loading, hydration/error states,
  autosave failure handling, Foreman/audience schema alignment, and route access.
- Focused regression tests, RLS/Storage and Edge Function review fixtures,
  test-discovery exclusions, build/provenance checks, and release evidence.

### Out of scope

- Applying migrations to Supabase, changing live RLS/Storage policies, deploying
  Workers or Edge Functions, sending email, mutating customer data, or changing
  production configuration.
- Secrets, credentials, legal/privacy approval, human release approval, or
  declaring any remote behavior verified without approved live/QA evidence.
- Rewriting historical document references or changing Opus Form ownership rules.

### Changed files

- `docs/quality/changes/2026-11-13-opusform-master-remediation.md`
- `src/integrations/supabase/types.ts`
- `src/opus/App.tsx`
- `src/opus/components/PipelineRegistry.tsx`
- `src/opus/components/QuoteInvoiceBuilder.tsx`
- `src/opus/components/__tests__/QuoteInvoiceBuilder.test.tsx`
- `src/opus/components/billing/FinalBillBuilder.tsx`
- `src/opus/components/billing/FinalBillList.tsx`
- `src/opus/components/billing/InvoiceList.tsx`
- `src/opus/context/PortalContext.tsx`
- `src/opus/pages/JobUploadPortal.tsx`
- `src/opus/lib/quotePdf.tsx`
- `src/opus/utils/week.ts`
- `src/opus/utils/__tests__/week.test.ts`
- `supabase/functions/admin-create-user/index.ts`
- `supabase/functions/admin-manage-user/index.ts`
- `supabase/functions/send-admin-alert/index.ts`
- `supabase/functions/send-compliance-email/index.ts`
- `supabase/functions/send-final-bill/index.ts`
- `supabase/functions/send-quote-pdf/index.ts`
- `supabase/functions/_shared/billing-pdf.ts`
- `supabase/functions/_shared/billing-pdf-financials.ts`
- `supabase/functions/_shared/__tests__/billing-pdf-financials.test.ts`
- `supabase/migrations/20261113120000_harden_master_authorization_boundaries.sql`
- `supabase/migrations/20261113123000_harden_quote_conversion_idempotency.sql`
- `supabase/migrations/20261113124000_harden_public_upload_invariants.sql`
- `supabase/migrations/20261113130000_add_billing_artifacts.sql`
- `supabase/migrations/20261004115218_harden_billing_sender_permissions.sql`
- `supabase/migrations/20261005021522_harden_final_bill_and_upload_integrity.sql`
- `supabase/migrations/20261005130005_quote_conversion_claims.sql`
- `supabase/migrations/20261005132534_fix_public_job_upload_tenant_drift.sql`
- `supabase/migrations/20261005133704_allow_ops_cleanup_request_objects.sql`
- `supabase/migrations/20261013134136_add_stable_document_references.sql`

## Master plan

1. **Baseline and contract:** work only from the clean approved ref; preserve the
   dirty `promote-live` checkout; map each finding to source, migration, test,
   evidence, and accountable approval.
2. **Billing and documents:** repair final-bill recipient flow first; make net,
   VAT, and gross consistent; use persisted stable references; persist ISO/native
   dates; make send/save/retry behavior idempotent and auditable.
3. **Authorization and tenant safety:** remove broad profile self-update,
   tenant-scope admin-user operations, align active-role checks, harden Edge
   Function object authorization, remove permissive Storage policy paths, close
   public-upload metadata/aggregate-limit gaps, and remove email enumeration.
4. **Workflow and surface reliability:** make quote conversion atomic or
   idempotent, reconcile Foreman/audience schema and route access, load calendar
   ranges deliberately, surface hydration and autosave failures, and preserve
   permission/error/empty/responsive states.
5. **Assurance:** add focused tests and static checks for every repaired path,
   exclude worktrees from discovery, run the repository quality gate, perform a
   fresh adversarial diff review, and record residual unknowns.
6. **Release boundary:** stop at clean-source, migration-ledger, deployment-
   provenance, authenticated role, cross-tenant, Storage, and workflow gates;
   production release remains blocked until the named human approval exists.

## Risk and approval gates

- Every migration or policy change must state tenant/RLS impact and a corrective
  or forward-only path; it must be reviewed before remote application.
- Service-role Edge Functions must authenticate the caller, authorize the target
  object and tenant, validate inputs, and avoid trusting client-supplied billing
  content or recipient identity where the server can derive it.
- Profile identity, tenant, role, status, and authorization fields are not
  user-editable through a broad self-update policy.
- New and historical document references remain stable; existing references are
  never rewritten. Dates persist as native/ISO values and display in UK format
  using `Europe/London`.
- UI controls must match the actual schema and authorization boundary; denied,
  loading, empty, error, keyboard, and responsive states are required where the
  changed surface exposes them.
- No Composio-connected service, Supabase CLI/API, Cloudflare, Resend, or
  production environment is called from this remediation worktree without the
  relevant approved action and an explicit gate.
- Rollback is by reverting the source change or applying a reviewed corrective
  migration; no destructive reset, force push, or production data cleanup is
  permitted.

## Acceptance criteria

- [x] Final-bill sends provide a validated recipient or derive it server-side and
      have a focused success/failure regression test.
- [x] Billing UI, persistence, PDF, and email agree on net, VAT, and gross for
      quotes and the explicitly approved final-bill behavior.
- [x] Billing-list PDF downloads preserve the persisted VAT rate and keep their
      Blob URLs alive long enough for browsers to complete the download.
- [x] New document numbers are allocated atomically and historical references
      cannot change because of sorting, deletion, or list position.
- [x] Persisted document dates are native/ISO values; UK `DD/MM/YYYY` and
      `Europe/London` formatting is display-only.
- [x] Quote conversion cannot create duplicate jobs or silently discard the
      source quote when a dependent operation fails.
- [x] Authenticated users cannot mutate their own tenant, email, role, status, or
      other protected profile fields through direct table access.
- [x] Admin create/manage functions enforce caller/target tenant scope and
      handle Auth/profile failure without leaving an untracked account.
- [x] Every privileged email function enforces active role, tenant/object scope,
      input validation, and safe retry/idempotency behavior.
- [x] No permissive Storage policy bypasses tenant/path/audience restrictions;
      third-party and Foreman access is type/audience/current-assignment scoped.
- [x] Public upload RPCs enforce token, path, object, size, and aggregate-limit
      invariants server-side and reject stale/completed requests.
- [x] Foreman/audience columns, migrations, generated types, UI controls, and
      Storage/table policies are shipped as one coherent change.
- [x] Intended role routes, including My Shifts and Foreman, are reachable only
      by their approved roles and fail closed for other roles.
- [x] Calendar range, hydration errors, and autosave failures are explicit and
      recoverable rather than silently blank or stale.
- [x] Tests, lint, typecheck, build/budget, Edge Function checks, and quality
  contracts run against the current diff without `.letta/worktrees` contamination.
- [x] Email functions send only a server-generated or cryptographically
      server-bound PDF whose bytes match the persisted document.
- [x] A fresh critic reviews the final diff and no blocking/major finding remains.

## Release gates

- Clean approved source ref selected and recorded.
- Live Worker, bundle, bindings, Edge Function versions/settings, and migration
  ledger reconciled through approved read-only paths.
- Isolated QA verifies management, assistant, Foreman, third-party, disabled,
  removed-shift, and cross-tenant negative cases.
- Billing send, retry, PDF, reference, date, and quote-conversion workflows pass
  with disposable QA records and cleanup evidence.
- Server-rendered quote, invoice, and final-bill PDFs receive visual approval;
  the stored artifact hash and emailed attachment bytes are verified equal.
- Named accountable human approval is still required; this contract cannot grant
  release, migration, security, privacy, or recovery approval.

## Verification evidence

| Check                       | Evidence                                                                                     | Result              |
| --------------------------- | -------------------------------------------------------------------------------------------- | ------------------- |
| Baseline/ref reconciliation | Clean `origin/main@d344fb1`; dirty `promote-live@6562e22` retained separately                | PASS                |
| Typecheck                   | `npx tsc -p tsconfig.json --pretty false`                                                    | PASS                |
| Tests                       | `npm test` — 20 files, 187 passed, 1 skipped; `.letta` excluded                              | PASS                |
| Lint                        | Focused changed-source lint — 0 errors, 14 existing warnings                                 | PASS                |
| Formatting                  | Prettier check for changed TypeScript/Edge Function sources                                  | PASS                |
| Build/assets                | `npm run build:budget && npm run check:build-assets`                                         | PASS                |
| Edge Function syntax        | TypeScript parser over 8 changed Edge Function/shared sources; Deno/Supabase CLI unavailable | PASS / DENO PENDING |
| RLS/Storage/SQL/runtime     | Source review only; live catalog/runtime not verified                                        | PENDING             |
| Independent critic          | Final source review PASS; environment and human release gates remain separate               | PASS / GATES PENDING |

## Critic review

- Verdict: `PASS`
- Unresolved blocking findings: `None in source. Deno/SQL/live artifact execution, visual approval, migration reconciliation, and human release gates remain unverified`
- Repair iterations: `5`

## Release decision

- Automated gate: `PASS for local/source assurance — Deno/SQL/live artifact and approval gates remain pending`
- Release status: `NOT_RELEASED`
- Human approval: `PENDING`
