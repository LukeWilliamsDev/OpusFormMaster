-- Persists the jinn-gateway admin refresh token so it self-heals across
-- Supabase's refresh-token rotation instead of relying on a static secret.
-- Service-role only: RLS enabled, zero policies, no anon/authenticated access.
create table if not exists public.jinn_admin_session (
  id boolean primary key default true,
  refresh_token text not null,
  updated_at timestamptz not null default now(),
  constraint jinn_admin_session_singleton check (id)
);

alter table public.jinn_admin_session enable row level security;
