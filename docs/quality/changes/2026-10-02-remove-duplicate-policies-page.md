# Opus Form change contract — remove duplicate Policies page

**Status:** READY_FOR_REVIEW
**Risk:** low
**Change category:** source | documentation
**Accountable owner:** Opus Form director / named repository reviewer
**Source of truth:** User-approved request to consolidate Policies under Legal & Privacy from 2026-10-02
**Evidence base:** `69be793a69ba39fee951c5d6df71d1a474eb48fb`
**Evidence head:** `HEAD`
**Evidence fingerprint:** `7481017ac44b5d7f95fe6a3cf21c8c33b7174ac8d5f1f21bb5da982c75fddf30`

## Intent

Remove the duplicate admin-only Policies page and direct all policy access
through the existing Legal & Privacy hub, which is already available to all
portal roles.

## Scope

### In scope

- Remove the admin-only `/portal/policies` list route and sidebar item.
- Remove the unused `AdminPolicies` page module.
- Keep `/portal/policies/:policySlug` because Legal & Privacy uses it for individual policy pages.
- Update Help copy so it no longer claims admins manage Policies from a separate page.

### Out of scope

- Removing individual policy pages, Legal & Privacy, public privacy/cookie pages, or policy PDFs.
- Changing policy content, role access to Legal & Privacy, or production data.

### Changed files

- `docs/quality/changes/2026-10-02-remove-duplicate-policies-page.md`
- `src/opus/App.tsx`
- `src/opus/layouts/PortalLayout.tsx`
- `src/opus/pages/AdminPolicies.tsx`
- `src/opus/pages/PortalHelp.tsx`

## Acceptance criteria

- [x] `AC-1`: No standalone Policies item appears in the admin navigation and `/portal/policies` no longer has a dedicated page — evidence: removed nav item, route, lazy import, and page module.
- [x] `AC-2`: Individual policy routes remain available through Legal & Privacy and accessible to portal roles — evidence: preserved `/portal/legal` and `/portal/policies/:policySlug` routes.
- [x] `AC-3`: Help and navigation copy no longer describes policy management through the removed page — evidence: updated internal Help restrictions and navigation comments.

## Risk and approval gates

- This is a low-risk, reversible route/navigation cleanup; no schema, RLS, or production-data changes are in scope.
- The parameterized company-policy route must remain because Legal & Privacy links to it.
- Human approval required: no — the user directly requested this consolidation.

## Verification evidence

| Check                             | Exact command or evidence                                                               | Result                  |
| --------------------------------- | --------------------------------------------------------------------------------------- | ----------------------- |
| Contract                          | `QUALITY_BASE_REF=origin/main npm run quality:contract -- --staged-only`                | PASS pending final gate |
| Unit tests                        | `npm test`                                                                              | 141 passed, 1 skipped   |
| Typecheck                         | `npm run typecheck`                                                                     | PASS                    |
| Build/route validation            | `npm run build`; source review of `/portal/policies` and `/portal/policies/:policySlug` | PASS                    |
| Visual/accessibility verification | Admin nav and Legal & Privacy entry-point review                                        | PASS source review      |

## Critic review

- Critic context/identity: Fresh independent read-only review of route removal and Legal & Privacy preservation.
- Review input: final source diff, tests, typecheck, build, and route evidence.
- Verdict: `PASS`
- Findings: No blocking findings. The duplicate admin page is removed while Legal & Privacy and parameterized policy pages remain intact.
- Unresolved blocking findings: `none`
- Repair iterations: `0`

## Release decision

- Automated gate: `PENDING`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty or exception: existing bookmarks to `/portal/policies` will no longer open the old admin list.
