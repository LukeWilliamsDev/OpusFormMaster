# Job Details Mobile-First Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 2122-line `JobDetails.tsx` into a persistent context header + 4-tab workspace (Overview, Media, Feed, History), add a new `job_notes` feature for timestamped notes/reminders, and apply accessibility-first styling — without changing any existing data logic for pours, attachments, weather, suppliers, or audit logs.

**Architecture:** `JobDetails.tsx` stays the container owning all existing state/effects/handlers (pours, attachments, weather, suppliers, audit) and passes them as props into 5 new presentational-first components under `src/opus/components/`: `PersistentJobHeader.tsx`, `JobOverviewTab.tsx`, `MediaTab.tsx`, `HistoryTab.tsx` (all relocated JSX, no logic changes), and `FeedTab.tsx` (new, self-contained — owns its own `job_notes` fetch/insert/realtime, only needs `job.id`). Tab switching uses the existing `Tabs`/`TabsList`/`TabsContent` primitives from `@/components/ui/tabs` already imported in the file (`JobDetails.tsx:33`) — no new tab component needed.

**Tech Stack:** React 19 + TypeScript, Supabase (Postgres/RLS/Realtime), TailwindCSS, existing `@/components/ui/tabs`, `sonner` toast, `lucide-react` icons.

## Global Constraints

- No route/URL changes — tabs are `Tabs` component local state (`defaultValue`), not `react-router-dom` routes.
- No push/email/SMS delivery for reminders — visual-only surfacing (`reminder_at` shown in an "Upcoming" strip).
- No changes to shared UI primitives (button/card/tabs) — style only within the new job-details components.
- No behavior changes to existing pours, attachments, weather, suppliers, or audit_logs logic — those functions/state move location (into `JobDetails.tsx` prop passthrough) but their bodies are copied verbatim.
- New text must use `text-foreground` / `text-muted-foreground` tokens (`--foreground: #edebe6` dark / `#2b2f33` light already off-white-correct) — never raw `text-white`/`text-black`.
- Every icon button in new components pairs with a visible text label (dyslexia/quick-scan requirement).
- `job_notes` new table follows the exact RLS/tenant pattern of `public.pours` (`supabase/migrations/20260722120000_add_pours_table.sql`): `private.current_tenant_id()`, `private.can_write_ops(auth.uid())`, `job_id text references public.jobs(id) on delete cascade`, realtime added via `ALTER PUBLICATION supabase_realtime ADD TABLE`.

---

## Existing code reference (do not re-derive — copy from here)

`src/opus/components/JobDetails.tsx` current structure (line numbers as of this plan):

- Imports: lines 1-46
- `PourLog` interface: lines 74-82
- `JobDetailsProps` interface: lines 84-93
- Component signature: lines 95-104
- State: lines 105-162 (grouped) + scattered (`isConfirmingJobSave` 244, `pendingStatus` 604, `pourToggleTarget` 647, `pourToRemove` 684, `pourNoteTarget`/`editNoteText` 710-711)
- Helpers: `fetchJobAuditLogs` 164, `logPourAudit` 185, `executeRevertJobUpdate` 226, `handleSaveJobEdit` 257, `rowToPourLog` 306, `fetchPourLogs` 316, `calculateDistance` 347, `geocodeAndFetchWeatherAndSuppliers` 361, `logAttachmentAudit` 416, `fetchAttachments` 430, `uploadAttachment` 454, `executeViewDocument` 513, `executeDeleteAttachment` 523, `executeRenameAttachment` 545, `generateUploadLink` 568, `copyToClipboard` 595, `formatPourDate` 722
- Derived values: `pourPercent`/`beforePhotos`/`afterPhotos`/`projectDocs` 750-753, `groupedStaff` 756-762
- Weather JSX: lines 931-968
- Staff-on-site JSX: lines 1199-1245
- Pour list JSX: lines 1113-1197 (+ related confirm dialogs 1248-1323)
- Suppliers/map `TabsContent`: lines 1349-1471
- Attachments/upload `TabsContent` ("overview" tab, misnamed — photos+docs): lines 1473-1738
- Upload-link generator: function 568-600, JSX trigger 1632-1644, JSX alert 1647-1670
- Audit log `TabsContent`: lines 1740-1903 (inline, uses `computeDiff` from `../utils/auditDiff`, constants `JOB_REVERTIBLE_FIELDS`/`JOB_FIELD_LABELS` lines 50-63)
- Photo gallery `Dialog`: lines 1940-2013; rename `Dialog`: 2016-2050
- Other `ConfirmDialog`s (edit job, save confirm, status change, view doc, delete attachment): scattered, stay in container

Note: line numbers will drift as tasks land. Each task below re-locates by content match (search the quoted code), not by number, and confirms with `npm run build` after each move.

---

### Task 1: `job_notes` database migration

**Files:**

- Create: `supabase/migrations/20260723120000_add_job_notes_table.sql`

**Interfaces:**

- Produces: table `public.job_notes(id uuid, job_id text, tenant_id uuid, user_id uuid, user_email text, body text, reminder_at timestamptz nullable, created_at timestamptz)`, realtime-enabled, RLS-scoped like `pours`.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260723120000_add_job_notes_table.sql
CREATE TABLE public.job_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid,
  user_email text,
  body text NOT NULL,
  reminder_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid NOT NULL DEFAULT private.current_tenant_id()
);

CREATE INDEX job_notes_job_id_idx ON public.job_notes(job_id);

ALTER TABLE public.job_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_notes_select_ops ON public.job_notes FOR SELECT TO authenticated
  USING (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());
