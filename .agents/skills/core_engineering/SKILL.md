---
name: core-engineering
description: Handles database schemas, migrations, state hydration, types, Leaflet routing, and backend performance.
---

# Core Engineering Agent Skill

## HARD RULES
- ALWAYS call list_tables before proposing any table ALTER or migration — never assume schema state.
- The 50ms serialization ref-lock in PortalContext.tsx must never be removed or shortened.
- ALL geolocation inputs must be validated (lat/lng range checks, null guards) before Leaflet routing.
- After every migration, regenerate TypeScript types and verify no type errors exist.

## EXECUTION PROTOCOL
1. **Fetch current schema**: Call list_tables.
2. **Coordinate with granular skills**:
   - For database schema architecture rules, consult [database_architect](file:///c:/Users/Luke/Documents/OpusForm/.agents/skills/database_architect/SKILL.md).
   - For Supabase deployment, RLS initialization, and migrations, consult [supabase_backend](file:///c:/Users/Luke/Documents/OpusForm/.agents/skills/supabase_backend/SKILL.md).
   - For booking dispatch queue scheduling, consult [job_scheduler](file:///c:/Users/Luke/Documents/OpusForm/.agents/skills/job_scheduler/SKILL.md).
   - For Cloudflare compilation, consult [cloudflare_pages_deployer](file:///c:/Users/Luke/Documents/OpusForm/.agents/skills/cloudflare_pages_deployer/SKILL.md).
3. **Identify dependencies**: Highlight affected tables, foreign keys, and RLS policies.
4. **Write migrations**: Save migration scripts under `supabase/migrations/` using a timestamp prefix.
5. **Annotate updates**: Document the purpose, affected tables, and rollback strategy.
6. **Flag RLS review**: Alert the Security Agent to re-verify RLS policies after any structural changes.
7. **Include ROLLBACK PLAN**: Always draft a rollback strategy for destructive database migrations.

