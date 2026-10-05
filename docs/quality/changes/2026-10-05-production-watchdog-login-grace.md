# Opus Form change contract — login-render grace

**Status:** READY_FOR_REVIEW
**Risk:** high
**Change category:** source
**Accountable owner:** Luke Williams / Opus Form
**Source of truth:** Guarded production run 37287207092
**Evidence base:** `origin/dev`
**Evidence head:** `origin/dev`
**Evidence fingerprint:** `a0c7fd918ab4ac119b37e05524abbd197f905441110b79eb9d1540966c77972b`

## Intent

Allow the browser smoke check enough time for the merged portal login surface to render after edge propagation and client hydration, without weakening its failure behavior.

## Scope

### In scope

- Increase the login form render wait from 15 seconds to 30 seconds.
- Keep exact route checks, failed-asset/console/page-error detection, auth boundaries, and frontend-only rollback unchanged.

### Changed files

- `docs/quality/changes/2026-10-05-production-watchdog-login-grace.md`
- `scripts/production-watchdog.mjs`

### Out of scope

- Retrying credentials or hiding an authentication failure.
- Changing Supabase, tenant, account, RLS, data, or rollback behavior.

## Acceptance criteria

- [x] The login form receives a bounded 30-second render window.
- [x] A persistent missing login form still fails the watchdog and remains eligible only under the existing frontend classification rules.
- [x] Existing smoke route, asset, console, and auth checks are unchanged.

## Risk and approval gates

- The longer wait delays failure by at most 15 seconds; it cannot turn a missing login form into a pass.
- The first live deployment remains the required authenticated smoke verification.

## Verification evidence

| Check               | Evidence                                                                                          | Result |
| ------------------- | ------------------------------------------------------------------------------------------------- | ------ |
| Static checks       | Prettier, ESLint, Node syntax check, and quality contract validation                              | PASS   |
| Regression boundary | Only the login selector timeout changed; watchdog classification and rollback logic are unchanged | PASS   |
| Critic review       | Fresh read-only review against the final follow-up diff                                           | PASS   |

## Critic review

- Verdict: `PASS`
- Unresolved blocking findings: `none`
- Repair iterations: `1`

## Release decision

- Automated gate: `PASS`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
