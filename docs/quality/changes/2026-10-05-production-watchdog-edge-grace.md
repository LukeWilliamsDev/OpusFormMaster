# Opus Form change contract — extended edge propagation grace

**Status:** READY_FOR_REVIEW
**Risk:** high
**Change category:** source
**Accountable owner:** Luke Williams / Opus Form
**Source of truth:** Guarded production runs 37285428304, 37287207092, and 37288815081
**Evidence base:** `origin/dev`
**Evidence head:** `e05db78`
**Evidence fingerprint:** `937eceb820212699cf325c46fa8138c87f53e17aacf443e5fa3f19683c2814c7`

## Intent

Allow the public custom hostname enough bounded time to converge after Cloudflare accepts a Worker deployment, based on repeated observed edge lag, without hiding a persistent release failure.

## Scope

### In scope

- Extend `/healthz` propagation polling to a bounded thirty seconds.
- Keep the expected build SHA, approved project, browser smoke, auth boundaries, and rollback rules unchanged.

### Changed files

- `docs/quality/changes/2026-10-05-production-watchdog-edge-grace.md`
- `scripts/production-watchdog.mjs`

### Out of scope

- Disabling health or asset checks.
- Changing Supabase schema, RLS, data, secrets, tenants, accounts, or rollback targets.

## Acceptance criteria

- [x] The watchdog polls health for a bounded thirty-second maximum.
- [x] Persistent health failure still exits nonzero with frontend evidence.
- [x] No auth, dependency, data, RLS, or secret failure becomes frontend rollback eligible.

## Risk and approval gates

- The grace is bounded at thirty seconds: eight two-second requests plus seven two-second waits.
- The first live deployment remains the required authenticated smoke verification.

## Verification evidence

| Check            | Evidence                                                                                             | Result |
| ---------------- | ---------------------------------------------------------------------------------------------------- | ------ |
| Static checks    | Prettier, ESLint, Node syntax check, and contract validation                                         | PASS   |
| Failure boundary | Unreachable watchdog endpoint remains `category: frontend` and exits nonzero after the bounded retry | PASS   |
| Critic review    | Fresh read-only review against the final edge-grace diff                                             | PASS   |

## Critic review

- Verdict: `PASS`
- Unresolved blocking findings: `none`
- Repair iterations: `1`

## Release decision

- Automated gate: `PASS`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
