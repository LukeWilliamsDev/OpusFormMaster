# Opus Form change contract — Foreman site navigation

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** source | documentation
**Accountable owner:** Opus Form director / named repository reviewer
**Source of truth:** User-approved Foreman site-navigation brief and rendered mockups from 2026-10-01
**Evidence base:** `358c046c7abc3c1803407e0e7fb8d86bc24a9869`
**Evidence head:** `HEAD`
**Evidence fingerprint:** `75d09af729aec6382ee472f3dcd2393751cd6f23a5be99c92236e74a3be36b43`

## Intent

Make the Foreman site record easier to navigate by replacing the long scrolling
page with stable site-level destinations while preserving the existing global
portal navigation and access boundaries.

## Scope

### In scope

- Add sticky site-level navigation for Overview, Today, Photos, Documents, and Shifts.
- Make Overview the default summary screen and keep Today focused on updates and operations contact.
- Keep each supporting record in one destination with counts and active-state feedback.
- Preserve hash links from the workspace and direct navigation to site sections.

### Out of scope

- Changing Foreman photo, document, shift, RLS, or write permissions.
- Changing the global Today/Sites/Shifts/More portal navigation.
- Adding new site data or changing existing attachment records.

### Changed files

- `docs/quality/changes/2026-10-01-foreman-site-navigation.md`
- `src/opus/pages/ForemanSitePage.tsx`

## Acceptance criteria

- [x] `AC-1`: Site page exposes Overview, Today, Photos, Documents, and Shifts as directly reachable site destinations — evidence: section map and rendered navigation buttons.
- [x] `AC-2`: Only the active site destination renders its long-form content; duplicate site information is not repeated across the page — evidence: active-section conditional rendering.
- [x] `AC-3`: Sticky site navigation remains usable on mobile and desktop, exposes active state/counts, and preserves keyboard focus visibility — evidence: responsive mockups, semantic buttons, `aria-current`, and focus rings.
- [x] `AC-4`: Existing hash links such as `#site-photos`, grouped shifts, view-only documents, and photo upload controls continue to work — evidence: hash mapping and preserved section/action source.

## Risk and approval gates

- This is a source/UI navigation change only; no schema, policy, external-service, or production-data mutation is in scope.
- Navigation state must not weaken existing RLS, completed-site behavior, photo deletion boundary, or document audience boundary.
- Human approval required: yes — the user approved the rendered navigation mockups before implementation.

## Verification evidence

| Check                                  | Exact command or evidence                                                | Result                                                            |
| -------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Contract                               | `QUALITY_BASE_REF=origin/main npm run quality:contract -- --staged-only` | PASS pending final gate                                           |
| Unit tests                             | `npm test`                                                               | 141 passed, 1 skipped                                             |
| Typecheck                              | `npm run typecheck`                                                      | PASS                                                              |
| Visual/responsive browser verification | Foreman site navigation at mobile and desktop widths; hash destinations  | PASS mockups; local live-data preview blocked by remote data load |
| Accessibility spot check               | Keyboard tab order, `aria-current`, visible focus, and section labels    | PASS source review                                                |

## Critic review

- Critic context/identity: Fresh independent read-only review of the actual staged navigation diff.
- Review input: final source diff, approved mockups, typecheck, tests, and browser evidence.
- Verdict: `PASS`
- Findings: No blocking findings. The reviewer confirmed all destinations, active-only rendering, hash mappings, responsive sticky navigation, focus states, and preservation of existing access boundaries.
- Unresolved blocking findings: `none`
- Repair iterations: `0`

## Release decision

- Automated gate: `PENDING`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty or exception: long labels may require horizontal scrolling on narrow screens; the active tab and counts remain visible.
