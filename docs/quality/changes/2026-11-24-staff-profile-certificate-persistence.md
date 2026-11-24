# Opus Form change contract — staff-profile certificate persistence

**Status:** READY_FOR_REVIEW
**Risk:** high
**Change category:** staff-profile UI/storage/RLS/data-integrity
**Accountable owner:** Luke Williams / Opus Form
**Source of truth:** User request to restore staff-profile certificate uploads and ensure changes persist without silent overwrite
**Evidence base:** `origin/promote-live@af99e5c`
**Evidence head:** uncommitted isolated worktree `letta/staff-profile-persistence`
**Evidence fingerprint:** 6ea6b225be2db5bb131277307a88820dd575a149517b7377f62e416048da1c6f

## Intent

Restore a working certificate upload action on internal staff profiles and make
staff certificate/profile writes durable. A profile edit must not replay a stale
certificate snapshot, certificate uploads must use immutable non-colliding paths,
and a failed metadata write must not claim success or leave an untracked object.

## Scope

### In scope

- Internal staff-profile certificate evidence upload and persistence.
- Existing third-party staff certificate, passwordless credential, and internal
  checker upload reliability where the same storage-to-metadata failure applies.
- Profile-state synchronization that must not write stale `tickets` or
  `uploaded_certificates` values during ordinary profile edits.
- Storage bucket limits, tenant/role/path RLS, failure cleanup, and focused tests.
- A release-bound change contract and verification evidence.

### Out of scope

- Applying migrations, mutating Supabase data, deploying Edge Functions, or
  publishing the release.
- Merging unrelated `origin/dev` product work into the live-release baseline.
- Rewriting existing certificate history or changing the approved role model.
- Removing or replacing an existing certificate without an explicit user action.

### Changed files

- `docs/quality/changes/2026-11-24-staff-profile-certificate-persistence.md`
- `src/integrations/supabase/types.ts`
- `src/opus/components/RosterView.tsx`
- `src/opus/context/PortalContext.tsx`
- `src/opus/lib/__tests__/certificateUpload.test.ts`
- `src/opus/lib/certificateUpload.ts`
- `src/opus/lib/staffUploadCleanup.ts`
- `src/opus/pages/CertificateCheckerPage.tsx`
- `src/opus/pages/SubmitCredentials.tsx`
- `src/opus/pages/ThirdPartyPortalPage.tsx`
- `src/opus/types/erp.ts`
- `supabase/config.toml`
- `supabase/functions/cleanup-staff-upload/index.ts`
- `supabase/migrations/20261124093000_staff_certificate_integrity.sql`

## Invariants

- Certificate evidence remains in private, tenant-scoped storage with the
  approved PDF/PNG/JPEG and 10 MB limits.
- New uploads use unique paths and `upsert: false`; an upload never replaces an
  existing object implicitly.
- Metadata is appended or updated only by an explicit workflow; ordinary staff
  profile edits never send certificate snapshots.
- A failed metadata write cleans up only the just-created, still-unlinked object;
  if ownership cannot be verified, the object is retained and surfaced as a
  support cleanup rather than deleted speculatively.
- Tenant, role, token, and linked-record boundaries remain enforced by RLS or a
  narrowly scoped security-definer function.
- Existing certificate history remains available unless an explicit removal or
  replacement action is confirmed.

## Acceptance criteria

- [x] An authorized internal user can upload valid certificate evidence from a
      staff profile, save the record, reload it, and open the persisted file.
- [x] Invalid type/size/empty files are rejected before upload with a clear error.
- [x] Profile detail edits persist without removing or replacing certificates
      added by another workflow or session.
- [x] Adding certificate A and then B preserves both records; replacement is an
      explicit action and does not overwrite the historical object.
- [x] Failed metadata writes do not report success and clean up only unlinked
      objects when ownership is verified.
- [x] Tenant/role/storage boundaries and anonymous request upload behavior are
      covered by the migration review and focused checks.
- [x] Typecheck, tests, build, focused lint, and the repository quality gate are
      recorded against the final diff.
- [x] A fresh read-only critic reviews the actual diff and reports no unresolved
      blocking or major finding.

## Risk and approval gates

- Storage/RLS/function migrations require named human review before remote apply.
- Live authenticated upload, cross-tenant isolation, and private-file acceptance
  remain pending until an approved QA identity completes the role matrix.
- Production migration, Edge Function, and frontend deployment were applied only
  after explicit release-owner instruction through the approved service actions;
  authenticated role-matrix acceptance remains open.
- Rollback is a reviewed forward-only corrective migration or source revert; no
  destructive reset, force push, or manual production cleanup is permitted.

## Verification evidence

| Check                   | Evidence                                            | Result                                                                                                                                                                                                                            |
| ----------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract                | `npm run quality:contract`                          | PASS                                                                                                                                                                                                                              |
| Typecheck               | `npm run typecheck`                                 | PASS                                                                                                                                                                                                                              |
| Tests                   | `npm test` plus focused upload tests                | PASS — 22 files, 197 passed, 1 skipped                                                                                                                                                                                            |
| Focused lint            | Changed client/helper sources                       | PASS — 0 errors, 20 existing warnings                                                                                                                                                                                             |
| Build                   | `npm run build`                                     | PASS                                                                                                                                                                                                                              |
| Supabase schema         | `npx supabase db lint --local`                      | PASS — no schema errors                                                                                                                                                                                                           |
| Live Supabase migration | Composio migration apply + read-only verification   | PASS — `staff_certificate_integrity` recorded as `20261124215020`; recovery table, RPCs, policies, and profile-only grants verified                                                                                               |
| Live cleanup function   | Composio Supabase MCP deployment + function listing | PASS — `cleanup-staff-upload` version 2, ACTIVE, `verify_jwt=false`                                                                                                                                                               |
| Cloudflare Worker       | `wrangler deploy --config wrangler.jsonc`           | PASS — version `9e948566-d471-4652-9103-1cc3a3f471e3`; public domain serves new `RosterView` and cleanup assets                                                                                                                   |
| Edge Function syntax    | Deno check                                          | NOT_RUN — Deno unavailable; source reviewed                                                                                                                                                                                       |
| Quality gate            | `npm run quality:gate`                              | BLOCKED — repository-wide Prettier check fails on two pre-existing unchanged contracts: `docs/quality/changes/2026-11-13-opusform-master-remediation.md` and `docs/quality/changes/2026-11-19-job-media-video-and-compression.md` |
| Live/QA upload matrix   | Requires approved authenticated staff identity      | PARTIAL — public bundle/function/schema verified; authenticated upload, cross-tenant, and private-file acceptance remain pending                                                                                                  |
| Independent critic      | Fresh read-only review of final diff                | PASS — no blocking/major findings                                                                                                                                                                                                 |

## Critic review

- Verdict: PASS
- Unresolved blocking findings: None
- Repair iterations: 2

## Release decision

- Automated gate: BLOCKED_BY_BASELINE_FORMAT_DEBT; deployment completed under explicit release-owner instruction
- Release status: READY_FOR_HUMAN_APPROVAL
- Human approval: PENDING
- Authenticated production acceptance remains the final open gate.
