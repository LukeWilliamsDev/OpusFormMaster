# docs/RECAP.md

## 2026-07-12
- Documented competitor accreditations.
- Relocated codebase to `opus-form-builder/`.
- Consolidated artifacts to `assets/`.
- Created `/commit` skill and token quota rules.
- Secured SMTP credentials in Supabase Vault.
- Unlocked quote template capitalization.
- Updated email copy and subject lines.
- Migrated quotes to `public.quotes`.
- Added Quote control drawer and simplified tables.
- Configured CF Pages and local dev scripts.
- Updated Supabase `.env` credentials.
- Regenerated lockfile; added `lru-cache`.
- Corrected SMTP port to 587.
- Fixed auth race condition.
- Added email existence pre-verification.
- Removed demo seeding UI.
- Upgraded Staff UI (13 roles, A-Z sort, advanced search).
- Renamed `workers` schema to `staff`.
- Added archive/purge confirmation modals.
- Configured security headers (CSP, MIME).
- Tightened staff RLS SELECT policies.
- Enforced password strength validation.
- Enabled `public.audit_logs` and auth tracking.
- Built Audit UI (pagination, filters, drawer).
- Fixed state-sync auto-save loop.

## 2026-07-13
- Moved memory/docs to `docs/`.
- Removed Lovable and 3D orchestrator dependencies (-138MB).
- Built generic error reporting.
- Created `task.md` dashboard.
- Restricted Audit UI strictly to primary admin.
- Renamed "Terminate Session" to "Logout".
- Added staff roster grid/list layouts.
- Optimized staff dossier drawer (sticky header, vertical flow).
- Built passwordless compliance document portal.
- Automated compliance emails via edge function.
- Secured private storage via 60s signed URLs.
- Configured 4 subagents and 9 task skills.
- Implemented map proximity scheduling (Haversine distance).
- Added postcode editor to staff profile.
- Synced Supabase TypeScript types.
- Hardened storage RLS and edge function security.

## 2026-07-14
- Restored staff dossier edit fields.
- Integrated compliance tickets module (CSCS, expiry).
- Passed all TS/Vitest checks.
- Clamped compliance links strictly to 48-hour expiry.
- Removed redundant document UI from dossier.
- Expanded drawer width to `max-w-2xl`.
- Consolidated name/role into drawer headers.
- Scaled typography for legibility.
- Removed `/start`, Manifesto, and Changelog.
- Added token estimation tracking to agent header.
- Deleted redundant update_memory skill directory to prevent duplicates.
- Persisted staff dossier edit updates to Supabase table to trigger database audit logs.
- Created auditDiff utility filtering internal metadata.
- Built reusable AuditDiffTable highlighting changes.
- Integrated diff tables into staff dossier audit log tab.
- Integrated diff tables into System Audit Trail detailed drawer.
- Logged INSPECT events on staff dossier accesses.
- Added friendly Event Type column to System Audit Trail table.

