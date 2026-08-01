-- Found live on prod but absent from migration history: a second SELECT
-- policy on audit_logs, role-only with no tenant_id scoping. Postgres RLS
-- ORs all applicable policies together, so this silently bypassed the
-- tenant scoping added in 20260801120000_open_audit_logs_to_tenant_admins.sql
-- -- any admin in any tenant could still read every tenant's audit logs.
DROP POLICY IF EXISTS "Allow read to all admin users" ON public.audit_logs;
