# Opus Form change contract — required manual compliance evidence

**Status:** READY_FOR_REVIEW
**Risk:** high
**Change category:** source | database | security
**Accountable owner:** Opus Form director / named repository reviewer
**Source of truth:** User requirement that adding compliance must require an uploaded document
**Evidence base:** `origin/dev` at task start
**Evidence head:** uncommitted working tree after implementation
**Evidence fingerprint:** `bc5958904388a5885be4a0865ad3f32e1e7053bac69ff8f787cba933358cdfa2`

## Intent

Ensure an internal manual compliance record cannot be created without an evidence
file. Enforce the requirement in the form, storage path policy, and the tenant-scoped
RPC so a direct client call cannot bypass it.

## Scope

### In scope

- Require a PDF or image file in the internal Add compliance form.
- Upload evidence to a tenant-scoped staff path in the private compliance bucket.
- Store the evidence reference on the manual ticket and expose it through the existing signed-url viewer.
- Require and validate the document reference in `add_manual_staff_compliance`.
- Add focused validation and contract evidence.
- Apply the reviewed migration to the hosted Supabase project and release the frontend through the guarded production workflow.
- Verify the deployed Worker health/build identity and hosted migration result without creating production fixture data.

### Out of scope

- Third-party upload flows and worker self-service credential requests.
- Changing certificate verification semantics or existing records.

### Changed files

- `src/opus/components/RosterView.tsx`
- `src/opus/components/PersistentJobHeader.tsx`
- `src/integrations/supabase/types.ts`
- `supabase/migrations/20261119130000_require_manual_compliance_evidence.sql`
- `docs/quality/changes/2026-11-19-required-compliance-evidence.md`

## Acceptance criteria

- [x] `AC-1`: The Add compliance form visibly marks evidence as required and blocks submission without a file.
- [x] `AC-2`: The client and storage policy accept only PDF/JPG/JPEG/PNG evidence up to 10 MB and surface failed orphan cleanup.
- [x] `AC-3`: The storage policy permits only authorized management users to write a manual staff path within their current tenant.
- [x] `AC-4`: The RPC rejects missing, malformed, missing-object, invalid-type, oversized, or non-tenant document references and stores the path on the created ticket.
- [x] `AC-5`: A saved manual compliance record offers View File through the existing private signed-URL path without raw-URL fallback.
- [x] `AC-6`: Lint, typecheck, repository tests, local migration replay/lint, and the repository quality gate are run and recorded.
- [x] `AC-7`: A fresh read-only critic reviews the actual diff with no unresolved blocking or major findings.

## Risk and approval gates

- This is a high-risk authorization and private-document integrity change because it adds a storage path and changes a security-definer RPC.
- The UI is convenience validation only. The storage policy and RPC independently enforce tenant, role, path, object existence, MIME, and size constraints.
- The evidence reference is a bucket-relative path, not a public URL. Viewing requires a short-lived signed URL and never falls back to opening the raw path.
- The migration is forward-only; rollback requires a reviewed corrective migration and must not delete existing tickets or evidence.
- Human approval required: yes — the accountable Opus Form owner/reviewer must approve the exact diff and hosted migration before merge or release.

## Invariants and approval gates

- The database authorization boundary remains authoritative; UI `required` is not security.
- The compliance bucket remains private and document access remains tenant-scoped.
- Hosted schema changes are limited to this additive migration; no production fixture data is created.
- The user explicitly requested production release in the current conversation; migration, deployment, and live acceptance remain controlled release gates.

## Verification evidence

| Check                 | Exact command or evidence                               | Result                                                                                                                                                         |
| --------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck             | `npm run typecheck`                                     | PASS                                                                                                                                                           |
| Formatting            | `npx prettier --check` on changed source/contract files | PASS                                                                                                                                                           |
| Tests                 | `npm test`                                              | PASS — 145 passed, 1 skipped                                                                                                                                   |
| Migration replay      | `npx supabase db reset --local --no-seed`               | PASS                                                                                                                                                           |
| Schema lint           | `npx supabase db lint --local`                          | PASS — no schema errors                                                                                                                                        |
| Quality gate          | `npm run quality:gate`                                  | BLOCKED locally at production build because approved `VITE_*` values are unavailable; contract, lint, format, typecheck, tests, and local schema checks passed |
| Hosted migration      | Composio `SUPABASE_APPLY_A_MIGRATION`                   | PENDING — apply only after the exact committed migration is reviewed                                                                                           |
| Production release    | Guarded GitHub `Production deploy` workflow             | PENDING — requires the committed diff on `dev` and passing CI/watchdog                                                                                         |
| Changed-file manifest | `git status --short` and actual diff                    | PASS — four non-contract files plus this contract                                                                                                              |

## Critic review

Critic context/identity: Fresh independent read-only critic task `task_132` reviewed the exact required-compliance worktree after the final policy and viewer repairs.
Critic verdict: PASS — no unresolved blocking or major findings. The critic confirmed the split request/manual storage policies, private signed-URL handling, popup-aware audit logging, reconciliation and cleanup paths, tenant constraints, grants, and keyboard-accessible evidence input.
Repair iterations: 4 (canonical path storage and object validation; signed-URL-only viewing and cleanup; reconciliation, deletion consistency, and audit timing; split role-aware manual storage policies and popup handling).
Unresolved blocking findings: none.

## Release decision

Automated gate: Local build remains blocked by unavailable approved production `VITE_*` values; the guarded production workflow is the authoritative production build and smoke gate.
Release status: READY_FOR_HUMAN_APPROVAL; deployment is explicitly requested by the user but remains subject to hosted migration and guarded workflow results.
Human approval: PENDING
User deployment request: Explicitly requested in the current conversation; live role acceptance remains a post-deploy evidence gate.
