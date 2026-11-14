# Opus Form change contract — migration ledger reconciliation

**Status:** READY_FOR_REVIEW
**Risk:** high
**Change category:** database | security | documentation | generated
**Accountable owner:** Opus Form director / named repository reviewer
**Source of truth:** Approved request to close the migration-history and QA-baseline gaps
**Evidence base:** `25119de841988f57d9890c80f2e89da16bd92660`
**Evidence head:** `HEAD`
**Evidence fingerprint:** `bda9adedc8ddb0b3fb00252b0a84ff2601708bae1d6d1810eb9302c053ac58f5`

## Intent

Make the applied Supabase migration history reproducible without replaying
historical production SQL, and make the persistent QA tenant an explicit,
repeatable acceptance baseline.

## Scope

### In scope

- Append-only repair of local migration versions already represented by the live schema.
- Empty local markers for remote deployment-time migration versions.
- Local replay and `db push --dry-run` verification.
- Documentation of the isolated QA tenant and cleanup contract.

### Out of scope

- Replaying historical SQL against production.
- Deleting or reverting applied remote migration ledger rows.
- Removing the intentionally retained QA tenant or its accounts.
- Changes to production application tables, users, or business data.

### Changed files

- `docs/qa/foreman-acceptance-baseline.md`
- `docs/quality/changes/2026-10-01-migration-ledger-reconciliation.md`
- `docs/releases/2026-10-01-migration-ledger-reconciliation.md`
- `supabase/migrations/20260711013443_20260710021629_784f0af4-6517-4737-8ceb-0a6ddc8a6415.sql`
- `supabase/migrations/20260711013453_20260710021650_93ae831a-0b95-4de7-9ed5-6ee4a284dbad.sql`
- `supabase/migrations/20260711013505_20260710025300_626bf684-1d74-4be1-8068-372fe528e9fa.sql`
- `supabase/migrations/20260711013515_20260710102228_ad8c4551-1cbd-4b7c-acd1-9bf847620ba7.sql`
- `supabase/migrations/20260711013526_20260711004404_6ce0dd02-6fdb-44db-823c-d2c9b3772b3c.sql`
- `supabase/migrations/20260711013537_20260711004632_2c343b30-1eb5-48a3-988a-0696f920f041.sql`
- `supabase/migrations/20260711024703_create_smtp_config_table.sql`
- `supabase/migrations/20260712130838_tighten_rls_policies.sql`
- `supabase/migrations/20260712135819_add_audit_logs.sql`
- `supabase/migrations/20260712142127_add_anonymous_audit_logger.sql`
- `supabase/migrations/20260713010129_restrict_audit_logs_to_admin_email.sql`
- `supabase/migrations/20260713010315_optimize_audit_log_policy.sql`
- `supabase/migrations/20260713134118_add_postcode_to_staff.sql`
- `supabase/migrations/20260715124609_20260715135000_add_multi_tenancy.sql`
- `supabase/migrations/20260719020958_secure_job_document_uploads.sql`
- `supabase/migrations/20260719021131_fix_submit_job_attachment_schema_mismatch.sql`
- `supabase/migrations/20260719022549_replace_app_role_enum_with_org_roles.sql`
- `supabase/migrations/20260719022557_rename_inbound_sales_rep_job_title.sql`
- `supabase/migrations/20260719023959_harden_job_tables_rls_and_function_search_paths.sql`
- `supabase/migrations/20260719212813_fix_log_anonymous_audit_tenant_id.sql`
- `supabase/migrations/20260720211141_fix_submit_worker_documents_tenant_id.sql`
- `supabase/migrations/20260720212349_restore_luke_williams_cscs_upload.sql`
- `supabase/migrations/20260720212941_enable_realtime_staff.sql`
- `supabase/migrations/20260721045329_audit_external_document_upload.sql`
- `supabase/migrations/20260721045350_job_attachment_size_limits.sql`
- `supabase/migrations/20260722012159_restore_multi_tenancy_function_and_policies.sql`
- `supabase/migrations/20260722012325_add_pours_table.sql`
- `supabase/migrations/20260801083118_open_audit_logs_to_tenant_admins.sql`
- `supabase/migrations/20260801083142_tighten_document_request_and_storage_policies_v2.sql`
- `supabase/migrations/20260801083543_drop_untracked_audit_logs_policy.sql`
- `supabase/migrations/20260801084016_restore_admin_email_full_audit_add_job_scoped_history.sql`
- `supabase/migrations/20260801091354_add_job_notes_table.sql`
- `supabase/migrations/20260801092342_add_job_notes_delete_policy.sql`
- `supabase/migrations/20260801103350_add_job_attachments_storage_delete_policy.sql`
- `supabase/migrations/20260802025034_fix_new_signup_tenant_assignment.sql`
- `supabase/migrations/20260803000821_add_calendar_events_table.sql`
- `supabase/migrations/20260805074523_add_policies_storage_select_policy.sql`
- `supabase/migrations/20260805162332_jinn_admin_session_add_token_cache.sql`
- `supabase/migrations/20260807041849_add_must_change_password.sql`
- `supabase/migrations/20260808044924_add_ticket_expiry_audit_cron.sql`
- `supabase/migrations/20260808055702_skip_noop_audit_updates.sql`
- `supabase/migrations/20260808055905_clear_audit_logs.sql`
- `supabase/migrations/20260808062334_add_profile_status.sql`
- `supabase/migrations/20260808084708_restore_admin_and_set_names.sql`
- `supabase/migrations/20260808091740_block_writes_for_inactive_profiles.sql`
- `supabase/migrations/20260808093244_grant_private_usage_to_auth_admin.sql`
- `supabase/migrations/20260808094124_admin_delete_user_rpc.sql`
- `supabase/migrations/20260808112145_add_invoices_final_bills.sql`
- `supabase/migrations/20260808112333_fix_invoices_final_bills_tenant_scoping.sql`
- `supabase/migrations/20260808234007_fix_process_audit_log_tenant_id.sql`
- `supabase/migrations/20260809011712_add_job_email.sql`
- `supabase/migrations/20260925015553_20260925010000_security_remediation.sql`
- `supabase/migrations/20260925015815_20260925020000_fix_storage_policy_outer_reference.sql`
- `supabase/migrations/20260925021903_fix_third_party_job_shift_rls_recursion.sql`
- `supabase/migrations/20260925064219_harden_third_party_write_permissions.sql`
- `supabase/migrations/20260926115457_20260926120000_reassert_function_execution_grants.sql`
- `supabase/migrations/20260928063654_allow_directors_view_profiles.sql`
- `supabase/migrations/20260930140949_20260930150000_restore_luke_platform_admin_role.sql`
- `supabase/migrations/20261001012930_20260928085000_foreman_remote_tenant_compatibility.sql`
- `supabase/migrations/20261001012946_20260928090100_site_foreman_workspace_access.sql`
- `supabase/migrations/20261001013015_20260929090000_foreman_job_note_conversations.sql`
- `supabase/migrations/20261001013022_20260929100000_foreman_access_hardening.sql`
- `supabase/migrations/20261001013031_20260929110000_foreman_release_security.sql`
- `supabase/migrations/20261001013039_20260929120000_reconciled_foreman_schema.sql`
- `supabase/migrations/20261001013045_20260929130000_management_certificate_access.sql`
- `supabase/migrations/20261001013054_20260930100000_exclude_labourer_operational_data.sql`