CREATE POLICY job_notes_insert_ops ON public.job_notes FOR INSERT TO authenticated
  WITH CHECK (private.can_write_ops(auth.uid()) AND tenant_id = private.current_tenant_id());

ALTER PUBLICATION supabase_realtime ADD TABLE public.job_notes;
```

No UPDATE/DELETE policy — notes are append-only, consistent with `audit_logs` being immutable.

- [ ] **Step 2: Apply locally and verify**

Run: `npx supabase db reset` (or the project's standard local-migration-apply command — check `package.json` scripts first; use whichever the repo already uses for `pours`/other recent migrations)
Expected: migration applies with no errors, `job_notes` table visible in local Postgres.

- [ ] **Step 3: Regenerate Supabase types**

Run: `npx supabase gen types typescript --local > src/integrations/supabase/types.ts` (match whatever command previous migrations used — check `docs/QMS/CHANGE_MANAGEMENT.md` or `package.json` for the exact script name if one exists)
Expected: `src/integrations/supabase/types.ts` gains a `job_notes` entry under `Tables`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260723120000_add_job_notes_table.sql src/integrations/supabase/types.ts
git commit -m "feat: add job_notes table for job feed and reminders"
```

---

### Task 2: `FeedTab.tsx` — new self-contained feed/notes/reminders component

**Files:**

- Create: `src/opus/components/FeedTab.tsx`
- Test: `src/opus/components/__tests__/FeedTab.test.tsx` (check `src/opus/**/__tests__` or co-located `*.test.tsx` convention first — grep for an existing test file next to a component of similar size before picking the path)

**Interfaces:**

- Consumes: `jobId: string` prop only. Internally calls `supabase.from("job_notes")`, `supabase.auth.getUser()`, `supabase.channel(...)`.
- Produces: default-exportless named export `FeedTab: React.FC<{ jobId: string }>`, for `JobDetails.tsx` to render as `<FeedTab jobId={job.id} />`.

- [ ] **Step 1: Write the failing test for the ordering/grouping helper**

```tsx
// src/opus/components/__tests__/FeedTab.test.tsx
import { describe, it, expect } from "vitest";
import { groupNotesByDay, sortUpcomingReminders } from "../FeedTab";

describe("groupNotesByDay", () => {
  it("groups notes under their created_at calendar day, newest day first", () => {
    const notes = [
      {
        id: "1",
        created_at: "2026-07-20T09:00:00Z",
        body: "a",
        reminder_at: null,
        user_email: "x@y.com",
      },
      {
        id: "2",
        created_at: "2026-07-21T09:00:00Z",
        body: "b",
        reminder_at: null,
        user_email: "x@y.com",
      },
      {
        id: "3",
        created_at: "2026-07-21T15:00:00Z",
        body: "c",
        reminder_at: null,
        user_email: "x@y.com",
      },
    ];
    const grouped = groupNotesByDay(notes);
    expect(grouped.map((g) => g.day)).toEqual(["2026-07-21", "2026-07-20"]);
    expect(grouped[0].notes.map((n) => n.id)).toEqual(["3", "2"]);
  });
});

describe("sortUpcomingReminders", () => {
  it("returns only future reminder_at notes, soonest first", () => {
    const notes = [
      {
        id: "1",
        created_at: "2026-07-20T09:00:00Z",
        body: "a",
        reminder_at: "2026-08-01T09:00:00Z",
        user_email: "x@y.com",
      },
      {
        id: "2",
        created_at: "2026-07-20T09:00:00Z",
        body: "b",
        reminder_at: null,
        user_email: "x@y.com",
      },
      {
        id: "3",
        created_at: "2026-07-20T09:00:00Z",
        body: "c",
        reminder_at: "2026-07-25T09:00:00Z",
        user_email: "x@y.com",
      },
    ];
    const upcoming = sortUpcomingReminders(notes, new Date("2026-07-23T00:00:00Z"));
    expect(upcoming.map((n) => n.id)).toEqual(["3", "1"]);
  });

  it("excludes reminders in the past", () => {
    const notes = [
      {
        id: "1",
        created_at: "2026-07-20T09:00:00Z",
        body: "a",
        reminder_at: "2026-07-01T09:00:00Z",
        user_email: "x@y.com",
      },
    ];
    expect(sortUpcomingReminders(notes, new Date("2026-07-23T00:00:00Z"))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/opus/components/__tests__/FeedTab.test.tsx`
Expected: FAIL — `FeedTab` module / `groupNotesByDay` / `sortUpcomingReminders` not defined.

- [ ] **Step 3: Write `FeedTab.tsx`**

