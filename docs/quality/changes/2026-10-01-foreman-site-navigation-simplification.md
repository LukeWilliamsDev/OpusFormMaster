# Opus Form change contract — Foreman site navigation simplification

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** source | documentation
**Accountable owner:** Opus Form director / named repository reviewer
**Source of truth:** User-approved mobile navigation simplification brief and rendered mockup from 2026-10-01
**Evidence base:** `d6c8871385a5c6696a48469dd1e1fb22361a0002`
**Evidence head:** `HEAD`
**Evidence fingerprint:** `b5082316f9dbc12845c00a7faa9913f04d7b48f09960172961ee39591e020e33`

## Intent

Reduce mobile navigation density on the Foreman site record by combining
related site destinations without hiding photos, shared documents, or grouped
shifts.

## Scope

### In scope

- Combine Overview and Today into a Work destination.
- Combine Photos and Documents into a Files destination while retaining separate cards inside it.
- Keep grouped Shifts as its own destination.
- Preserve legacy hash links such as `#site-photos`, `#site-documents`, `#site-updates`, and `#site-overview`.

### Out of scope

- Changing global portal navigation, access permissions, uploads, document sharing, or RLS.
- Changing production data or creating fixtures.

### Changed files

- `docs/quality/changes/2026-10-01-foreman-site-navigation-simplification.md`
- `src/opus/pages/ForemanSitePage.tsx`

## Acceptance criteria

- [x] `AC-1`: Site-level navigation has exactly Work, Files, and Shifts destinations on mobile and desktop — evidence: final navigation model and approved responsive mockup.
- [x] `AC-2`: Work renders the update, operations contact, crew, and summary content; Files renders both photo and document cards; Shifts remains grouped by date — evidence: active-section render branches.
- [x] `AC-3`: Existing deep links and section aliases resolve to the correct combined destination — evidence: `siteSectionFromHash` maps legacy photo/document/update/overview hashes.
- [x] `AC-4`: Counts, active state, sticky navigation, keyboard focus, and global portal navigation remain usable — evidence: navigation buttons, `aria-current`, focus rings, and preserved layout.

## Risk and approval gates

- This is a source/UI information-architecture change only; no schema, policy, external-service, or production-data mutation is in scope.
- Existing upload, document audience, completed-site, and RLS boundaries must remain unchanged.
- Human approval required: yes — the user approved the combined Work/Files/Shifts mockup before implementation.

## Verification evidence

| Check                                  | Exact command or evidence                                                     | Result                    |
| -------------------------------------- | ----------------------------------------------------------------------------- | ------------------------- |
| Contract                               | `QUALITY_BASE_REF=origin/main npm run quality:contract -- --staged-only`      | PASS pending final gate   |
| Unit tests                             | `npm test`                                                                    | 141 passed, 1 skipped     |
| Typecheck                              | `npm run typecheck`                                                           | PASS                      |
| Visual/responsive browser verification | Combined Work/Files/Shifts mobile and desktop mockup; deep-link source review | PASS mockup/source review |
| Accessibility spot check               | Keyboard focus, `aria-current`, labels, and retained hash destinations        | PASS source review        |

## Critic review

- Critic context/identity: Fresh independent read-only review of the actual staged simplification diff.
- Review input: final source diff, approved mockup, tests, typecheck, and browser evidence.
- Verdict: `PASS`
- Findings: No blocking findings. The reviewer confirmed Work/Files/Shifts rendering, legacy hash mapping, counts, active state, sticky/focus behavior, and preservation of photo/document/shift access paths.
- Unresolved blocking findings: `none`
- Repair iterations: `0`

## Release decision

- Automated gate: `PENDING`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty or exception: Files contains two cards, so its content is longer than Work; the navigation density is reduced without collapsing document/photo visibility.
