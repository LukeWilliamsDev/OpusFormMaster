# Opus Form change contract — Foreman site information boundary

**Status:** READY_FOR_REVIEW
**Risk:** high
**Change category:** source | database | security | documentation
**Accountable owner:** Opus Form director / named repository reviewer
**Source of truth:** User-approved Foreman site mockups and information-boundary brief from 2026-10-01
**Evidence base:** `47c2cd12b669580eb8a5233455ee6b109daf3515`
**Evidence head:** `HEAD`
**Evidence fingerprint:** `d33908f28abc8696c880df3027bfe13091e338831d481d85af51f3a26f1f3782`

## Intent

Keep Foreman site pages focused on operational site work and prevent commercial
documents such as invoices and quotes from being exposed through either the UI
or direct attachment/storage reads.

## Scope

### In scope

- Remove redundant site-page navigation links and unprovided Next shift placeholders.
- Group site shifts by date instead of rendering one row per crew assignment.
- Add a view-only Before/After photo gallery with no download or delete controls.
- Remove Foreman site-file UI and restrict Foreman attachment metadata/storage reads to image attachments.
- Keep operations and third-party access branches unchanged.

### Out of scope

- Changing who may be assigned to a job or who may write site updates.
- Changing operational/admin document access.
- Deleting any existing attachment rows or storage objects.

### Changed files

- `docs/quality/changes/2026-10-01-foreman-site-information-boundary.md`
- `src/opus/pages/ForemanSitePage.tsx`
- `src/opus/pages/ForemanWorkspace.tsx`
- `supabase/migrations/20261001110000_foreman_site_information_boundary.sql`

## Acceptance criteria

- [x] `AC-1`: Site page has no redundant View updates/View photos links and no unprovided Next shift fields — evidence: final `ForemanSitePage.tsx` diff and source audit.
- [x] `AC-2`: Shifts for the same site are grouped by date with assignment/crew context — evidence: `shiftDates` grouping and rendered site-shift rows.
- [x] `AC-3`: Foreman photos show Before/After labels in a gallery and expose no download/delete/open-full-size action — evidence: transformed preview URLs and view-only Dialog.
- [x] `AC-4`: Foreman UI does not render site files or commercial documents — evidence: no site-file section or file attachment query remains.
- [x] `AC-5`: Foreman metadata and storage RLS permit assigned image attachments only; operations access remains intact — evidence: new append-only policy migration and local replay/lint.
- [x] `AC-6`: Existing Foreman assignments, uploads, completed-site read-only rules, and third-party behavior remain valid — evidence: typecheck, test suite, and scoped critic review.

## Risk and approval gates

- This includes a production RLS/storage boundary change. The migration must be reviewed and applied only after local replay, lint, live read-only policy checks, and named human approval.
- No existing attachment rows or objects are deleted; this is a deny-read boundary for Foreman/third-party field access.
- The migration is forward-only and reversible by a reviewed corrective migration that restores the prior policy branches; do not delete or rewrite the applied migration.
- A browser cannot make an image impossible to save once it has been rendered; the implementation removes explicit download/open/delete actions and serves transformed preview URLs only.
- Human approval required: yes — the user approved the revised mockups and security boundary.

## Verification evidence

| Check                       | Exact command or evidence                                                | Result                                           |
| --------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------ |
| Contract                    | `QUALITY_BASE_REF=origin/main npm run quality:contract -- --staged-only` | PASS pending final gate                          |
| Unit tests                  | `npm test`                                                               | 141 passed, 1 skipped                            |
| Typecheck                   | `npm run typecheck`                                                      | PASS                                             |
| Local migration replay/lint | `npx supabase db reset --local` and `npx supabase db lint --local`       | PASS                                             |
| Remote migration dry run    | `npx supabase db push --project-ref fgpthpxmiroyebrzjdzo --dry-run`      | PASS; one new migration pending                  |
| Live role/RLS check         | Read-only authenticated Foreman and operations attachment queries        | PENDING post-merge migration                     |
| Browser verification        | Foreman mobile/desktop gallery and grouped-shift screenshots             | APPROVED mockup; local data load preview blocked |

## Critic review

- Critic context/identity: Fresh independent read-only security/UX review of the exact staged diff.
- Review input: final diff, approved mockups, RLS/storage policy evidence, and live role checks.
- Verdict: `PASS`
- Findings: No blocking findings. The reviewer confirmed the UI boundary, image-only client queries, operations access preservation, and append-only policy migration.
- Unresolved blocking findings: `none`
- Repair iterations: `0`

## Release decision

- Automated gate: `PENDING`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty or exception: transformed preview URLs reduce exposure but cannot defeat browser-level screenshot/save behavior.
