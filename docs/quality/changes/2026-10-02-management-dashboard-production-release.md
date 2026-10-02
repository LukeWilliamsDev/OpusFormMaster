# Opus Form change contract — management dashboard production release

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** source
**Accountable owner:** Luke Williams / Opus Form
**Source of truth:** User-requested production deployment after approval of the dashboard/navigation mockups on 2026-10-02
**Evidence base:** `f2f120e`
**Evidence head:** `3faaa46`
**Evidence fingerprint:** `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

## Intent

Record the controlled production release of the approved management dashboard and navigation implementation.

## Scope

### In scope

- Release of frontend source already validated by the management dashboard contract.
- Cloudflare Worker deployment and bounded public bundle verification.
- Release provenance, CI result, and rollback reference.

### Out of scope

- Supabase schema, RLS, migrations, Edge Functions, production data, email, or authenticated multi-role acceptance.
- Any follow-up UX or permission changes after this release.

### Changed files

- `docs/quality/changes/2026-10-02-management-dashboard-production-release.md`

## Acceptance criteria

- [x] `AC-1`: The source release commit `f2f120e83e624a5ba55b142fccbb7ab6f20ec78e` and its release-evidence commit are present on `origin/dev`.
- [x] `AC-2`: GitHub CI run `36997624000` completed successfully, including quality gate, build-asset check, and Wrangler dry run.
- [x] `AC-3`: Cloudflare Worker `lovable-opus-form` deployed successfully with version `7e2f179d-4bb7-446f-93e2-fa4c8be9f539`.
- [x] `AC-4`: Both `https://opusform.co.uk/` and `https://lovable-opus-form.lukewilliams141.workers.dev/` serve the configured public asset `assets/index-B7nUTotN.js`.
- [x] `AC-5`: Public response checks returned HTTP 200 with the expected security headers; no database or production-data change was made.
- [x] `AC-6`: The deployed production bundle contains the live Supabase project URL, and an unauthenticated browser smoke test reaches the portal login without a root application error.

## Risk and approval gates

- Deployment was explicitly requested by the user after visual approval.
- Cloudflare deployment was performed with the authenticated Wrangler account configured on this machine.
- Live authenticated role acceptance, Supabase policy reconciliation, and production-data verification remain separate gates and were not claimed here.
- Human approval required: yes — accountable release owner review remains required for final release sign-off.

## Verification evidence

| Check          | Exact command or evidence                                                               | Result                                                            |
| -------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| CI             | GitHub Actions run `36997624000`                                                        | PASS                                                              |
| Deployment     | `npx wrangler deploy --config wrangler.jsonc` with the live public client configuration | PASS; Worker version recorded above                               |
| Public bundle  | `curl` checks for both production URLs                                                  | PASS; asset `index-B7nUTotN.js`                                   |
| Public headers | Bounded `HEAD`/HTML response inspection                                                 | PASS; HSTS, CSP, X-Content-Type-Options, X-Frame-Options observed |
| Browser shell  | Puppeteer smoke test of the production portal                                           | PASS; redirected to portal login without page errors              |

## Critic review

- Critic context/identity: fresh read-only release-evidence review after the configured redeploy
- Review input: this contract, commit `3faaa46`, CI run `36997624000`, Wrangler output, and bounded public checks
- Verdict: `PASS`
- Findings: No blocking or major findings remain; authenticated runtime and tenant-isolation checks remain outside this release evidence.
- Unresolved blocking findings: `none`
- Repair iterations: `0`

## Release decision

- Automated gate: `PASS`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty or exception: authenticated multi-role acceptance, Supabase/RLS reconciliation, and independent release sign-off remain open.
