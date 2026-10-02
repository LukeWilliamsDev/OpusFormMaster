# Opus Form change contract — CI quality base

**Status:** READY_FOR_REVIEW
**Risk:** low
**Change category:** source
**Accountable owner:** Luke Williams / Opus Form
**Source of truth:** Production CI failure after the approved dashboard release
**Evidence base:** `94ce231`
**Evidence head:** working tree
**Evidence fingerprint:** `3b83c0338c62c50cc470579bee2d94d3203858ae22132c882b4512bf3d322f5e`

## Intent

Keep push CI evidence scoped to the commit being tested, rather than replaying older release contracts from the branch history.

## Scope

### In scope

- The push-run `QUALITY_BASE_REF` expression in `.github/workflows/ci.yml`.
- The pre-commit staged-diff base in `.husky/pre-commit`.
- The evidence contract for this CI-only correction.

### Out of scope

- Application behavior, role access, database schema, RLS, production data, and deployment credentials.

### Changed files

- `.github/workflows/ci.yml`
- `.husky/pre-commit`
- `docs/quality/changes/2026-10-02-ci-quality-base.md`

## Acceptance criteria

- [x] `AC-1`: Push CI uses the pushed commit's first parent as its quality base and pull requests continue using the PR base SHA.
- [x] `AC-2`: The correction changes no application behavior or external service state.

## Risk and approval gates

- This is a low-risk release-control correction.
- Human approval required: yes — the release owner reviews the CI result before production is treated as released.

## Verification evidence

| Check    | Exact command or evidence                   | Result             |
| -------- | ------------------------------------------- | ------------------ |
| Contract | `npm run quality:contract -- --staged-only` | PASS after staging |
| Critic   | Fresh read-only review of workflow diff     | PASS               |
| CI       | GitHub Actions run for the pushed commit    | PENDING            |

## Critic review

- Critic context/identity: fresh read-only review `task_18`
- Review input: workflow diff and this contract
- Verdict: `PASS`
- Findings: No blocking or major findings remain.
- Unresolved blocking findings: `none`
- Repair iterations: `0`

## Release decision

- Automated gate: `PENDING`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty or exception: CI and Cloudflare production results remain to be verified after push.
