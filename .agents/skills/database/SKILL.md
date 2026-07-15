---
name: database
description: Supabase/PostgreSQL schema, migrations, RLS, triggers, types, and backend state.
---

# Database Skill

## HARD RULES
- ALWAYS call list_tables before proposing any ALTER or migration — never assume schema state.
- Money is stored as minor-unit integers (cents). No floats, no decimals.
- Lock booking/assignment/reservation reads with `SELECT ... FOR UPDATE` inside the transaction.
- RLS must be enabled on every table; operatives must never read other operatives' sensitive data.
- The 50ms serialization ref-lock in `src/context/PortalContext.tsx` must never be removed or shortened.
- Validate all geolocation inputs (lat/lng range, null guards) before Leaflet routing.

## PROTOCOL
1. Fetch current schema (list_tables).
2. Write migrations as timestamp-prefixed SQL files in `supabase/migrations/`; use transactional blocks for multi-row edits.
3. Write RLS policies per action (SELECT/INSERT/UPDATE/DELETE) and triggers in PL/pgSQL.
4. Include a rollback plan (exact SQL) for any destructive DDL; snapshot before production deploys.
5. Regenerate TypeScript types after every migration; verify zero type errors.
6. Flag RLS re-verification to the security skill after structural changes.
