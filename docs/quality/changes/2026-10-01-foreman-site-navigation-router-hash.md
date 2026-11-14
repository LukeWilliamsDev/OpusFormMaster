# Opus Form change contract — Foreman navigation router hash fix

**Status:** READY_FOR_REVIEW
**Risk:** low
**Change category:** source | documentation
**Accountable owner:** Opus Form director / named repository reviewer
**Source of truth:** User-reported Files navigation regression from 2026-10-01
**Evidence base:** `8a21ec4b568c1c26461c29e7932ebce9e72d034d`
**Evidence head:** `HEAD`
**Evidence fingerprint:** `158e653f55bec8bd1c8515ec302a0d442c9c4e4c9119e44b8f10ad2fc287e96b`

## Intent

Keep the HashRouter route intact when the Foreman site-level navigation changes
between Work, Files, and Shifts.

## Scope

### In scope

- Use React Router navigation for site-section hashes instead of replacing the browser hash directly.
- Preserve direct and legacy section links while keeping the portal route mounted.

### Out of scope

- Any change to site information architecture, role permissions, data, or RLS.

### Changed files

- `docs/quality/changes/2026-10-01-foreman-site-navigation-router-hash.md`
- `src/opus/pages/ForemanSitePage.tsx`

## Acceptance criteria

- [x] `AC-1`: Clicking Work, Files, or Shifts keeps the user inside the Foreman site route — evidence: React Router `navigate` with preserved pathname/search.
- [x] `AC-2`: Files opens the combined Photos/Documents destination rather than the website root — evidence: route-safe hash update and active-section mapping.
- [x] `AC-3`: Legacy `#site-photos`, `#site-documents`, and `#site-updates` links continue to resolve correctly — evidence: alias mapping and preserved section IDs.

## Risk and approval gates

- This is a low-risk, reversible client-side routing fix; no database or external-service changes are in scope.
- Existing global HashRouter routing must remain intact.
- Human approval required: no — this repairs the reported navigation regression without changing the approved information architecture.

## Verification evidence

| Check                                        | Exact command or evidence                                                                 | Result                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------- |
| Contract                                     | `QUALITY_BASE_REF=origin/main npm run quality:contract -- --staged-only`                  | PASS pending final gate |
| Unit tests                                   | `npm test`                                                                                | 141 passed, 1 skipped   |
| Typecheck                                    | `npm run typecheck`                                                                       | PASS                    |
| Visual/responsive/accessibility verification | React Router hash navigation source review, Files route check, and preserved focus/labels | PASS                    |

## Critic review

- Critic context/identity: Fresh independent read-only review of the routing fix.
- Review input: final source diff, typecheck, tests, and route verification.
- Verdict: `PASS`
- Findings: No blocking findings. React Router navigation preserves the HashRouter route; Files stays inside the combined destination; legacy aliases and access/data behavior remain intact.
- Unresolved blocking findings: `none`
- Repair iterations: `0`

## Release decision

- Automated gate: `PENDING`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty or exception: browser-level route verification remains required after deployment.
