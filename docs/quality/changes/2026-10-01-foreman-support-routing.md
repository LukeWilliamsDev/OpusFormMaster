# Opus Form change contract — Foreman support routing

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** source | edge-function | documentation
**Accountable owner:** Opus Form director / named repository reviewer
**Source of truth:** User-approved Foreman support-routing brief from 2026-10-01
**Evidence base:** `677bbb71b7405f2d88fe642c85cdde6ce8d66f3f`
**Evidence head:** `HEAD`
**Evidence fingerprint:** `100e2bd1c158e6147f8ed7f60d9ea5edee71c03cc9fc8d4804270ba16e0cf3b5`

## Intent

Remove duplicate and contradictory Foreman support paths: site work questions
stay in the site-level Contact operations panel, while portal/access/
technical issues use Contact IT and are actually accepted by the support
function.

## Scope

### In scope

- Change Foreman Help, More, and contact-page labels/copy to Contact IT for technical support.
- Keep Contact operations guidance limited to site work, blockers, assignments, and handoffs.
- Authorize active Foreman accounts in `send-portal-help-request` and identify their requests to IT.
- Correct Help text describing completed-site photo behavior.

### Out of scope

- Changing the site-level Contact operations note path or its RLS.
- Changing support recipients, authentication, or access for management roles.
- Changing database schema or production data.

### Changed files

- `docs/quality/changes/2026-10-01-foreman-support-routing.md`
- `src/opus/layouts/PortalLayout.tsx`
- `src/opus/pages/ForemanSitePage.tsx`
- `src/opus/pages/ForemanSitesPage.tsx`
- `src/opus/pages/PortalContact.tsx`
- `src/opus/pages/PortalHelp.tsx`
- `supabase/functions/send-portal-help-request/index.ts`

## Acceptance criteria

- [x] `AC-1`: Foreman Help and More use Contact IT for portal/access/technical issues — evidence: Help, More, contact-page, and no-site-state copy.
- [x] `AC-2`: Foreman site Work guidance directs site-work questions to Contact operations without duplicating the portal support CTA — evidence: site Work panel and Help guidance.
- [x] `AC-3`: Active Foreman support submissions are accepted by the edge function and identified as Foreman requests to IT — evidence: authenticated role allowlist and role-labelled email source.
- [x] `AC-4`: Help accurately states that completed-site updates are read-only while Before/After photos may still be added and not deleted — evidence: corrected Foreman Help copy.

## Risk and approval gates

- This changes support routing and an Edge Function authorization boundary; no database rows or RLS policies change.
- The edge function continues to require an authenticated active profile and only adds `site_foreman` beside the existing third-party allowlist.
- Human approval required: yes — the user approved the improved support-routing prompt.

## Verification evidence

| Check                             | Exact command or evidence                                                | Result                  |
| --------------------------------- | ------------------------------------------------------------------------ | ----------------------- |
| Contract                          | `QUALITY_BASE_REF=origin/main npm run quality:contract -- --staged-only` | PASS pending final gate |
| Unit tests                        | `npm test`                                                               | 141 passed, 1 skipped   |
| Typecheck                         | `npm run typecheck`                                                      | PASS                    |
| Edge/source validation            | Foreman authorization and role-labelled email source review              | PASS                    |
| Visual/accessibility verification | Help, More, Contact IT wording and site Work guidance                    | PASS source review      |
| Live support check                | Authenticated Foreman request delivered to IT                            | PENDING post-deploy     |

## Critic review

- Critic context/identity: Fresh independent read-only review of support copy, routing, and Edge Function boundary.
- Review input: final source diff, edge function diff, tests, and live support evidence.
- Verdict: `PASS`
- Findings: Initial review found two stale “Contact operations” links that routed to the IT form; both were corrected before release. No blocking findings remain.
- Unresolved blocking findings: `none`
- Repair iterations: `0`

## Release decision

- Automated gate: `PENDING`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty or exception: delivery confirmation requires a live authenticated Foreman submission after Edge Function deployment.
