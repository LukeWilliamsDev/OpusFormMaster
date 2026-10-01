# Migration ledger reconciliation — 2026-10-01

## Decision

The remote Supabase project had two historical migration namespaces:
local source filenames and deployment-time versions recorded in
`supabase_migrations.schema_migrations`. The schema was already live and
verified; replaying either namespace against production was unsafe.

The ledger is now reconciled without replaying production SQL:

- 70 local migration versions were marked `applied` with `supabase migration repair`.
- 66 remote-only migration versions were represented locally as empty ledger-marker migrations.
- No production tables, functions, policies, storage objects, or data were changed by the repair.
- The remote ledger remains append-only; no applied migration was deleted or reverted.

## Evidence

- `npx supabase migration list --project-ref fgpthpxmiroyebrzjdzo`
- `npx supabase db push --project-ref fgpthpxmiroyebrzjdzo --dry-run`
  - Result: `Remote database is up to date.`
- `npx supabase db reset --local`
  - Result: completed successfully through the reconciled marker chain.
- `npx supabase db lint --local`
  - Result: no schema errors found.

## Operating rule

Future migrations can use the normal append-only workflow. Do not use
`supabase db push` against a different checkout until it contains the same
ledger-marker files and the dry run reports the remote database is up to date.
A migration marker is intentionally empty because its schema change already
exists in the live catalog under a historical deployment version.
