# Opus Form change contract — production resilience watchdog

**Status:** READY_FOR_REVIEW
**Risk:** high
**Change category:** source
**Accountable owner:** Luke Williams / Opus Form
**Source of truth:** Prior Supabase/Cloudflare incidents and the requested small-business-safe self-healing brief

## Intent

Make production health observable and recoverable without pretending that a green HTTP response proves the application works. The watchdog must check the public site, generated assets, Supabase readiness, real authentication, and representative authenticated screens, then alert and safely roll back only a verified frontend release when recovery is unambiguous.

## Scope

### In scope

- Build-time rejection of missing, placeholder, or wrong-project Supabase configuration.
- Release metadata and a non-secret public health/readiness surface.
- Full emitted-asset integrity checks, including HTML references and MIME/content mismatches.
- Browser smoke coverage for login, session establishment, authenticated route access, and representative role-allowed screens using a dedicated read-only smoke account.
- Scheduled production monitoring and post-deploy verification in GitHub Actions.
- Bounded Cloudflare frontend rollback after a failed deployment or repeated post-deploy smoke failure, with concurrency and an explicit enablement gate.
- Evidence-rich alerts with commit, build, Worker version, failing check, and rollback result.

### Out of scope

- Automatic Supabase migrations, RLS/storage policy changes, schema repair, data repair, secret rotation, account changes, email sends, Telegram actions, or production writes.
- Claiming that an authenticated smoke account proves every tenant, role, record, or workflow is healthy.
- Replacing human incident response for persistent Supabase/auth/data-integrity failures.

### Changed files

- `.github/workflows/ci.yml`
- `.github/workflows/production-deploy.yml`
- `.github/workflows/production-watchdog.yml`
- `docs/operations/PRODUCTION_RESILIENCE.md`
- `docs/quality/changes/2026-10-05-production-resilience-watchdog.md`
- `package.json`
- `scripts/check-built-assets.mjs`
- `scripts/check-client-env.mjs`
- `scripts/production-watchdog.mjs`
- `scripts/select-worker-version.mjs`
- `scripts/validate-worker-target.mjs`
- `scripts/write-release-manifest.mjs`
- `src/lib/release-meta.ts`
- `src/server.ts`
- `wrangler.jsonc`

**Evidence base:** `origin/dev`
**Evidence head:** `00fe9a2`
**Evidence fingerprint:** `PENDING`

## Acceptance criteria

- [x] `AC-1`: A production liveness check distinguishes Worker/HTML availability from application readiness and returns a non-secret build identity.
- [x] `AC-2`: Readiness verifies the approved Supabase project without querying business rows or exposing credentials.
- [x] `AC-3`: Builds fail before deployment when Supabase configuration is missing, placeholder-like, or points outside the approved project allowlist.
- [x] `AC-4`: Asset validation detects missing referenced assets, HTML served for JS/CSS, placeholder configuration, and release-manifest drift.
- [x] `AC-5`: Browser smoke logs in with a dedicated least-privilege account, confirms session establishment, opens protected screens, and fails on auth redirects, error pages, failed assets, uncaught errors, or console errors.
- [x] `AC-6`: CI and post-deploy workflows build once, deploy the verified artifact, run public and authenticated smoke checks, and preserve the prior Worker version for rollback.
- [x] `AC-7`: Automatic repair is limited to one guarded frontend rollback; Supabase schema/RLS/data/secrets and all non-idempotent actions always escalate.
- [x] `AC-8`: Scheduled monitoring runs durably, uses concurrency protection, emits evidence-rich failure alerts, and cannot silently pass when smoke credentials or rollback configuration are missing.
- [x] `AC-9`: Unit/script tests, lint, formatting, typecheck, production build, asset checks, and an independent adversarial review pass, or exact exceptions are recorded.

## Risk and approval gates

- This is a high-risk operational change because it can trigger a production frontend rollback and handles a smoke-test credential in CI secrets.
- The smoke account must be dedicated, least-privilege, non-customer, and read-only; its credentials must never be stored in source, logs, or memory.
- Automatic rollback is disabled unless the repository environment explicitly enables it and identifies a known-good Worker version or an unambiguous previous deployment.
- Database, RLS, storage, secret, account, and data-integrity failures are alert-only and require named human action.

## Verification evidence

| Check                | Evidence                                                                                                                                                                    | Result         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Source/config review | Health/readiness, build guard, asset checker, browser smoke, workflow, and rollback diff                                                                                    | PASS           |
| Browser verification | Local Worker `/healthz`/`/readyz`, direct route redirect, fail-closed watchdog check, and provisioned isolated logistics-assistant account; first live authenticated smoke is the post-merge deployment gate | PENDING_LIVE |
| Automated checks     | 120 tests passed/1 skipped, typecheck, source lint (existing warnings only), Prettier, live-config build/budget, manifest/assets, Wrangler dry-run, and workflow YAML parse | PASS           |
| Adversarial review   | Fresh read-only critic task `task_19` against the final diff and failure boundaries                                                                                         | PASS           |

## Critic review

- Verdict: `PASS`
- Unresolved blocking findings: `none`
- Repair iterations: `15`

### Activation gate

The implementation is not active until the production GitHub environment has the documented smoke credentials, Cloudflare token, Supabase publishable key, alert webhook, and rollback variables, then the workflow is merged to the production branch. The watchdog intentionally fails closed without those credentials.

## Release decision

- Automated gate: `PASS`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
