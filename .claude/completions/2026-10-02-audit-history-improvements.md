# Audit history improvements

## Delivered

- Reworked the global audit trail, job History tab, and staff dossier audit log around a shared event card.
- Every displayed event now exposes the action, target, actor, exact date/time, and expandable event details.
- UPDATE events render field-level before/after diffs, including metadata explaining corrective updates.
- Search now covers actor, action, target, target name, and serialized event details; the global trail also filters by record type.
- Added friendly labels for newer certificate, third-party, attachment, pour, Telegram, and user-management actions.
- Linked staff document-request history to its actual audit event where available instead of fabricating an admin actor/timestamp.
- Added actor and timestamp display to certificate-check and third-party document history.

## Revert behavior

- Added `revert_audit_log(uuid)` as a tenant-scoped SECURITY DEFINER RPC for admin/director accounts.
- Revert support is intentionally limited to safe staff profile fields and job/site fields; compliance snapshots, derived counters, attachments, and deletions are not replayed.
- The RPC locks the target row, refuses stale audit entries when newer changes exist, and writes the source audit ID onto the corrective trigger-generated event.
- Staff and job UI actions use the RPC rather than direct client updates, and the UI explains when an UPDATE is not safely reversible.
- Full audit-log navigation/read access is now aligned for all tenant admin/director accounts; policies remain restricted separately.
- Auth/security audit events now use the secured audit RPC so authenticated actor identity is taken from the session rather than a caller-supplied email.

## Validation

- `npm run typecheck` ✅
- `npm test` ✅ — 123 passed, 1 skipped
- `npm run build` ✅
- Targeted ESLint ✅ — warnings only, no errors
- Full `npm run lint` remains blocked by pre-existing Prettier errors in `supabase/functions/send-portal-help-request/index.ts`; no new lint errors were introduced in changed files.

## Deployment note

The two new Supabase migrations must be applied before the UI's revert control can work:

- `20261002060000_improve_audit_history_and_revert.sql`
- `20261002061000_allow_admin_director_audit_access.sql`

## UX refinement

- Replaced the dense bordered-card presentation with a shared compact event row across global, job, and staff audit views.
- Selecting an event now opens one focused right-side inspector with the full actor/time/record context, before-and-after diff, event payload, and revert action.
- The primary list scan is now just action, target, actor, and time; audit depth is available on demand without expanding the whole feed.
- Verified the running preview process is rooted at this worktree and rebuilt the application after the interaction change.

## Plain-English audit copy

- Replaced generic summaries such as “Record updated” with complete sentences that identify the action and named record.
- UPDATE entries now state each changed field and its before → after values in the list summary.
- Added explicit sentences for documents, notes, attachments, pours, certificates, quotes, users, authentication, Telegram, and third-party events.
- Unknown action codes now read as explicit system events instead of silently appearing as an unexplained generic label.

## Desktop space usage

- Widened the audit, roster, ledger, and job-detail content shells to use up to 2200px on large screens.
- Reduced desktop gutter/padding waste while retaining compact mobile spacing.

## Navigation integration

- Added the shared mobile navigation model from the navigation workstream for internal management and third-party roles.
- Internal mobile navigation now exposes Dashboard, Ledger, Schedule, Staff, and More; third-party navigation keeps Home, Staff, Sites, Help, and More.
- Route-active state correctly distinguishes roster tabs and nested staff/site routes.
- Field-only users now receive the standalone no-access view without an unusable management shell.
