# Opus Form change contract — management dashboard production release

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** source
**Accountable owner:** Luke Williams / Opus Form
**Source of truth:** User-requested production deployment after approval of the dashboard/navigation mockups on 2026-10-02
**Evidence base:** `f2f120e`
**Evidence head:** `f2f120e`
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

- [x] `AC-1`: The source release commit `f2f120e83e624a5ba55b142fccbb7ab6f20ec78e` is present on `origin/dev`.
- [x] `AC-2`: GitHub CI run `36996894760` completed successfully, including quality gate, build-asset check, and Wrangler dry run.
- [x] `AC-3`: Cloudflare Worker `lovable-opus-form` deployed successfully with version `c706f38f-f0ef-4480-a263-9bc04cda08a3`.
- [x] `AC-4`: Both `https://opusform.co.uk/` and `https://lovable-opus-form.lukewilliams141.workers.dev/` serve the new public asset `assets/index-BJRyYsfn.js`.
- [x] `AC-5`: Public response checks returned HTTP 200 with the expected security headers; no database or production-data change was made.

## Risk and approval gates

- Deployment was explicitly requested by the user after visual approval.
- Cloudflare deployment was performed with the authenticated Wrangler account configured on this machine.
- Live authenticated role acceptance, Supabase policy reconciliation, and production-data verification remain separate gates and were not claimed here.
- Human approval required: yes — accountable release owner review remains required for final release sign-off.

## Verification evidence

| Check          | Exact command or evidence                     | Result                                                            |
| -------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| CI             | GitHub Actions run `36996894760`              | PASS                                                              |
| Deployment     | `npx wrangler deploy --config wrangler.jsonc` | PASS; Worker version recorded above                               |
| Public bundle  | `curl` checks for both production URLs        | PASS; asset `index-BJRyYsfn.js`                                   |
| Public headers | Bounded `HEAD`/HTML response inspection       | PASS; HSTS, CSP, X-Content-Type-Options, X-Frame-Options observed |

## Critic review

- Critic context/identity: fresh read-only release-evidence review
- Review input: this contract, commit `f2f120e`, CI run `36996894760`, Wrangler output, and bounded public checks
- Verdict: `PASS`
- Findings: No blocking or major findings remain; authenticated runtime and tenant-isolation checks remain outside this release evidence.
- Unresolved blocking findings: `none`
- Repair iterations: `0`

## Release decision

- Automated gate: `PASS`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty or exception: authenticated multi-role acceptance, Supabase/RLS reconciliation, and independent release sign-off remain open.