```tsx
// src/opus/components/FeedTab.tsx
import React, { useEffect, useState } from "react";
import { Bell, Send, Loader } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";

interface JobNote {
  id: string;
  created_at: string;
  body: string;
  reminder_at: string | null;
  user_email: string | null;
}

export function groupNotesByDay(notes: JobNote[]): { day: string; notes: JobNote[] }[] {
  const byDay = new Map<string, JobNote[]>();
  for (const note of notes) {
    const day = note.created_at.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(note);
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([day, dayNotes]) => ({
      day,
      notes: [...dayNotes].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    }));
}

export function sortUpcomingReminders(notes: JobNote[], now: Date): JobNote[] {
  return notes
    .filter((n) => n.reminder_at && new Date(n.reminder_at).getTime() > now.getTime())
    .sort((a, b) => new Date(a.reminder_at!).getTime() - new Date(b.reminder_at!).getTime());
}

function formatDayHeading(day: string): string {
  const d = new Date(`${day}T00:00:00`);
  if (isNaN(d.getTime())) return day;
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

function formatReminderTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "TBC";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const FeedTab: React.FC<{ jobId: string }> = ({ jobId }) => {
  const [notes, setNotes] = useState<JobNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [wantsReminder, setWantsReminder] = useState(false);
  const [reminderAt, setReminderAt] = useState("");
  const [posting, setPosting] = useState(false);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from("job_notes")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load job notes", error);
      setLoading(false);
      return;
    }
    setNotes(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();
    const channel = supabase
      .channel(`job-notes-${jobId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_notes", filter: `job_id=eq.${jobId}` },
        fetchNotes,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const handlePost = async () => {
    if (!body.trim()) return;
    setPosting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("job_notes").insert({
        job_id: jobId,
        user_id: user?.id ?? null,
        user_email: user?.email ?? "admin@opusform.co.uk",
        body: body.trim(),
        reminder_at: wantsReminder && reminderAt ? new Date(reminderAt).toISOString() : null,
      });
      if (error) throw error;
      setBody("");
      setWantsReminder(false);
      setReminderAt("");
      await fetchNotes();
      toast.success("Note added");
    } catch (err) {
      console.error("Error posting job note:", err);
      toast.error("Failed to add note");
    } finally {
      setPosting(false);
    }
  };

  const upcoming = sortUpcomingReminders(notes, new Date());
  const grouped = groupNotesByDay(notes);

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <label
          htmlFor="job-note-body"
          className="text-xs font-bold uppercase tracking-wider text-foreground"
        >
          Add a note
        </label>
        <textarea
          id="job-note-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What happened, what's next..."
          className="w-full min-h-[72px] rounded-lg border border-border bg-background p-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={wantsReminder}
              onChange={(e) => setWantsReminder(e.target.checked)}
            />
            <Bell className="w-4 h-4" /> Remind me
          </label>
          {wantsReminder && (
            <input
              type="datetime-local"
              value={reminderAt}
              onChange={(e) => setReminderAt(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
            />
          )}
          <button
            type="button"
            onClick={handlePost}
            disabled={posting || !body.trim()}
            className="ml-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-bold bg-primary text-primary-foreground disabled:opacity-50 cursor-pointer"
          >
            {posting ? (
              <Loader className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Post
          </button>
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Bell className="w-4 h-4 text-warning" /> Upcoming reminders
          </div>
          {upcoming.map((n) => (
            <div
              key={n.id}
              className="text-sm text-foreground flex items-center justify-between gap-2"
            >
              <span className="truncate">{n.body}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatReminderTime(n.reminder_at!)}
              </span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Loader className="w-4 h-4 animate-spin text-primary" />
          <span>Loading feed...</span>
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-xs text-muted-foreground py-8 text-center uppercase tracking-wider">
          No notes yet
        </div>
      ) : (
        grouped.map(({ day, notes: dayNotes }) => (
          <div key={day} className="space-y-2">
            <div className="text-[12px] text-primary font-bold uppercase tracking-wider border-b border-border pb-1">
              {formatDayHeading(day)}
            </div>
            {dayNotes.map((n) => (
              <div key={n.id} className="bg-card border border-border rounded-lg p-3">
                <p className="text-sm text-foreground leading-relaxed">{n.body}</p>
                <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                  <span>{n.user_email}</span>
                  <span>{formatReminderTime(n.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
};
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `npm run test -- src/opus/components/__tests__/FeedTab.test.tsx`
Expected: PASS (both `groupNotesByDay` and `sortUpcomingReminders` tests)

- [ ] **Step 5: Commit**

```bash
git add src/opus/components/FeedTab.tsx src/opus/components/__tests__/FeedTab.test.tsx
git commit -m "feat: add FeedTab component for job notes and reminders"
```

---

### Task 3: `HistoryTab.tsx` — extract audit log tab verbatim

**Files:**

- Create: `src/opus/components/HistoryTab.tsx`
- Modify: `src/opus/components/JobDetails.tsx` — remove the inline audit-log `TabsContent` block (search for `<TabsContent value="audit_log">` through its matching close), remove now-unused `computeDiff`/`JOB_REVERTIBLE_FIELDS`/`JOB_FIELD_LABELS` if no longer referenced elsewhere in the file after the move (grep the file after removal to confirm), add `import { HistoryTab } from "./HistoryTab";`, render `<HistoryTab jobAuditLogs={jobAuditLogs} loadingJobAuditLogs={loadingJobAuditLogs} auditSearch={auditSearch} setAuditSearch={setAuditSearch} formatPourDate={formatPourDate} setRevertConfirmTarget={setRevertConfirmTarget} />` in its place.

**Interfaces:**

- Consumes (from `JobDetails.tsx`, unchanged shapes): `jobAuditLogs: any[]`, `loadingJobAuditLogs: boolean`, `auditSearch: string`, `setAuditSearch: (v: string) => void`, `formatPourDate: (dateStr: string) => string`, `setRevertConfirmTarget: (t: { oldDetails: any; newDetails: any } | null) => void`.
- Produces: `HistoryTab: React.FC<HistoryTabProps>`.

- [ ] **Step 1: Locate the exact block to move**

In `src/opus/components/JobDetails.tsx`, find the block starting `<TabsContent value="audit_log">` and ending at its matching `</TabsContent>` (currently lines ~1740-1903, verify by content search since numbers drift after Tasks 1-2). Also locate the two constants near the top of the file:

```tsx
const JOB_REVERTIBLE_FIELDS = [
  "contract_max_pours",
  // ...(copy the full array verbatim from JobDetails.tsx:50-58)
];
const JOB_FIELD_LABELS: Record<string, string> = {
  contract_max_pours: "Contract Max Pours",
  // ...(copy the full object verbatim from JobDetails.tsx:59-63)
};
```

- [ ] **Step 2: Create `HistoryTab.tsx` with the moved content**

Copy imports needed: `React` and whatever the moved JSX references (`computeDiff` from `../utils/auditDiff`, any icons used inside the block — check the moved JSX for `lucide-react` icon names and import only those). Structure:

```tsx
// src/opus/components/HistoryTab.tsx
import React from "react";
import { computeDiff } from "../utils/auditDiff";
// import only the lucide-react icons actually referenced inside the moved JSX block

const JOB_REVERTIBLE_FIELDS = [
  // paste verbatim from JobDetails.tsx
];
const JOB_FIELD_LABELS: Record<string, string> = {
  // paste verbatim from JobDetails.tsx
};

interface HistoryTabProps {
  jobAuditLogs: any[];
  loadingJobAuditLogs: boolean;
  auditSearch: string;
  setAuditSearch: (v: string) => void;
  formatPourDate: (dateStr: string) => string;
  setRevertConfirmTarget: (t: { oldDetails: any; newDetails: any } | null) => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  jobAuditLogs,
  loadingJobAuditLogs,
  auditSearch,
  setAuditSearch,
  formatPourDate,
  setRevertConfirmTarget,
}) => {
  return (
    // paste the exact JSX body that was inside <TabsContent value="audit_log">...</TabsContent>,
    // replacing the outer <TabsContent value="audit_log"> wrapper with a <div className="space-y-4"> wrapper
    // since HistoryTab is now rendered as the content of a Tabs.TabsContent from JobDetails.tsx directly,
    // OR keep it as <TabsContent value="audit_log"> if JobDetails.tsx still renders <Tabs> around all 4 tabs (see Task 7)
    <></>
  );
};
```

Since Task 7 keeps the existing `Tabs`/`TabsList`/`TabsContent` primitives in `JobDetails.tsx` wrapping all 4 tabs, `HistoryTab` should render its content as a plain `<div className="space-y-4">...</div>` (matching the existing inner wrapper at old line 1762-1763) and `JobDetails.tsx` wraps it in `<TabsContent value="history"><HistoryTab .../></TabsContent>`.

- [ ] **Step 3: Remove the block from `JobDetails.tsx` and wire up the import**

Delete the `<TabsContent value="audit_log">...</TabsContent>` block and the two constants (`JOB_REVERTIBLE_FIELDS`, `JOB_FIELD_LABELS`) from `JobDetails.tsx`. Add:

```tsx
import { HistoryTab } from "./HistoryTab";
```

Leave a placeholder render for now (final tab wiring happens in Task 7):

```tsx
<TabsContent value="history">
  <HistoryTab
    jobAuditLogs={jobAuditLogs}
    loadingJobAuditLogs={loadingJobAuditLogs}
    auditSearch={auditSearch}
    setAuditSearch={setAuditSearch}
    formatPourDate={formatPourDate}
    setRevertConfirmTarget={setRevertConfirmTarget}
  />
</TabsContent>
```

- [ ] **Step 4: Build and verify no missing-reference errors**

Run: `npm run build`
Expected: PASS — no "X is not defined" or unused-import lint errors referencing the moved audit code. If `computeDiff` import is now unused in `JobDetails.tsx`, remove it there.

- [ ] **Step 5: Commit**

```bash
git add src/opus/components/HistoryTab.tsx src/opus/components/JobDetails.tsx
git commit -m "refactor: extract audit log tab into HistoryTab component"
```

---

### Task 4: `MediaTab.tsx` — extract attachments/upload/share-link tab verbatim

**Files:**

- Create: `src/opus/components/MediaTab.tsx`
- Modify: `src/opus/components/JobDetails.tsx` — remove the `<TabsContent value="overview">` block containing photos+documents (the one whose content is photo grids, document list, and the upload-link generator, currently ~lines 1473-1738), plus its four related modals (photo gallery `Dialog` ~1940-2013, rename `Dialog` ~2016-2050, view-document `ConfirmDialog` ~1907-1921, delete-attachment `ConfirmDialog` ~1924-1937) — move all of these into `MediaTab.tsx` since they're only triggered from within this tab. Add import and render `<MediaTab .../>`.

**Interfaces:**

- Consumes: `attachments`, `uploadingPhotoBefore`, `uploadingPhotoAfter`, `uploadingDoc`, `generatedLink`, `generatingLink`, `copiedLink`, `viewDocTarget`, `setViewDocTarget`, `deleteAttachmentTarget`, `setDeleteAttachmentTarget`, `gallery`, `setGallery`, `renameTarget`, `setRenameTarget`, `renameValue`, `setRenameValue`, `beforePhotos`, `afterPhotos`, `projectDocs`, `uploadAttachment`, `generateUploadLink`, `copyToClipboard`, `executeViewDocument`, `executeDeleteAttachment`, `executeRenameAttachment` — all unchanged types from `JobDetails.tsx`.
- Produces: `MediaTab: React.FC<MediaTabProps>`.

- [ ] **Step 1: Locate the exact blocks to move**

In `JobDetails.tsx`, find (by content search, not line number — numbers shifted after Task 3):

- The `<TabsContent value="overview">` block containing the photo grids, `generateUploadLink`/`generatedLink` JSX (Section 9/10 of the extraction reference above), and the documents list.
- The photo gallery `<Dialog>` block (search for `gallery &&` or the dialog rendering `gallery.photos[gallery.index]`).
- The rename `<Dialog>` block (search for `renameTarget &&`).
- The view-document `<ConfirmDialog>` (search for `viewDocTarget &&` and `executeViewDocument`).
- The delete-attachment `<ConfirmDialog>` (search for `deleteAttachmentTarget &&` and `executeDeleteAttachment`).

- [ ] **Step 2: Create `MediaTab.tsx`**

```tsx
// src/opus/components/MediaTab.tsx
import React from "react";
import {
  Camera,
  FileText,
  Link as LinkIcon,
  Check,
  Loader,
  Copy,
  Download,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
// import any other icons used in the moved JSX — check the exact set against the moved blocks

interface Attachment {
  id: string;
  type: "image_before" | "image_after" | "document";
  file_name: string;
  file_url: string;
  file_size_bytes?: number;
}

interface MediaTabProps {
  beforePhotos: Attachment[];
  afterPhotos: Attachment[];
  projectDocs: Attachment[];
  uploadingPhotoBefore: boolean;
  uploadingPhotoAfter: boolean;
  uploadingDoc: boolean;
  uploadAttachment: (
    file: File,
    type: "image_before" | "image_after" | "document",
  ) => Promise<void>;
  generatedLink: string | null;
  generatingLink: boolean;
  copiedLink: boolean;
  generateUploadLink: () => Promise<void>;
  copyToClipboard: () => void;
  gallery: { photos: Attachment[]; index: number } | null;
  setGallery: (g: { photos: Attachment[]; index: number } | null) => void;
  viewDocTarget: Attachment | null;
  setViewDocTarget: (a: Attachment | null) => void;
  executeViewDocument: () => void;
  deleteAttachmentTarget: Attachment | null;
  setDeleteAttachmentTarget: (a: Attachment | null) => void;
  executeDeleteAttachment: () => Promise<void>;
  renameTarget: Attachment | null;
  setRenameTarget: (a: Attachment | null) => void;
  renameValue: string;
  setRenameValue: (v: string) => void;
  executeRenameAttachment: () => Promise<void>;
}

export const MediaTab: React.FC<MediaTabProps> = (props) => {
  return (
    <div className="space-y-4">
      {/* paste the exact JSX body that was inside <TabsContent value="overview">...</TabsContent>
          (photo grids, documents list, upload-link generator button/alert),
          replacing every state reference (e.g. `attachments`, `generatedLink`) with `props.<name>` */}
    </div>
    // paste the four moved dialogs as siblings after the div above, same prop-reference substitution
  );
};
```

- [ ] **Step 3: Remove the moved blocks from `JobDetails.tsx`, wire up the import**

```tsx
import { MediaTab } from "./MediaTab";
```

```tsx
<TabsContent value="media">
  <MediaTab
    beforePhotos={beforePhotos}
    afterPhotos={afterPhotos}
    projectDocs={projectDocs}
    uploadingPhotoBefore={uploadingPhotoBefore}
    uploadingPhotoAfter={uploadingPhotoAfter}
    uploadingDoc={uploadingDoc}
    uploadAttachment={uploadAttachment}
    generatedLink={generatedLink}
    generatingLink={generatingLink}
    copiedLink={copiedLink}
    generateUploadLink={generateUploadLink}
    copyToClipboard={copyToClipboard}
    gallery={gallery}
    setGallery={setGallery}
    viewDocTarget={viewDocTarget}
    setViewDocTarget={setViewDocTarget}
    executeViewDocument={executeViewDocument}
    deleteAttachmentTarget={deleteAttachmentTarget}
    setDeleteAttachmentTarget={setDeleteAttachmentTarget}
    executeDeleteAttachment={executeDeleteAttachment}
    renameTarget={renameTarget}
    setRenameTarget={setRenameTarget}
    renameValue={renameValue}
    setRenameValue={setRenameValue}
    executeRenameAttachment={executeRenameAttachment}
  />
</TabsContent>
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: PASS, no unresolved references.

- [ ] **Step 5: Commit**

```bash
git add src/opus/components/MediaTab.tsx src/opus/components/JobDetails.tsx
git commit -m "refactor: extract attachments/upload/share-link tab into MediaTab component"
```

---

### Task 5: `JobOverviewTab.tsx` — extract suppliers/map tab + move status summary in

**Files:**

- Create: `src/opus/components/JobOverviewTab.tsx`
- Modify: `src/opus/components/JobDetails.tsx` — remove the `<TabsContent value="suppliers">` block (OSMMap + supplier list, ~lines 1349-1471 pre-Task-3/4 shift), rename/repurpose it as the new "Overview" tab content alongside a compact status/client/location/tags summary pulled from the existing "Main strip" status card (the `<div>` at old lines 886-930, the "Status selector" section — copy its JSX, do not delete the original status-change `ConfirmDialog` which stays in `JobDetails.tsx`).

**Interfaces:**

- Consumes: `job: Job`, `status: Job["status"]`, `setPendingStatus: (s: Job["status"] | null) => void` (existing status-change trigger), `siteCoords`, `suppliers`, `selectedSupplierId`, `setSelectedSupplierId`, `loadingSuppliers`.
- Produces: `JobOverviewTab: React.FC<JobOverviewTabProps>`.

- [ ] **Step 1: Locate the exact blocks to move**

- Status selector JSX inside the "Main strip" card (search `Status selector` comment / the block rendering `status` buttons that call `setPendingStatus`).
- The `<TabsContent value="suppliers">` block (OSMMap + supplier list, Section 7 of the extraction reference above).

- [ ] **Step 2: Create `JobOverviewTab.tsx`**

```tsx
// src/opus/components/JobOverviewTab.tsx
import React from "react";
import { MapPin, Phone, Navigation, Loader } from "lucide-react";
import { OSMMap } from "./OSMMap";
import { Job } from "../types/erp";

interface Supplier {
  id: string;
  name: string;
  businessType?: string;
  address: string;
  distance: string;
  phone?: string;
}

interface JobOverviewTabProps {
  job: Job;
  status: Job["status"];
  setPendingStatus: (s: Job["status"] | null) => void;
  siteCoords: { lat: number; lng: number } | null;
  suppliers: Supplier[];
  selectedSupplierId: string | null;
  setSelectedSupplierId: (id: string | null) => void;
  loadingSuppliers: boolean;
}

export const JobOverviewTab: React.FC<JobOverviewTabProps> = ({
  job,
  status,
  setPendingStatus,
  siteCoords,
  suppliers,
  selectedSupplierId,
  setSelectedSupplierId,
  loadingSuppliers,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        {/* paste the exact status-selector JSX moved from the "Main strip" card here,
            replacing `status`/`setPendingStatus` references with the props of the same name */}
        <div className="text-sm text-foreground">
          <span className="font-bold">{job.siteName}</span>
          <span className="text-muted-foreground"> — {job.mainContractor}</span>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" /> {job.postcode}
        </div>
      </div>

      {/* paste the exact JSX body that was inside <TabsContent value="suppliers">...</TabsContent>
          (OSMMap + supplier list card), replacing every state reference with the matching prop */}
    </div>
  );
};
```

- [ ] **Step 3: Remove the moved blocks from `JobDetails.tsx`, wire up the import**

```tsx
import { JobOverviewTab } from "./JobOverviewTab";
```

```tsx
<TabsContent value="overview">
  <JobOverviewTab
    job={job}
    status={status}
    setPendingStatus={setPendingStatus}
    siteCoords={siteCoords}
    suppliers={suppliers}
    selectedSupplierId={selectedSupplierId}
    setSelectedSupplierId={setSelectedSupplierId}
    loadingSuppliers={loadingSuppliers}
  />
</TabsContent>
```

Note: the original status-selector JSX position inside the "Main strip" card in `JobDetails.tsx` is removed entirely (moved into the Overview tab) — the "Main strip" card itself is dissolved in Task 6 when weather moves into `PersistentJobHeader`, so by the end of Task 6 that whole card no longer exists in `JobDetails.tsx`.

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/opus/components/JobOverviewTab.tsx src/opus/components/JobDetails.tsx
git commit -m "refactor: extract overview tab (status summary + supplier map) into JobOverviewTab component"
```

---

### Task 6: `PersistentJobHeader.tsx` — pour schedule + weather + active staff

**Files:**

- Create: `src/opus/components/PersistentJobHeader.tsx`
- Modify: `src/opus/components/JobDetails.tsx` — remove the weather JSX (old lines 931-968), the "Pour Progress" strip (old lines 970-1002), the now-empty "Main strip" wrapping `<div>` (old lines 884-1003), and the "Staff Scheduled On Site" card (old lines 1199-1245, now inside the pours/staff grid at old lines 1026-1246 — keep the "Scheduled Pours" card with its add/list/edit functionality in `JobDetails.tsx` unchanged, only remove the Staff card half of that grid). Render `<PersistentJobHeader />` above the `<Tabs>` block.

**Interfaces:**

- Consumes: `job: Job`, `pourLogs: PourLog[]`, `weatherData: ReturnType<typeof getWeatherOnDate>`, `loadingWeather: boolean`, `groupedStaff: { [key: string]: Worker[] }`.
- Produces: `PersistentJobHeader: React.FC<PersistentJobHeaderProps>`.

- [ ] **Step 1: Write the failing test for the "next scheduled pour" helper**

```tsx
// src/opus/components/__tests__/PersistentJobHeader.test.tsx
import { describe, it, expect } from "vitest";
import { getNextScheduledPour } from "../PersistentJobHeader";

describe("getNextScheduledPour", () => {
  it("returns the soonest scheduled pour by date", () => {
    const pours = [
      {
        id: "1",
        pourNumber: 2,
        date: "2026-08-05",
        mixType: "C35",
        volumeM3: 10,
        status: "scheduled" as const,
      },
      {
        id: "2",
        pourNumber: 1,
        date: "2026-07-30",
        mixType: "C35",
        volumeM3: 8,
        status: "scheduled" as const,
      },
      {
        id: "3",
        pourNumber: 3,
        date: "2026-07-20",
        mixType: "C35",
        volumeM3: 12,
        status: "completed" as const,
      },
    ];
    expect(getNextScheduledPour(pours)?.id).toBe("2");
  });

  it("returns null when there are no scheduled pours", () => {
    const pours = [
      {
        id: "1",
        pourNumber: 1,
        date: "2026-07-20",
        mixType: "C35",
        volumeM3: 8,
        status: "completed" as const,
      },
    ];
    expect(getNextScheduledPour(pours)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/opus/components/__tests__/PersistentJobHeader.test.tsx`
Expected: FAIL — module/export not found.

- [ ] **Step 3: Locate the JSX blocks to move**

- Weather JSX (search `Live Weather` comment, Section 5 of the extraction reference above).
- Staff-on-site card JSX (search `Staff Scheduled On Site`, Section 6 of the extraction reference above).

- [ ] **Step 4: Create `PersistentJobHeader.tsx`**

```tsx
// src/opus/components/PersistentJobHeader.tsx
import React, { useState } from "react";
import {
  CloudRain,
  CloudSun,
  Snowflake,
  Wind,
  Loader,
  UserCheck,
  Phone,
  ChevronDown,
  ChevronUp,
  HardHat,
} from "lucide-react";
import { Job, Worker } from "../types/erp";

interface PourLog {
  id: string;
  pourNumber: number;
  date: string;
  mixType: string;
  volumeM3: number;
  status: "completed" | "scheduled";
  notes?: string;
}

export function getNextScheduledPour(pourLogs: PourLog[]): PourLog | null {
  const scheduled = pourLogs.filter((p) => p.status === "scheduled");
  if (scheduled.length === 0) return null;
  return [...scheduled].sort((a, b) => (a.date || "").localeCompare(b.date || ""))[0];
}

function formatPourDate(dateStr: string): string {
  if (!dateStr) return "TBC";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "TBC";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface PersistentJobHeaderProps {
  job: Job;
  pourLogs: PourLog[];
  weatherData: {
    temperature: number;
    condition: string;
    riskLevel: string;
    isImpactful: boolean;
  } | null;
  loadingWeather: boolean;
  groupedStaff: { [key: string]: Worker[] };
}

export const PersistentJobHeader: React.FC<PersistentJobHeaderProps> = ({
  pourLogs,
  weatherData,
  loadingWeather,
  groupedStaff,
}) => {
  const [staffExpanded, setStaffExpanded] = useState(false);
  const nextPour = getNextScheduledPour(pourLogs);
  const staffCount = Object.values(groupedStaff).reduce((sum, list) => sum + list.length, 0);

  return (
    <div className="bg-card border border-border rounded-xl divide-y divide-border">
      <div className="p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <HardHat className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wider shrink-0">
            Next Pour
          </span>
        </div>
        {nextPour ? (
          <span className="text-sm font-bold text-foreground truncate">
            #{nextPour.pourNumber} · {formatPourDate(nextPour.date)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">None scheduled</span>
        )}
      </div>

      <div className="p-3 flex items-center justify-between gap-3">
        {loadingWeather ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader className="w-4 h-4 animate-spin text-primary" />
            <span>Fetching weather...</span>
          </div>
        ) : weatherData ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              {weatherData.condition === "Rain" ? (
                <CloudRain className="w-5 h-5 text-muted-foreground shrink-0" />
              ) : weatherData.condition === "Frost" ? (
                <Snowflake className="w-5 h-5 text-muted-foreground shrink-0" />
              ) : weatherData.condition === "Wind" ? (
                <Wind className="w-5 h-5 text-muted-foreground shrink-0" />
              ) : (
                <CloudSun className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <span className="text-sm font-bold text-foreground">{weatherData.temperature}°C</span>
              <span className="text-xs text-muted-foreground truncate">
                {weatherData.condition}
              </span>
            </div>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                weatherData.isImpactful
                  ? "bg-destructive/15 text-destructive border border-destructive/20"
                  : "bg-success/15 text-success border border-success/20"
              }`}
            >
              {weatherData.riskLevel} Risk
            </span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Weather unavailable</span>
        )}
      </div>

      <div className="p-3">
        <button
          type="button"
          onClick={() => setStaffExpanded((v) => !v)}
          className="w-full flex items-center justify-between gap-3 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Active Staff
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{staffCount}</span>
            {staffExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>
        {staffExpanded && (
          <div className="mt-3 space-y-4">
            {Object.keys(groupedStaff).length > 0 ? (
              Object.keys(groupedStaff).map((roleName) => (
                <div key={roleName} className="space-y-1.5">
                  <div className="text-[12px] text-primary font-bold uppercase tracking-wider border-b border-border pb-1">
                    {roleName} ({groupedStaff[roleName].length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {groupedStaff[roleName].map((w) => (
                      <div
                        key={w.id}
                        className="bg-background border border-border rounded-lg p-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-foreground truncate">{w.name}</div>
                          {w.phone && (
                            <a
                              href={`tel:${w.phone}`}
                              className="text-[11px] text-primary hover:underline font-mono flex items-center gap-1 mt-0.5"
                            >
                              <Phone className="w-2.5 h-2.5" /> {w.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground py-4 text-center uppercase tracking-wider">
                No staff members scheduled to this job site.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- src/opus/components/__tests__/PersistentJobHeader.test.tsx`
Expected: PASS.

- [ ] **Step 6: Remove the moved blocks from `JobDetails.tsx`, wire up the import**

```tsx
import { PersistentJobHeader } from "./PersistentJobHeader";
```

Render immediately above the `<Tabs>` block:

```tsx
<PersistentJobHeader
  job={job}
  pourLogs={pourLogs}
  weatherData={weatherData}
  loadingWeather={loadingWeather}
  groupedStaff={groupedStaff}
/>
```

Delete the dissolved "Main strip" `<div>` (old lines 884-1003, minus the status-selector JSX already moved out in Task 5) and the "Staff Scheduled On Site" half of the pours/staff grid (old lines 1199-1245). The "Scheduled Pours" card (add form + list, old lines 1028-1197) stays in `JobDetails.tsx` as its own full-width `<div>` (no longer paired in a 2-column grid with staff — change its wrapper from `grid grid-cols-1 lg:grid-cols-2 gap-4` to no grid wrapper, since staff moved to the header).

- [ ] **Step 7: Build and verify**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/opus/components/PersistentJobHeader.tsx src/opus/components/JobDetails.tsx src/opus/components/__tests__/PersistentJobHeader.test.tsx
git commit -m "refactor: extract weather and staff widgets into PersistentJobHeader component"
```

---

### Task 7: Wire up 4-tab structure and icon+label tab bar in `JobDetails.tsx`

**Files:**

- Modify: `src/opus/components/JobDetails.tsx`

**Interfaces:**

- Consumes: `TabsList`, `TabsTrigger` from `@/components/ui/tabs` (already imported, `JobDetails.tsx:33`).
- Produces: final `<Tabs>` block with 4 triggers: Overview, Media, Feed, History.

- [ ] **Step 1: Replace the `<TabsList>` block**

Find the existing `<TabsList>...</TabsList>` (currently has Overview/Local Suppliers/Audit Log triggers) and replace with:

```tsx
<TabsList className="w-full grid grid-cols-4">
  <TabsTrigger value="overview" className="flex items-center gap-1.5">
    <LayoutGrid className="w-4 h-4" /> <span className="hidden sm:inline">Overview</span>
  </TabsTrigger>
  <TabsTrigger value="media" className="flex items-center gap-1.5">
    <Paperclip className="w-4 h-4" /> <span className="hidden sm:inline">Media</span>
  </TabsTrigger>
  <TabsTrigger value="feed" className="flex items-center gap-1.5">
    <MessageSquare className="w-4 h-4" /> <span className="hidden sm:inline">Feed</span>
  </TabsTrigger>
  <TabsTrigger value="history" className="flex items-center gap-1.5">
    <History className="w-4 h-4" /> <span className="hidden sm:inline">History</span>
  </TabsTrigger>
</TabsList>
```

Add `LayoutGrid` and `MessageSquare` to the `lucide-react` import list at the top of `JobDetails.tsx` (`History` and `Paperclip` are already imported per Section 1 of the extraction reference).

Note: labels use `hidden sm:inline` (icon-only below `sm` breakpoint, icon+label at `sm` and above) to fit 4 tabs on a narrow mobile viewport without wrapping — every trigger still has an accessible label via each icon's implicit context; if this reads as violating the "icon must pair with visible text label" constraint on the smallest viewports, add `aria-label` matching the tab name to each `TabsTrigger` so screen readers always get the label even when visually hidden:

````tsx
<TabsTrigger value="overview" aria-label="Overview" className="flex items-center gap-1.5">
```//apply the same aria-label pattern to the other three triggers.

- [ ] **Step 2: Add the `<TabsContent value="feed">` block**

Directly after the `<TabsContent value="media">` block from Task 4 (or in whatever order the four `TabsContent` blocks currently sit — keep them in Overview, Media, Feed, History order to match the tab bar):

```tsx
<TabsContent value="feed">
  <FeedTab jobId={job.id} />
</TabsContent>
````

Add the import:

```tsx
import { FeedTab } from "./FeedTab";
```

- [ ] **Step 3: Set the `Tabs` default value**

Confirm the `<Tabs defaultValue="overview" className="w-full">` wrapper still uses `"overview"` as the default (unchanged from before).

- [ ] **Step 4: Build and manually verify tab order**

Run: `npm run build`
Expected: PASS.

Run: `npm run lint`
Expected: PASS — no unused imports left over from the moved sections (double-check `computeDiff`, `MapPin`, `Navigation`, `Phone`, `CloudRain`/`CloudSun`/`Snowflake`/`Wind`, `UserCheck` are removed from `JobDetails.tsx`'s import list if no longer used there directly).

- [ ] **Step 5: Commit**

```bash
git add src/opus/components/JobDetails.tsx
git commit -m "refactor: wire up 4-tab workspace (Overview, Media, Feed, History) in JobDetails"
```

---

### Task 8: Manual QA pass

**Files:** none (verification only)

- [ ] **Step 1: Start dev server and open a job's detail page**

Run: `npm run dev`

Navigate to a job in the app, open Job Details.

- [ ] **Step 2: Verify persistent header on mobile viewport**

Resize browser to 375px width. Confirm: header (next pour + weather + staff rows) is visible without scrolling, consumes roughly a quarter to a third of the viewport, and the 4-tab bar is visible below it without scrolling.

- [ ] **Step 3: Verify each tab**

- Overview: status summary + supplier map render, status change still works (opens the existing `ConfirmDialog`).
- Media: photo grids, document list, upload (image + doc), share-link generate + copy, delete/rename attachment all function as before.
- Feed: post a note, toggle "Remind me" with a future date, confirm it appears in "Upcoming reminders"; confirm the note appears grouped under today's date heading.
- History: audit log list renders, search filters by email, Revert button still opens the revert confirmation dialog.

- [ ] **Step 4: Verify dark mode contrast**

Toggle dark mode. Confirm feed note text and all new component text use the off-white `--foreground` token, not pure white, and headings/labels remain legible against `--card`/`--background`.

- [ ] **Step 5: Run full test and build suite**

Run: `npm run test && npm run build && npm run lint`
Expected: all PASS.

- [ ] **Step 6: Write completion doc**

Create `.claude/completions/2026-07-23-job-details-redesign.md` summarizing what changed, per `CLAUDE.md`'s task-completion protocol.
