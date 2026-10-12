# Opus Form change contract — production dependency audit remediation

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** dependency
**Accountable owner:** Luke Williams / Opus Form
**Source of truth:** CI run 38212638192 for PR #59
**Evidence base:** `origin/main`
**Evidence head:** working tree (uncommitted)
**Evidence fingerprint:** f9db0733c4091f91253035d9fa4cdbabe996f5aa0a1bb150557cd7172f8fecad

## Intent

Update the lockfile entries for the two production dependency vulnerabilities that blocked PR #59 without changing application source or dependency ranges.

## Scope

### In scope

- Lock `seroval` at `1.6.9` and `source-map-js` at `1.2.2`, both fixed versions for the CI-reported advisories.
- Verify the production-only audit gate and preserve application behavior.

### Changed files

- `docs/quality/changes/2026-10-12-dependency-audit-remediation.md`
- `package-lock.json`

### Out of scope

- Force-upgrading development-only packages or changing `package.json` ranges.
- Bypassing CI, merging with failing checks, or changing production data/services.

## Acceptance criteria

- [x] `npm audit --omit=dev --audit-level=high` reports zero vulnerabilities.
- [x] The lockfile resolves `seroval@1.6.9` and `source-map-js@1.2.2`.
- [x] Typecheck and focused quote VAT/CC tests remain passing.

## Risk and approval gates

- This is a lockfile-only production dependency patch; application source is unchanged.
- `npm audit` without `--omit=dev` still reports unrelated development-tool advisories; the CI gate being repaired is explicitly production-only.
- CI must pass before the production merge; no audit bypass is authorized.

## Verification evidence

| Check               | Evidence                                                      | Result  |
| ------------------- | ------------------------------------------------------------- | ------- |
| Production audit    | `npm audit --omit=dev --audit-level=high` — 0 vulnerabilities | PASS    |
| Lockfile validation | `npm ci --ignore-scripts --dry-run` completed successfully    | PASS    |
| Typecheck           | `npm run typecheck`                                           | PASS    |
| Focused tests       | Billing and quote-email tests — 5 passed                      | PASS    |
| CI                  | PR #59 rerun after this commit                                | PENDING |

## Critic review

- Verdict: `PASS`
- Unresolved blocking findings: `none`
- Repair iterations: `0`

## Release decision

- Automated gate: `PENDING — CI rerun required`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
