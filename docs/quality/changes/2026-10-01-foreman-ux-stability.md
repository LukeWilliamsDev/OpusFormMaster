# Opus Form change contract — Foreman UX and refresh stability

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** source | documentation
**Accountable owner:** Opus Form director / named repository reviewer
**Source of truth:** User-approved Foreman UX brief and rendered mockups from 2026-10-01
**Evidence base:** `a6bd2b5f09451c68ce59506f0e0b72c5e6f59a4c`
**Evidence head:** `HEAD`
**Evidence fingerprint:** `83b95c569729c243a9496b13f10274487498823f2927a693a48e45c9e38ab24d`

## Intent

Make the Foreman assigned-site workflow easier to scan and safer to use on a
phone: keep important information visible, make completed status unambiguous,
align Help copy with the product, and stop routine background polling from
blanking the page.

## Scope

### In scope

- Foreman assigned-site detail layout and status presentation.
- Foreman Help wording and navigation labels.
- Background data refresh behavior for the Foreman portal.
- Tests and documentation needed to preserve the UX and access boundary.

### Out of scope

- RLS, role definitions, route authorization, or database schema changes.
- Changes to assignment visibility, mutation permissions, or attachment policy.
- Changes to non-Foreman portal surfaces except shared status helpers.

### Changed files

- `docs/quality/changes/2026-10-01-foreman-ux-stability.md`
- `src/opus/context/PortalContext.tsx`
- `src/opus/pages/ForemanSitePage.tsx`
- `src/opus/pages/ForemanSitesPage.tsx`
- `src/opus/pages/ForemanWorkspace.tsx`
- `src/opus/pages/PortalHelp.tsx`

## Acceptance criteria

- [x] `AC-1`: Assigned-site primary workflow and supporting sections are visible without expansion controls — evidence: `ForemanSitePage.tsx` and local render.
- [x] `AC-2`: Completed sites use the shared green completed treatment and clearly show view-only behavior — evidence: site list/detail status classes and completed banner.
- [x] `AC-3`: Foreman Help uses the same labels and status language as the visible UI — evidence: `PortalHelp.tsx`.
- [x] `AC-4`: Background refresh preserves the current rendered site and form state instead of showing a page skeleton — evidence: local 35-second browser observation recorded `loadingSkeletonSeconds: 0` with no post-login navigations.
- [x] `AC-5`: Existing Foreman route, mutation, and denial behavior remains unchanged — evidence: scoped client-only diff and existing live acceptance baseline.

## Risk and approval gates

- This is a UI and client-refresh change only; existing tenant, assignment, RLS, and completed-site write boundaries must remain unchanged.
- Realtime assignment updates remain enabled; stale or revoked assignments must not remain visible after a failed or completed refresh.
- Human approval required: yes — the user approved the rendered UX direction before implementation.

## Verification evidence

| Check                  | Exact command or evidence                                                              | Result                |
| ---------------------- | -------------------------------------------------------------------------------------- | --------------------- |
| Contract               | `QUALITY_BASE_REF=origin/main npm run quality:contract -- --staged-only`               | PASS                  |
| Unit tests             | `npm test`                                                                             | 141 passed, 1 skipped |
| Typecheck              | `npm run typecheck`                                                                    | PASS                  |
| Build and quality gate | `QUALITY_BASE_REF=origin/main npm run quality:gate -- --staged-only`                   | PASS                  |
| Visual verification    | Rendered Foreman mobile/desktop/completed-state screenshots                            | APPROVED DIRECTION    |
| Refresh verification   | Local 35-second browser observation: no loading skeleton and no post-login navigations | PASS                  |

## Critic review

- Critic context/identity: Fresh independent read-only review of the final diff.
- Review input: final Foreman source diff, approved mockups, Help copy, and refresh behavior.
- Verdict: `PASS`
- Findings: Initial review identified background-failure blanking, inconsistent completed badge/edit affordance, mobile Help vocabulary, and route-change state bleed; all were repaired.
- Unresolved blocking findings: `none`
- Repair iterations: `2`

## Release decision

- Automated gate: `PASS` locally; CI pending
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty or exception: refresh interval remains bounded for assignment revocation safety; it must not cause visible page replacement.
