# Third-Party Portal Release Evidence

Updated: 2026-09-26 UTC

## Result

The source hardening work and live Supabase policy migration are complete. The
portal is not approved for a public staging promotion because this repository
has no public staging route and the disposable staging Supabase target did not
respond to the read-only smoke query.

## Source and CI

- `npm run typecheck`: passed
- `npm test -- --run`: 120 passed, 1 skipped
- `npm run build:budget`: passed
  - application shell: 9.5 KiB gzip, budget 60 KiB
  - shared vendor entry: 164.3 KiB gzip, budget 190 KiB
- CI: https://github.com/LukeWilliamsDev/OpusFormMaster/actions/runs/36209404782
- Performance commit: `31f2c102d7643b00f619c87940520cff598426cb`

## Live production verification

- Supabase migration `harden_public_document_and_storage_workflows` applied
  as version `20260926012842` through the approved Composio connection.
- Public document RPCs return allowlisted fields.
- Credential submissions validate type, date, document path, tenant, and
  one-time use.
- Completed-site attachment deletion is blocked.
- Third-party storage reads and deletes are tenant-scoped.
- Live route checks passed for Home, Staff, Assigned Sites, Site Detail, and
  Staff New at mobile, tablet, desktop, and wide desktop sizes.
- Live keyboard checks passed for skip navigation, mobile-menu focus trapping,
  Escape restoration, invalid staff-record handling, and overflow.
- All HTML-referenced JavaScript assets returned `200 text/javascript`.

## Private staging smoke

Using the local Cloudflare Worker with Wrangler `4.141.0` on loopback:

- `/`, `/portal`, `/privacy`, `/cookies`, `/modern-slavery`, and
  `/right-to-work`: HTTP 200
- Security headers present: `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`
- No public staging hostname, DNS route, or tunnel was created.

## Remaining external gates

1. A two-tenant authenticated staging matrix still needs disposable staging
   identities; the available staging database timed out during the read-only
   smoke query.
2. No public staging deployment exists, so public staging rollback and external
   integration checks cannot be performed without an approved isolated origin.
3. Production deployment remains a separate go/no-go decision; no production
   deployment was initiated by this work.
