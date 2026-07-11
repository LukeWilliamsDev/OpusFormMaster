# Project Memory: Opus Form

## Current State
- **Workflow Configurations**: Custom slash commands `/start` and `/end` are configured in `.agents/` to manage session initialization, git synchronization, and session history compilation.
- **System Design**: Specialized concrete construction subcontractor ERP managing jobs (pours, contracts), operatives (CSCS credentials), scheduling matrices, and estimating.
- **Database Architecture**: Switched from Lovable Cloud to standalone Supabase project ref `fgpthpxmiroyebrzjdzo`. Database schemas for profiles, workers, shifts, and jobs are live with RLS policies.
- **Source Control**: Repository configured to track the `Dev` branch on GitHub.

## Session History
### 2026-07-11
- Conducted architectural review and provided strategic recommendations for construction logistics.
- Established workspace-scoped agent guidelines for session starts and terminations.
- Installed local Git client, synchronized project with `Dev` branch, and removed legacy Dashboard component.
- Configured local environment variables and database config for the standalone Supabase setup.
- Applied DDL schema migrations, initialized 4 admin accounts (`roya`, `liam`, `anais`, `admin`), and verified RLS permissions.

## Roadmap
- Migrate estimate/quoting records from client `localStorage` to database tables.
- Integrate automated CIS/DRC tax calculation reports.
- Investigate Leaflet map proximity capabilities for scheduling optimization.
