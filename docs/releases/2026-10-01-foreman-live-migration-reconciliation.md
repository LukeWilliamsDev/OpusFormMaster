# Foreman live migration reconciliation

The Foreman schema was applied directly to Supabase project
`fgpthpxmiroyebrzjdzo` after a read-only schema audit. The deployed project had
legacy `job_diary` and `job_attachments` tables without `tenant_id`, so the
compatibility migration ran first.

## Applied forward migrations

The Composio migration action recorded generated remote versions. The
canonical repository versions below were then recorded in
`supabase_migrations.schema_migrations` so future direct migration work does
not replay these changes.

| Repository migration                                     | Generated remote version |
| -------------------------------------------------------- | ------------------------ |
| `20260928085000_foreman_remote_tenant_compatibility.sql` | `20261001012930`         |
| `20260928090100_site_foreman_workspace_access.sql`       | `20261001012946`         |
| `20260929090000_foreman_job_note_conversations.sql`      | `20261001013015`         |
| `20260929100000_foreman_access_hardening.sql`            | `20261001013022`         |
| `20260929110000_foreman_release_security.sql`            | `20261001013031`         |
| `20260929120000_reconciled_foreman_schema.sql`           | `20261001013039`         |
| `20260929130000_management_certificate_access.sql`       | `20261001013045`         |
| `20260930100000_exclude_labourer_operational_data.sql`   | `20261001013054`         |

## Verification

- `job_issues` and `job_note_replies` exist remotely.
- Structured diary columns and tenant-scoped attachment/diary columns exist.
- Foreman, assigned-job, completed-site, and Labourer-boundary helpers exist.
- RLS is enabled on the Foreman tables.
- Realtime includes diary, issues, replies, and attachments.
- Existing remote attachment rows were tenant-backfilled with no orphan rows.
- No disposable remote QA users or tenant records remain.

## Migration safety rule

Do **not** run `supabase db push` from this branch until the older repository
history is reconciled. The project has historically applied migrations directly,
and the repository contains older divergent versions and timestamp collisions.
Use a dedicated reconciliation review for those historical rows; do not rewrite
or delete the live migration ledger as part of the Foreman feature.
