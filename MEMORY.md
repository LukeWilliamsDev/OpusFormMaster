# Project Memory: Opus Form

## Current State
- **Workflow Configurations**: Custom slash commands `/start` and `/end` are configured in `.agents/` to manage session initialization, git synchronization, and session history compilation.
- **System Design**: Specialized concrete construction subcontractor ERP managing jobs (pours, contracts), operatives (CSCS credentials), scheduling matrices, and estimating.
- **Database Architecture**: Switched from Lovable Cloud to standalone Supabase project ref `fgpthpxmiroyebrzjdzo`. Database schemas for profiles, workers, shifts, and jobs are live with RLS policies.
- **Email Delivery System**: Quote builder outputs PDF quotes and sends them as attachments via a Supabase Edge Function using the Resend HTTP API. Secure configuration credentials (`smtp_config` table) are fetched dynamically.
- **Source Control**: Repository configured to track the `Dev` branch on GitHub.

## Session History
### 2026-07-11
- Conducted architectural review and provided strategic recommendations for construction logistics.
- Established workspace-scoped agent guidelines for session starts and terminations.
- Installed local Git client, synchronized project with `Dev` branch, and removed legacy Dashboard component.
- Configured local environment variables and database config for the standalone Supabase setup.
- Applied DDL schema migrations, initialized 4 admin accounts (`roya`, `liam`, `anais`, `admin`), and verified RLS permissions.
- Integrated `html2pdf.js` for client-side PDF quote compilation.
- Resolved `html2canvas` parser crash caused by `oklch()` Tailwind variables via programmatic target node cloning and synchronous CSS sanitization.
- Fixed PDF layout offsets and multi-page overflow margins.
- Migrated mail service from SMTP/Nodemailer to the Resend HTTP API to bypass provider-level anti-bot throttling.
- Refined Quote Builder with stepper animations, concrete autocomplete suggestions, and a centered, dark workspace layout.
- Removed redundant bottom bar buttons and implemented strict on-page validation overlays for client, project, line item, and terms checklist errors.
- Resolved PDF layout overflows and margins by resetting body spacing on document clones and locking canvas/jsPDF format bounds to exactly 794x1122px.
- Converted email HTML template assembly to standard string concatenation to completely fix escaped variable parsing bugs.
- Built a public GET endpoint in the Edge Function to serve the SVG logo, deployed with JWT verification disabled.
- Implemented inline `-webkit-text-fill-color` styles on email HTML text nodes to override iOS WebKit dark mode text inversion.
- Integrated a Title Case capitalizing formatter for Client and Project names on the PDF, removing force-caps formatting.
- Replaced native alerts with custom animated on-screen status toast modals.


## Roadmap
- Migrate estimate/quoting records from client `localStorage` to database tables.
- Integrate automated CIS/DRC tax calculation reports.
- Investigate Leaflet map proximity capabilities for scheduling optimization.
