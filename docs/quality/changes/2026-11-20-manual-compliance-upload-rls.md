# Opus Form change contract — manual compliance upload RLS correction

**Status:** READY_FOR_REVIEW
**Risk:** high
**Change category:** database | security | source | production
**Accountable owner:** Opus Form director / named repository reviewer
**Source of truth:** User-reported live failure: manual compliance evidence upload returns a Supabase RLS violation
**Evidence base:** `2117f9d` production release
**Evidence head:** working tree before corrective release
**Evidence fingerprint:** `PENDING`

## Intent

Restore manual compliance evidence uploads without weakening the tenant- and
role-scoped storage boundary. Supabase evaluates storage object RLS before all
upload metadata is available, so MIME and size validation remains in the
tenant-scoped finalization RPC rather than the initial insert policy.

## Scope

### In scope

- Replace the manual storage insert policy with role, path, and tenant checks only.
- Preserve post-upload MIME, size, extension, object-existence, and ticket validation in `add_manual_staff_compliance`.
- Generate human-readable evidence names as `{first}_{surname}_{certificate}.{extension}`, with a numeric suffix only when the same name already exists.
- Replay and lint the correction locally, apply it through the approved Supabase integration, and redeploy the guarded production workflow.

### Out of scope

- Broadening the approved management role set.
- Changing existing request-upload policies or existing compliance records.
- Creating production fixture files or changing production data.

### Changed files

- `src/opus/components/RosterView.tsx`
- `src/opus/utils/complianceFilename.ts`
- `src/opus/utils/__tests__/complianceFilename.test.ts`
- `supabase/migrations/20261120030000_fix_manual_compliance_upload_rls.sql`
- `docs/quality/changes/2026-11-20-manual-compliance-upload-rls.md`

## Acceptance criteria

- [ ] `AC-1`: An authorized management user can upload a PDF/JPG/PNG to the manual staff path without an initial storage RLS violation.
- [ ] `AC-2`: A manual upload remains tenant- and role-scoped by storage RLS.
- [ ] `AC-3`: The finalization RPC still rejects missing, malformed, non-PDF/image, oversized, missing-object, or non-tenant evidence.
- [ ] `AC-4`: The uploaded object is named from the selected staff first name, surname, certificate, and original extension; collisions receive a numeric suffix.
- [ ] `AC-5`: Local migration replay, schema lint, typecheck, lint, formatting, and focused filename tests pass.
- [ ] `AC-6`: Hosted policy verification and the guarded production deployment pass without rollback.

## Risk and approval gates

- This is a high-risk storage authorization correction in a live compliance workflow.
- The correction removes only metadata predicates from the initial insert policy; it does not broaden role or tenant access.
- Human approval required: yes — the user explicitly requested correction and redeployment in the current conversation; live acceptance remains release evidence.

## Verification evidence

| Check                  | Exact command or evidence                                            | Result                              |
| ---------------------- | -------------------------------------------------------------------- | ----------------------------------- |
| Local migration replay | `npx supabase db reset --local --no-seed`                            | PASS — corrective migration applied |
| Local schema lint      | `npx supabase db lint --local`                                       | PASS — no schema errors             |
| Filename tests         | `npx vitest run src/opus/utils/__tests__/complianceFilename.test.ts` | PASS — 2 tests                      |
| Typecheck/lint/format  | `npm run typecheck`; `npm run lint -- --quiet`; Prettier check       | PASS                                |
| Hosted migration       | Composio `SUPABASE_APPLY_A_MIGRATION`                                | PENDING                             |
| Hosted policy          | Composio read-only policy query                                      | PENDING                             |
| Production deploy      | Guarded GitHub `Production deploy` workflow                          | PENDING                             |
| Live upload acceptance | User-reported retry after deployment                                 | PENDING                             |

## Critic review

Critic verdict: PENDING — fresh read-only review required after the corrective diff and hosted policy verification.
Repair iterations: 0

## Release decision

Automated gate: PENDING
Release status: READY_FOR_HUMAN_APPROVAL
Human approval: PENDING
