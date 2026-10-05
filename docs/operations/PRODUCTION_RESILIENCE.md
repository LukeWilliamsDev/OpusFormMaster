# Production resilience watchdog

The production watchdog is intentionally two-layered:

1. **Liveness and readiness** — checks the Worker, HTML shell, emitted JS/CSS assets, release manifest, and a bounded read-only Supabase Auth health request.
2. **Real browser smoke** — uses a dedicated least-privilege smoke account to sign in, confirm an authenticated portal route, and open representative screens without auth redirects, error pages, failed assets, uncaught exceptions, or console errors.

The scheduled workflow runs every ten minutes in UTC. The deploy workflow runs the same checks after every production deployment and captures the previous Worker version before changing traffic.

## Automatic repair boundary

The only automatic repair is a frontend rollback:

- a failed post-deploy smoke rolls back once to the Worker version captured immediately before that deploy;
- the scheduled watchdog can roll back only when `ENABLE_AUTO_ROLLBACK=true` and `KNOWN_GOOD_WORKER_VERSION` names an explicitly verified Worker version;
- rollback is attempted only for a classified frontend/release failure; Supabase readiness, authentication, missing smoke credentials, and data/dependency failures are alert-only;
- post-deploy health allows a bounded Cloudflare edge-propagation grace period before classifying the release as failed;
- the rollback is followed by the same watchdog checks.

The system never automatically changes Supabase schema, migrations, RLS/storage policies, data, secrets, user accounts, email/Telegram actions, or other non-idempotent operations. Those failures alert and remain human-owned. Deploy and watchdog recovery share one non-canceling production mutation lock so they cannot race.

## Required production environment configuration

Configure these in the GitHub **production environment**. Values must not be committed or copied into logs:

| Name                             | Kind     | Purpose                                                               |
| -------------------------------- | -------- | --------------------------------------------------------------------- |
| `SUPABASE_PUBLISHABLE_KEY`       | Secret   | Build the client against the approved Supabase project                |
| `CLOUDFLARE_API_TOKEN`           | Secret   | Deploy, inspect versions, and perform guarded frontend rollback       |
| `PRODUCTION_SMOKE_EMAIL`         | Secret   | Dedicated non-customer smoke account email                            |
| `PRODUCTION_SMOKE_PASSWORD`      | Secret   | Dedicated smoke account password                                      |
| `PRODUCTION_SMOKE_ACCOUNTS_JSON` | Secret   | Optional role matrix with per-account routes and credentials          |
| `OPS_ALERT_WEBHOOK_URL`          | Secret   | Optional owner alert destination; GitHub failure remains the fallback |
| `ENABLE_AUTO_ROLLBACK`           | Variable | Set `true` only after the known-good version is verified              |
| `KNOWN_GOOD_WORKER_VERSION`      | Variable | Exact Cloudflare Worker version ID approved for rollback              |

The smoke account must be read-only, isolated from customer data, and excluded from business notifications. If the smoke credentials are absent, the watchdog fails closed instead of claiming that login works.

## Operator procedure

1. Confirm the smoke account can sign in and see its assigned role-allowed screens.
2. Run `production-watchdog.yml` with **Run workflow**.
3. Confirm `/healthz`, `/readyz`, the public shell, and the authenticated smoke all pass.
4. Record the resulting Worker version as `KNOWN_GOOD_WORKER_VERSION`.
5. Set `ENABLE_AUTO_ROLLBACK=true` only after step 4.
6. For any Supabase readiness/auth/RLS/data failure, leave rollback disabled and investigate the dependency or migration with human approval.