## Acceptance criteria

- [x] `AC-1`: Remote migration repair records all local applied versions without executing schema SQL — evidence: `supabase migration repair` output.
- [x] `AC-2`: Local marker migrations represent every remote-only ledger version — evidence: `supabase db push --dry-run` reports the remote database is up to date.
- [x] `AC-3`: A clean local database replays the complete reconciled chain — evidence: `npx supabase db reset --local` passed.
- [x] `AC-4`: The reconciled local schema passes Supabase lint — evidence: `npx supabase db lint --local` passed.
- [x] `AC-5`: The QA tenant is explicitly documented as isolated and repeatable without storing credentials in Git — evidence: `docs/qa/foreman-acceptance-baseline.md`.

## Risk and approval gates

- Migration repair changes only the remote history ledger; it must not execute or replay migration SQL.
- Empty marker migrations are valid only because the corresponding schema changes are already present in the live catalog under historical deployment versions.
- RLS and tenant isolation remain the boundary for the QA tenant; no cross-tenant access is granted.
- Rollback is ledger-specific: do not mark repaired versions reverted without a reviewed replacement plan.
- Human approval required: PENDING — repository reviewer should approve the migration reconciliation and QA baseline.

## Verification evidence

| Check          | Exact command or evidence                                           | Result                         |
| -------------- | ------------------------------------------------------------------- | ------------------------------ |
| Migration list | `npx supabase migration list --project-ref fgpthpxmiroyebrzjdzo`    | PASS; ledger mapping inspected |
| Remote dry run | `npx supabase db push --project-ref fgpthpxmiroyebrzjdzo --dry-run` | PASS; database up to date      |
| Local replay   | `npx supabase db reset --local`                                     | PASS                           |
| Schema lint    | `npx supabase db lint --local`                                      | PASS; no schema errors         |
| QA baseline    | Read-only tenant/policy audit                                       | PASS; one isolated QA tenant   |

## Critic review

- Critic context/identity: fresh read-only migration audit and independent schema/ledger comparison.
- Review input: remote `schema_migrations`, local migration tree, dry-run output, local replay output, and QA RLS policies.
- Verdict: `PASS`
- Findings: deployment-time migration versions were preserved with empty local markers; no production SQL replay was used.
- Unresolved blocking findings: `none`
- Repair iterations: `2`

## Release decision

- Automated gate: `PASS` locally; CI pending
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty or exception: historical ledger markers are intentionally empty and must not be replaced with reconstructed SQL without a separate schema-diff review.
