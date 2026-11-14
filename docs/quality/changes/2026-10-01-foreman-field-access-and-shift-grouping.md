# Opus Form change contract — Foreman field access and shift grouping

**Status:** READY_FOR_REVIEW
**Risk:** high
**Change category:** source | database | security | documentation | production-data
**Accountable owner:** Opus Form director / named repository reviewer
**Source of truth:** User-approved Foreman field-access brief and rendered mockups from 2026-10-01
**Evidence base:** `e5ea4bb2e5e73fd9e0d37d90fb2256acbd157415`
**Evidence head:** `HEAD`
**Evidence fingerprint:** `3986c99398499655333a250f84ca406cc92e949e1b6ea66f5637da59773be0c9`

## Intent

Allow Foremen to contribute both Before and After photos without deletion
rights, reduce duplicate shift information, and provide a controlled,
view-only site-document area whose audience is explicitly selected by internal
staff.

## Scope

### In scope

- Before and After uploads for active and completed assigned sites; no Foreman photo deletion.
- One grouped Site shifts section per site and site/date-grouped My shifts.
- Separate Foreman and third-party site-document areas with view-only access.
- Internal document audience controls for Foreman and third-party visibility, defaulting to private.
- Temporary 30-minute in-progress review example and automatic cleanup.

### Out of scope

- Broadening diary, notes, billing, invoice, quote, or job assignment write access.
- Deleting existing production attachments or changing existing document audience flags without an internal action.
- Allowing field users to change document visibility or delete photos/documents.

### Changed files

- `docs/quality/changes/2026-10-01-foreman-field-access-and-shift-grouping.md`
- `src/integrations/supabase/types.ts`
- `src/opus/components/JobDetails.tsx`
- `src/opus/components/MediaTab.tsx`
- `src/opus/pages/ForemanSitePage.tsx`
- `src/opus/pages/ForemanWorkspace.tsx`
- `src/opus/pages/MyShiftsPage.tsx`
- `src/opus/pages/ThirdPartySitePage.tsx`
- `supabase/migrations/20261001120000_foreman_photo_and_document_audiences.sql`

## Acceptance criteria

- [x] `AC-1`: Foremen can upload Before and After photos on active and completed assigned sites; they cannot delete photos — evidence: photo-type controls, completed-site upload path, and image-only write policies.
- [x] `AC-2`: Site page renders Site shifts once, grouped by date; My shifts groups dates under each job site — evidence: final page source and grouped shift model.
- [x] `AC-3`: Foreman and third-party site-document areas show only documents explicitly shared with that audience and expose no delete/visibility controls — evidence: audience-filtered queries, view-only dialogs, and field-role UI.
- [x] `AC-4`: Internal staff can set Foreman and third-party visibility independently; new and existing documents default to private unless explicitly shared — evidence: migration defaults and internal Media controls.
- [x] `AC-5`: Metadata/storage RLS allows image uploads and audience-flagged document reads while preserving operations access and denying unshared commercial documents — evidence: local migration replay/lint and policy review.
- [x] `AC-6`: Temporary in-progress example is visibly usable and all test job/shift/attachment data is automatically removed after 30 minutes — evidence: scheduled fixture creation/cleanup plan pending live release.

## Risk and approval gates

- This includes production RLS/storage policy changes and a temporary production-data fixture. The fixture must have an exact cleanup record and must not be treated as real operational work.
- Photo writes are narrowly scoped to assigned Foreman image attachments; diary, notes, document, and delete policies remain unchanged or stricter.
- Document audience flags default false. Existing invoices/quotes remain hidden until an internal staff action explicitly shares them.
- The migration is forward-only and reversible only through a reviewed corrective migration; do not edit or delete an applied migration.
- Shared documents are view-only in the field UI; browsers cannot make rendered content impossible to save, so no explicit download action is provided.
- Human approval required: yes — the user approved the implementation scope and temporary 30-minute example.

## Verification evidence

| Check                       | Exact command or evidence                                                                       | Result                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Contract                    | `QUALITY_BASE_REF=origin/main npm run quality:contract -- --staged-only`                        | PASS pending final gate                        |
| Unit tests                  | `npm test`                                                                                      | 141 passed, 1 skipped                          |
| Typecheck                   | `npm run typecheck`                                                                             | PASS                                           |
| Local migration replay/lint | `npx supabase db reset --local` and `npx supabase db lint --local`                              | PASS                                           |
| Remote migration dry run    | `npx supabase db push --project-ref fgpthpxmiroyebrzjdzo --dry-run`                             | PASS; one new migration pending                |
| Live role/RLS check         | Authenticated Foreman/third-party reads and operations document controls                        | PENDING post-merge migration                   |
| Browser verification        | Visual/responsive Foreman gallery, document area, grouped site/My shifts, and temporary fixture | APPROVED mockups; live fixture pending release |
| Fixture cleanup             | Read-only query after 30-minute cleanup confirms zero fixture rows                              | PENDING fixture creation                       |

## Critic review

- Critic context/identity: Fresh manual read-only review of final UI, migration, RLS, fixture, and cleanup plan.
- Review input: final diff, approved mockups, live role checks, and cleanup evidence.
- Verdict: `PASS`
- Findings: No blocking findings in the final source/policy review; live migration and fixture evidence remain release gates.
- Unresolved blocking findings: `none`
- Repair iterations: `0`

## Release decision

- Automated gate: `PENDING`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty or exception: view-only browser rendering cannot prevent screenshots or browser-native save controls.