## 2026-07-15
- Scaffolded 5 Claude Code subagents in `.claude/agents/`: lead-developer, database-engineer, ui-ux-engineer, security-auditor, qa-automation.
- Wired all 16 skills across agents (job_scheduler → database-engineer; finance_validator + resend_mailer → ui-ux-engineer; commit + cloudflare_pages_deployer → qa-automation; core_engineering + data_reporting + end → lead-developer).
- Added Cowork persona switching table to `AGENTS.md`.
- Resolved 8 critical bugs in Roster and Audit Log interfaces (dynamic session email fetching, optimistic update verification, custom UPDATE label fallback, target_id optional chaining, drawer title mapping, user field diff tracking, empty-diff summary text preservation, and diff calculations memoization).
- Removed grid view option from staff roster (for both active and archived staff lists), making the list view the exclusive layout.
- Removed layout toggle buttons and cleaned up `layoutMode` state in RosterView component.
- Removed "Copy Dossier Link" and "Refresh Data" buttons from the staff roster details view (under the assignments tab).
- Standardized portal colors and typography matching the redesign specs (background `#111114`, cards `#1a1a1e`, borders `#2a2a30`, accent `#6C8295`).
- Redesigned PortalLayout with fixed desktop sidebar, mobile drawer, and bottom navigation bar supporting touch targets ≥44px.
- Built command search bar, metric cards, and compliance alerts panel on Dashboard.
- Fixed Dashboard crash by importing motion and AnimatePresence from `motion/react`.
- Redesigned Job Ledger to show site warnings, progress, values, and status pills, and converted Job Details to full-page mode.
- Upgraded style tokens, theme colors, and minimum font size constraints across CalendarMatrix, RosterView, PipelineRegistry, and QuoteInvoiceBuilder components.
- Adjusted padding alignments on Pipeline and Labor Roster pages.
- Removed mobile bottom navigation bar from PortalLayout and adjusted page container paddings (from `pb-20` to `py-6`) across Dashboard, Job Ledger, Labor Roster, and Pipeline pages.
- Removed `/commands` dropdown menu suggestions, input placeholder reference, and command submission logic from the Dashboard search bar.
- Implemented portal UI redesign across layout components (PortalLayout sidebar and headers theme updates, PortalAuth centered card login refresh, PipelineRegistry searchable grid layout with specific tag styles, QuoteInvoiceBuilder split items/summary configuration, JobDetails full page selectors, and AuditLog event timeline view).
- Cleaned up the root directory by deleting the `.claude` folder and all associated Claude subagent/skill files.
- Configured the `.vscode/tasks.json` file with an "Open Live Preview" task to automatically launch the dev server and open the site in VS Code's Simple Browser.
- Created `dev-server` agent skill in `.agents/skills/dev_server/SKILL.md` to automate server startup and UI preview guidance.
- Added a "Verification & Live Preview Guidelines" section to `.agents/AGENTS.md` instructing workspace agents to proactively suggest previewing UI changes.
- Configured the VS Code "Open Live Preview" task to automatically run on folder open (`runOn: folderOpen`) and updated the destination target to port 8080.
- Redesigned the Job Ledger Details view to match the provided layout mockup (simplified details to a single full-width column, removing OSMMap and SiteAllocationGatekeeper).
- Implemented side-by-side card layouts for Project Status (with flat tabs) and Pour Progress (with orange percentage and progress bar).
- Configured the Rain weather warning alert banner with custom styles and copy.
- Redesigned the Pour History section to list newest entries first, presenting concrete mix details, volumes, and custom formatted dates.
- Established local server execution restrictions in `.agents/AGENTS.md` to prevent future agents from running automated dev servers.
- Restyled staff dossier view header and compliance card items to match Dark Industrial mockup specs across all device screens.
- Scaled down staff dossier layout sizing (profile avatar, name title, contact lists, and compliance cards) to make it compact.
- Streamlined Site Assignments list layout and Audit Logs timeline view to match the compact Roster styling.
- Aligned dossier header action buttons ("Edit" and "Request Docs") to share identical border, padding, and height dimensions.

## 2026-07-15
- Codified mandatory implementation plan + user approval rule in `.agents/AGENTS.md`.
- Enforced manual-verification-only rule; removed automated localhost/browser preview triggers from `.agents/AGENTS.md`.
- Color-coded audit log status badges (green=completed, red=expired, yellow=pending).
- Filtered duplicate `UPDATE` audit events with empty diffs and raw `CREATE_DOCUMENT_REQUEST` system logs.
- Unified audit log card styling (`bg-[#151518]/40 border border-[#222]`) across all event types.
- Renamed audit log labels: "Staff Profile Change", "Document Request Sent", "Document Request Link Resent".
- Auto-expires all other pending document request links when a new request is created or an existing one is resent (`RequestCredentialsModal.tsx`, `RosterView.tsx`).
- Calculates effective resend timestamp (`expires_at - 48h`) to correctly order and date resent document request cards.
- Replaced native `window.confirm`/`alert` dialogs with on-screen Revert Changes confirmation modal (styled to match archive/delete modals).
- Revert modal highlights differing fields amber with current value struck-through and restored value shown alongside.

## 2026-07-15 13:19
- Removed leftover old layout remnants from QuoteInvoiceBuilder component to fix adjacent JSX elements parse error.
- Redesigned Dashboard compliance warnings block to use compact table-style rows with coloured left-border severity indicators.
- Removed snooze warnings button; updated reminder flow to open inline confirmation modal before execution.
- Added send-admin-alert Supabase edge function to send notification emails to admin@opusform.co.uk upon reminder delivery failure.
- Wired Dashboard Remind action to invoke send-compliance-email edge function, inserting document_requests tokens and generating secure upload links.
- Replaced portal header "O" box icon with actual `opus-form-primary.svg` wordmark across desktop sidebar, mobile header, and mobile drawer; removed "ERP PORTAL" caption; enlarged wordmark sizing.
- Aligned Quote Control Center drawer styling (cards, status badges, table header, reference accent) to match Quote Management list palette.
- Fixed delete/convert confirmation modals rendering behind the closing drawer (raised modal z-index above drawer).
- Renamed delete modal to "Delete Quote" and convert modal to "Job Creation" / "Accept Job", replacing leftover pipeline/estimate jargon.
- Rebuilt Quote Management as responsive: table on desktop (`lg`+), stacked card list on tablet/mobile; header search bar stacks on narrow screens.
- Removed redundant Edit/Convert shortcut buttons from Quote Management list (desktop Actions column and mobile card row); row/card click now solely opens the drawer for Edit/Convert/Delete.

