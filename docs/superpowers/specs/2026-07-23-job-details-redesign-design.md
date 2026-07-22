# Job Details Mobile-First Redesign

## Problem

`JobDetails.tsx` is a 2122-line monolith mixing pour logs, weather, suppliers,
attachments, and audit history in one scroll. Field agents on mobile hit a wall
of content with no hierarchy. Redesign as: persistent context header + tabbed
workspace, split into focused components, meeting ADHD/dyslexia/astigmatism
accessibility needs.

## Non-goals

- No route/URL changes (tabs are local state, not `react-router-dom` routes).
- No push/email/SMS notification delivery for reminders — visual-only surfacing.
- No changes to shared UI primitives (buttons/cards) — scoped to JobDetails only.
- No changes to existing pours, attachments, or audit_logs tables/logic — only
  relocated into new components.

## Architecture

```
JobDetails.tsx                 — container: job fetch, shared state, renders header + tabs
  PersistentJobHeader.tsx      — pour schedule, weather warning, active staff (compact)
  JobDetailsTabs.tsx           — tab bar + active-tab switch (local useState)
    JobOverviewTab.tsx         — status/client/location/tags + OSMMap supplier view
    MediaTab.tsx                — attachment gallery, upload/camera capture, share-link
    FeedTab.tsx                 — job_notes feed + reminder flagging/upcoming strip
    HistoryTab.tsx               — existing AuditDiffTable, unchanged logic
```

State currently in `JobDetails.tsx` (pour logs, suppliers, weather, attachments,
audit) stays owned by the container and is passed down as props — no context
provider added, since all consumers are direct children. Each tab component
takes only the props it needs (no full `job` blob passthrough where a subset
suffices) so each is independently readable.

## Persistent header

`PersistentJobHeader` renders three compact rows (not cards stacked full-height):

1. Scheduled pour: date/time + status pill (existing pour log data, most recent
   upcoming entry).
2. Weather warning: existing weather warning component/logic from
   `useJobForecast`/`getWeatherOnDate`, condensed to a single-line banner that
   expands on tap for detail.
3. Active staff: existing staff-on-site widget, condensed to avatar stack +
   count, expands on tap.

Target: header consumes roughly 25-30% of a mobile viewport at rest, never the
full screen, so tabs are visible without scrolling on load.

## Tabs

Bar uses icon + label pairs (not icon-only) per dyslexia/quick-scan requirement.
4 tabs: Overview, Media, Feed, History. Active tab has a clear visual boundary
(underline + background tint, not color alone, for colorblind/contrast safety).

### Overview

Status, client, location, urgent tags in a scannable list (label left, value
right, generous line-height). `OSMMap` supplier-locator block retained as-is,
moved from current inline position.

### Media

- Grid gallery of image attachments (before/after photos) + flat list of
  document attachments, each with view/download actions.
- Existing camera-capture/file-upload flow (`compressImageFile`,
  `uploadAttachment`) relocated here unchanged.
- External upload link generator relocated here with a labeled "Copy Link"
  button (icon + text, copies to clipboard, shows a transient "Copied"
  confirmation state).
- Loading/uploading states: inline spinner + progress text on the specific
  tile being uploaded (existing `uploadingPhotoBefore/After/Doc` state),
  no full-page blocking spinner.

### Feed

- Time-stamped list of `job_notes` rows, newest first, grouped by day.
- Compose box: text input + optional "Remind me" toggle that reveals a
  date/time picker, writing `reminder_at`.
- "Upcoming reminders" strip pinned above the feed list showing notes with a
  future `reminder_at`, sorted soonest-first — no notification, just visible
  next time the tab is open.
- Realtime subscription on `job_notes` for the job, matching the pattern used
  for `pours`.

### History

`AuditDiffTable` moved here verbatim, no behavior change — kept out of the
default (Overview) tab so daily field use doesn't surface admin trail.

## Data model — `job_notes`

New table, mirrors `audit_logs` RLS/tenant convention:

```sql
create table public.job_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid references auth.users(id),
  user_email text,
  body text not null,
  reminder_at timestamptz,
  created_at timestamptz not null default now()
);
```

RLS: same tenant-scoped select/insert policy shape as `audit_logs`. Realtime
enabled via the same migration pattern as
`20260722061000_enable_realtime_quotes_audit_logs.sql`.

No update/delete policy — notes are append-only, consistent with audit_logs
being immutable.

## Accessibility execution

- Reuse existing `--foreground` (#edebe6 dark / #2b2f33 light) tokens — already
  off-white, no new tokens needed. Never use raw `text-white`/`text-black` in
  new components.
- Every icon in tab bar and action buttons pairs with a text label.
- Section boundaries use existing `card`/`border` tokens for distinct visual
  blocks, not just whitespace, so boundaries survive zoom/low-vision settings.
- Line-height: use existing `leading-relaxed` (or project's equivalent utility)
  in body/note text blocks for dyslexia readability.
- Tab switch and header expand/collapse are the only interactive state changes
  outside form fields — no auto-advancing carousels or timed transitions.

## Testing

- Vitest coverage for `job_notes` CRUD hook (insert note, insert with reminder,
  fetch ordering) mirroring existing pour-log test conventions if present.
- Manual pass (documented in completion doc) verifying: header height on a
  375px viewport, tab keyboard/focus order, upload progress states, copy-link
  clipboard behavior, dark-mode contrast on new text.
