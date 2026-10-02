# Opus Form change contract — audit history live release refinement

**Status:** READY_FOR_REVIEW
**Risk:** high
**Change category:** source | database | security | release
**Accountable owner:** Luke Williams / Opus Form director
**Source of truth:** User-requested live audit release and the 2026-10-02 audit/history product rules; base release `8a92504`
**Evidence base:** `8a92504`
**Evidence head:** `0339ab3` (`origin/main`)
**Evidence fingerprint:** `a99e8dd031d64a5e56986efeb0e23aa161bc5af694573477804482bd0066fb61`

## Intent

Finish the audit-history release so the global audit trail, job history, and
staff history present calm, plain-English evidence with a focused detail
inspector, while preserving the existing role and tenant boundaries.

## Scope

### In scope

- Refine the shared audit event row and inspector for actor, named record,
  Europe/London time, before/after changes, safe evidence details, keyboard
  handling, and corrective-event context.
- Refine global, job, and staff audit filtering/search and plain-English
  summaries without exposing raw technical metadata by default.
- Apply one central redaction policy to diff values, field labels, actor
  identifiers, accessible names, and the staff revert confirmation.
- Ensure the live Worker is rebuilt with the production Supabase URL and
  publishable key rather than the placeholder values used by local CI builds.
- Add a forward-only corrective migration so a revert cannot commit without its
  corrective audit event.
- Repair the repository-wide formatting blocker that prevents the release gate
  from running.
- Verify the audit migrations already present in base `8a92504` against the
  live Supabase project; do not reapply migrations that are already recorded.

### Out of scope

- New audit tables, columns, or a broader audit-schema redesign beyond the
  existing base migrations and the targeted corrective function migration.
- Changes to unrelated portal workflows, customer data, roles, or production
  fixtures.
- Treating a green local check as proof of live schema, authenticated browser,
  or deployment behavior.

### Changed files

- `docs/quality/changes/2026-10-02-audit-history-live-release.md`
- `src/opus/components/AuditDiffTable.tsx`
- `src/opus/components/AuditEventCard.tsx`
- `src/opus/components/HistoryTab.tsx`
- `src/opus/components/JobDetails.tsx`
- `src/opus/components/RosterView.tsx`
- `src/opus/pages/AuditLog.tsx`
- `src/opus/pages/PortalContact.tsx`
- `src/opus/utils/__tests__/auditDiff.test.ts`
- `src/opus/utils/auditDiff.ts`
- `supabase/migrations/20261002120000_require_revert_audit_event.sql`
- `supabase/migrations/20261002123754_20261002120000_require_revert_audit_event.sql`

## Acceptance criteria

- [x] `AC-1`: Global, job, and staff audit views use the shared event presentation and a focused inspector exposing action, named record, actor, exact time, details, and corrective-event context — evidence: source review and focused tests.
- [x] `AC-2`: UPDATE entries expose field-level before → after values, while unknown actions are explicit system events and ordinary summaries avoid raw IDs — evidence: `src/opus/utils/__tests__/auditDiff.test.ts` and source review.
- [x] `AC-3`: Search/filter behavior covers the intended audit categories and named records without searching or rendering restricted raw payloads by default; unknown field names, opaque IDs, URLs, and malformed actor identifiers are redacted in visible and accessible copy — evidence: focused tests and source review.
- [x] `AC-4`: Revert controls remain limited to the existing safe staff/job fields, preserve admin/director and tenant boundaries, and fail the revert transaction if its corrective audit event cannot be written — evidence: source review, corrective migration, and role guards.
- [x] `AC-5`: The formatting repair leaves no repository-wide lint or formatting blocker, and the production build remains within budget — evidence: lint, Prettier, typecheck, tests, and build-budget commands.
- [x] `AC-6`: The release contract explicitly keeps live completion blocked until both audit migrations, the deployed audit bundle, and an authenticated audit-route check are independently verified; the current release status remains pending until that evidence exists — evidence: this contract's release decision and verification table.

## Risk and approval gates

- This is a high-risk release because it changes audit evidence presentation and
  depends on tenant-scoped SECURITY DEFINER/RLS behavior already introduced by
  the base migrations. No role or tenant access may be broadened by the UI.
- The audit migrations are forward-only. Inspect the remote ledger and run a
  dry-run before applying them; use a reviewed corrective migration rather than
  editing or deleting an applied migration.
- Do not expose upload URLs, tokens, request identifiers, or nested technical
  payloads in the normal inspector view.
- The live `process_audit_log` function preserves ordinary business-write
  availability when audit insertion fails by warning and continuing. The new
  corrective migration changes only the transaction-local revert path to fail
  closed, so a successful revert still guarantees a corrective event. Ordinary
  writes remain an explicit audit-completeness residual rather than proof that
  every business write has a recorded event.
- Code rollback is a Git revert. Database rollback requires a separately
  reviewed corrective migration; do not invent an ad-hoc reversal during the
  release.
- Human approval required: PENDING — the explicit user live-release request is
  the release authorization, while the repository reviewer/QMS acknowledgement
  remains to be recorded.

## Verification evidence

| Check                     | Exact command or evidence                                                                                                                                                      | Result                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Contract                  | `npm run quality:contract`                                                                                                                                                     | PASS after final fingerprint                                                         |
| Lint                      | `npm run lint`                                                                                                                                                                 | PASS after formatting repair                                                         |
| Formatting                | `npx --no-install prettier --check .`                                                                                                                                          | PASS after formatting repair                                                         |
| Typecheck                 | `npm run typecheck`                                                                                                                                                            | PASS                                                                                 |
| Tests                     | `npm run test`                                                                                                                                                                 | PASS — 162 passed, 1 skipped                                                         |
| Build and budget          | `VITE_SUPABASE_URL=https://placeholder.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=placeholder-anon-key npm run build:budget`                                                    | PASS                                                                                 |
| Fresh critic              | Independent read-only critic task 28 against the exact diff, contract, migrations, role guards, and tests                                                                      | PASS — no blocking or major findings                                                 |
| Remote migration ledger   | Composio Supabase read-only catalog query plus `SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx --no-install supabase db push --project-ref fgpthpxmiroyebrzjdzo --dry-run` | PASS — canonical and remote marker versions recorded; remote up to date              |
| Live schema lint          | `SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx --no-install supabase db lint --linked`                                                                                    | Audit migration passes; unrelated pre-existing `submit_job_attachment` error remains |
| Production client config  | `curl` production shell/assets and Supabase Auth settings with the public publishable key                                                                                          | PASS — no placeholder config; bundle points to `fgpthpxmiroyebrzjdzo.supabase.co` |
| Live deployment           | Direct Wrangler deployment with production config, version `e67906b4-e0df-4885-8620-4dae84b61586`, plus `curl` checks against `https://opusform.co.uk/` and the Worker URL | PASS — HTTP 200; deployed audit asset contains redaction markers |
| Authenticated audit route | Approved QA/admin read-only browser or API check                                                                                                                               | PENDING                                                                              |

## Critic review

- Critic context/identity: Independent fresh read-only review, task 28, separate from the implementation pass.
- Review input: exact working-tree diff, this contract, base commit `8a92504`, audit migrations, role guards, and the relevant QMS rules.
- Verdict: `PASS`
- Findings: none after repairs; the known unrelated `public.submit_job_attachment` schema-lint error remains outside this release scope.
- Unresolved blocking findings: `none`
- Repair iterations: `5`

## Release decision

- Automated gate: `PASS` — `npm run quality:gate` passed with only the existing lint warnings.
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty or exception: Live migration application, Worker provenance, and authenticated audit behavior must be verified before describing the release as complete.
