# Opus Form change contract — post-deploy propagation grace

**Status:** READY_FOR_REVIEW
**Risk:** high
**Change category:** source
**Accountable owner:** Luke Williams / Opus Form
**Source of truth:** Production deploy run 37285428304 and its guarded rollback
**Evidence base:** `origin/dev`
**Evidence head:** `4e375f3`
**Evidence fingerprint:** `9166397f11285a4593b8f60204cb21e4d82735ec6f487d470a6ddc3c947878b7`

## Intent

Prevent a false frontend rollback when Cloudflare has accepted a new Worker version but the public hostname still serves the prior edge generation for a short propagation window.

## Scope

### In scope

- Retry `/healthz` for a bounded ten-second propagation grace period.
- Keep expected build, approved Supabase project, browser smoke, and frontend-only rollback boundaries unchanged.
- Document the grace period as an operational invariant.
- Changed files:
  - `docs/operations/PRODUCTION_RESILIENCE.md`
  - `docs/quality/changes/2026-10-05-production-watchdog-propagation.md`
  - `scripts/production-watchdog.mjs`

### Out of scope

- Disabling health checks or treating an old/missing build identity as healthy.
- Changing Supabase schema, RLS, data, secrets, user accounts, or notifications.
- Extending the retry indefinitely or masking a persistent frontend failure.

## Acceptance criteria

- [x] A just-deployed Worker receives a bounded health propagation grace period.
- [x] The watchdog still fails closed after the bounded retry and preserves the observed/expected build evidence.
- [x] No dependency, auth, data, RLS, or secret failure becomes eligible for frontend rollback.
- [x] The retry behavior is formatted, linted, syntax-checked, and independently reviewed.

## Risk and approval gates

- This changes when a production rollback is attempted, so the retry is deliberately bounded at six attempts with two seconds between attempts.
- Persistent failure remains alerting/rollback behavior; no health failure is converted into a pass.
- Supabase, tenant, account, RLS, and data boundaries remain human-owned.

## Verification evidence

| Check                  | Evidence                                                                                                                       | Result |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Failure classification | Unreachable endpoint produced `category: frontend`, `buildSha: unknown`, and nonzero exit after bounded retries                | PASS   |
| Static checks          | Prettier, ESLint, and Node syntax check passed for the watchdog                                                                | PASS   |
| Production evidence    | First deploy run rolled back safely after the public edge still served HTML; this fix addresses that observed propagation race | PASS   |
| Critic review          | Fresh read-only review against the final follow-up diff                                                                        | PASS   |

## Critic review

- Verdict: `PASS`
- Unresolved blocking findings: `none`
- Repair iterations: `1`

## Release decision

- Automated gate: `PASS`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
