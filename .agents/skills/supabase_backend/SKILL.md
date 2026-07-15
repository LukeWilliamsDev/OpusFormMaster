---
name: supabase-backend
description: Supabase services integration, schema migrations, and real-time channels.
---

# Supabase Backend Agent Skill

## HARD RULES
- Row-Level Security (RLS) must be enabled on every table.
- Database triggers must be written in clean, optimized PL/pgSQL.
- Always take a database snapshot or run verification tests before deploying SQL migrations.
- Automatically regenerate TypeScript types after migrations and verify there are zero compilation errors.

## EXECUTION PROTOCOL
1. **Draft Migration**: Write clean SQL DDL statements under `supabase/migrations/` using timestamp prefixes.
2. **Setup RLS policies**: Write granular, role-based checks for SELECT, INSERT, UPDATE, DELETE actions.
3. **Write Triggers**: Ensure PL/pgSQL triggers handle audit logging or automated data synchronization.
4. **Regenerate Types**: Run the type generation utility to sync TypeScript interfaces.