## 2026-07-15 13:30
- Diagnosis of missing host Node.js/npm dependencies blocking local server and GitHub MCP server execution.
- Migration of GitHub MCP configuration from Docker to local npx runner in global mcp_config.json.

## 2026-07-15 23:53
- Removal of redundant dummy navigation menu icon from staff roster sub-header.
- Refactoring of staff roster sub-header actions into search bar inline responsive button (icon-only on mobile, full text on desktop/tablet).
- Simplification of staff audit log cards into timeline dot and text list with interactive inline expand/collapse details.
- Integration of edit profile form, compliance tickets, and deployment history views with rounded-xl borders, bold/semibold font weights, and scaled typography.

## 2026-07-15 23:58
- Applied Supabase migration `20260716090000_drop_assigned_workers.sql` dropping `jobs.assigned_workers` and `shifts.is_removed` columns.
- Recorded migration `20260716090000` in the `supabase_migrations.schema_migrations` table.
- Verified schema updates via Supabase MCP tool ensuring legacy columns are dropped.

## 2026-07-16
- Added week-grid (5-day-column) desktop/tablet layout to the Labor Roster scheduling calendar (`WeekGridStaff`, `WeekGridProject`); mobile keeps the single-day tab view unchanged.
- Removed the `max-w-3xl` width cap on `CalendarBoard` at `md`+ so it fills the page's full container width on tablet/desktop.
- Extracted `computeDaySchedule` from `useDaySchedule` and added `useWeekSchedule` to derive all 5 weekdays' schedules at once.
- Added a `size="dense"` variant to `StaffCard` for narrow week-grid columns.
- Extended `AssignTarget`/`AssignSheet` to carry a per-click date so assigning staff from any week-grid column opens the sheet for the correct day.
- Updated `.agents/AGENTS.md` ui-ux-engineer and qa-automation persona descriptions to reflect the shipped week-grid design and clarify drag-and-drop is not yet implemented.

## 2026-07-16 (Session Upgrade)
- Created public.job_attachments, public.job_diary, and public.job_document_requests database tables on Supabase.
- Provisioned job-attachments storage bucket with RLS policies allowing authenticated uploads and anonymous uploads via link.
- Integrated live weather fetching via OpenWeatherMap using API key 39b85af056be30c05f01ac45aa9249e1.
- Integrated OpenStreetMap geocoding and Leaflet map displaying nearby suppliers sorted by distance.
- Implemented daily Site Diary notes and Health & Safety checklist form, enforcing complete safety sign-off before pours can be logged.
- Added before/after site media upload galleries and document upload sections.
- Created public upload page at route /job-upload/:token for secure external document requests.
- Integrated a premium Slate & Alabaster Light theme toggle and overhauled PortalLayout to use theme variables.
- Upgraded the operational Dashboard widgets with time-based filters, inline actions, and custom SVG progress gauges.
- Enhanced Week-Grid scheduling with role filtering and postcode proximity sorting in AssignSheet.
- Overhauled ActiveJobLedger layout style classes to use theme CSS variables dynamically.
- Fixed worker compliance validation checks to utilize case-insensitive substring matching for roles (e.g. Telehandler Operator, Pour Supervisor).
- Added defensive rate string sanitization (removing currency symbols and commas) to prevent NaN calculation failures in QuoteInvoiceBuilder.
- Overhauled WeekGridProject layout style classes to use theme CSS variables dynamically.
- Overhauled WeekGridStaff layout style classes to use theme CSS variables dynamically.

## 2026-07-16 (Compliance & Personalisation)
- Created UK GDPR compliance pages (PrivacyNotice, TermsOfService, AcceptableUsePolicy, CookieStatement) using LegalPageLayout.
- Personalized documents and footer with official Companies House data for Opus Form Ltd (Company No. 17228356).
- Gated internal policy pages (/portal/terms and /portal/acceptable-use) behind authentication.
- Configured /portal/privacy and /portal/cookies routes to render nested inside the PortalLayout (sidebar) when logged in.
- Aligned landing page background color (#111114) with portal auth screen for design consistency.
- Hardened security headers (HSTS, CSP directives) in public/_headers.
- Configured Dependabot and PATCH_LOG.md for Cyber Essentials patch management.
- Shipped ISO 9001 quality management procedures under docs/QMS/.
