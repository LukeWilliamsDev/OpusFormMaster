# Scheduled Pours from Quote Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a quote converts to a job, auto-derive scheduled pour rows from its Bill of Quantities (BoQ) and persist pours to a real Supabase table instead of JobDetails' mock local state.

**Architecture:** A new `public.pours` table backs pour data. A pure utility function (`derivePoursFromQuote`) scans quote BoQ lines for pour-shaped items and produces pour records; `PipelineRegistry.tsx`'s conversion handler calls it and bulk-inserts the result. `JobDetails.tsx` swaps its mock-seeded local state for real fetch/insert/update/delete calls against `pours`, keeping its existing audit-log calls unchanged.

**Tech Stack:** React 19 + TypeScript, Supabase (Postgres + RLS), Vitest.

## Global Constraints

- Pour matching is keyword-based on BoQ line `description`: `pour`, `slab`, `concrete`, `screed` (case-insensitive substring match).
- One matched BoQ line = exactly one pour (no volume splitting).
- Pour `volume_m3` = the matched line's `quantity`. `mix_type` = first `C\d{2}/\d{2}` pattern found in the description, else `"TBC"`.
- Derived pours always get `date: null`, `status: "scheduled"`.
- `contractMaxPours` on the new job = count of matched lines, falling back to `10` if zero lines matched (preserves current behavior for quotes with no pour-shaped lines).
- New `public.pours` table RLS follows the existing `job_attachments` pattern: four policies (`select`/`insert`/`update`/`delete`), all `TO authenticated`, gated on `private.can_write_ops(auth.uid())`.
- Pour insert failure during conversion must not roll back the job (same tier as the existing quote-PDF-attach try/catch in `handleConvertToJob`).

---

## File Structure

- **Create:** `supabase/migrations/20260722120000_add_pours_table.sql` — table + RLS.
- **Create:** `src/opus/utils/pourDerivation.ts` — pure `derivePoursFromQuote` function, no Supabase/React dependency.
- **Create:** `src/opus/utils/__tests__/pourDerivation.test.ts` — unit tests for the above.
- **Modify:** `src/opus/components/PipelineRegistry.tsx` — call `derivePoursFromQuote` in `handleConvertToJob`, insert rows, set `contractMaxPours` from the result.
- **Modify:** `src/opus/components/JobDetails.tsx` — replace mock `pourLogs` seeding/mutation with real Supabase reads/writes.

---

### Task 1: `pours` table migration

**Files:**

- Create: `supabase/migrations/20260722120000_add_pours_table.sql`

**Interfaces:**

- Produces: table `public.pours(id uuid, job_id uuid, pour_number int, date date, mix_type text, volume_m3 numeric, status text, notes text, created_at timestamptz, tenant_id uuid)`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260722120000_add_pours_table.sql
CREATE TABLE public.pours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  pour_number int NOT NULL,
  date date,
  mix_type text NOT NULL DEFAULT 'TBC',
  volume_m3 numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid
);

CREATE INDEX pours_job_id_idx ON public.pours(job_id);

ALTER TABLE public.pours ENABLE ROW LEVEL SECURITY;

CREATE POLICY pours_select_ops ON public.pours FOR SELECT TO authenticated
  USING (private.can_write_ops(auth.uid()));
CREATE POLICY pours_insert_ops ON public.pours FOR INSERT TO authenticated
  WITH CHECK (private.can_write_ops(auth.uid()));
CREATE POLICY pours_update_ops ON public.pours FOR UPDATE TO authenticated
  USING (private.can_write_ops(auth.uid())) WITH CHECK (private.can_write_ops(auth.uid()));
CREATE POLICY pours_delete_ops ON public.pours FOR DELETE TO authenticated
  USING (private.can_write_ops(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.pours;
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db push`
Expected: migration applies with no errors; `public.pours` exists.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260722120000_add_pours_table.sql
git commit -m "feat: add public.pours table with RLS"
```

---

### Task 2: `derivePoursFromQuote` utility + tests

**Files:**

- Create: `src/opus/utils/pourDerivation.ts`
- Test: `src/opus/utils/__tests__/pourDerivation.test.ts`

**Interfaces:**

- Consumes: nothing from other tasks.
- Produces:

  ```ts
  export interface DerivedPour {
    pourNumber: number;
    mixType: string;
    volumeM3: number;
    notes: string;
  }
  export interface QuoteLineForDerivation {
    description: string;
    quantity: number;
  }
  export function derivePoursFromQuote(items: QuoteLineForDerivation[]): DerivedPour[];
  ```

  `derivePoursFromQuote` is consumed by Task 3 (`PipelineRegistry.tsx`).

- [ ] **Step 1: Write the failing tests**

```ts
// src/opus/utils/__tests__/pourDerivation.test.ts
import { describe, test, expect } from "vitest";
import { derivePoursFromQuote } from "../pourDerivation";

describe("derivePoursFromQuote", () => {
  test("matches pour-shaped BoQ lines by keyword", () => {
    const result = derivePoursFromQuote([
      { description: "Slab Pour C32/40", quantity: 34 },
      { description: "Labour - banksman", quantity: 5 },
      { description: "Concrete base to garage", quantity: 12 },
      { description: "Plant hire - excavator", quantity: 1 },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      pourNumber: 1,
      mixType: "C32/40",
      volumeM3: 34,
      notes: "Slab Pour C32/40",
    });
    expect(result[1]).toEqual({
      pourNumber: 2,
      mixType: "TBC",
      volumeM3: 12,
      notes: "Concrete base to garage",
    });
  });

  test("matches screed lines and is case-insensitive", () => {
    const result = derivePoursFromQuote([{ description: "SCREED Floor Finish", quantity: 20 }]);
    expect(result).toHaveLength(1);
    expect(result[0].mixType).toBe("TBC");
  });

  test("extracts mix grade regardless of position in description", () => {
    const result = derivePoursFromQuote([
      { description: "Pour of C25/30 to footing", quantity: 8 },
    ]);
    expect(result[0].mixType).toBe("C25/30");
  });

  test("returns empty array when no lines match", () => {
    const result = derivePoursFromQuote([
      { description: "Labour - general", quantity: 1 },
      { description: "Skip hire", quantity: 1 },
    ]);
    expect(result).toEqual([]);
  });

  test("numbers pours sequentially starting at 1", () => {
    const result = derivePoursFromQuote([
      { description: "Concrete pour A", quantity: 1 },
      { description: "Concrete pour B", quantity: 2 },
      { description: "Concrete pour C", quantity: 3 },
    ]);
    expect(result.map((p) => p.pourNumber)).toEqual([1, 2, 3]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- pourDerivation`
Expected: FAIL with "Cannot find module '../pourDerivation'"

- [ ] **Step 3: Write the implementation**

```ts
// src/opus/utils/pourDerivation.ts
export interface DerivedPour {
  pourNumber: number;
  mixType: string;
  volumeM3: number;
  notes: string;
}

export interface QuoteLineForDerivation {
  description: string;
  quantity: number;
}

const POUR_KEYWORDS = ["pour", "slab", "concrete", "screed"];
const MIX_GRADE_PATTERN = /C\d{2}\/\d{2}/i;

export function derivePoursFromQuote(items: QuoteLineForDerivation[]): DerivedPour[] {
  const matched = items.filter((item) => {
    const description = (item.description || "").toLowerCase();
    return POUR_KEYWORDS.some((keyword) => description.includes(keyword));
  });

  return matched.map((item, index) => {
    const gradeMatch = item.description.match(MIX_GRADE_PATTERN);
    return {
      pourNumber: index + 1,
      mixType: gradeMatch ? gradeMatch[0].toUpperCase() : "TBC",
      volumeM3: item.quantity,
      notes: item.description,
    };
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- pourDerivation`
Expected: PASS, 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/opus/utils/pourDerivation.ts src/opus/utils/__tests__/pourDerivation.test.ts
git commit -m "feat: add derivePoursFromQuote BoQ matching utility"
```

---

### Task 3: Wire derivation into quote conversion

**Files:**

- Modify: `src/opus/components/PipelineRegistry.tsx` (the `handleConvertToJob` function, and the `Quote`/`MeasuredItem` interfaces already declared at the top of the file)

**Interfaces:**

- Consumes: `derivePoursFromQuote(items: QuoteLineForDerivation[]): DerivedPour[]` from Task 2 (`src/opus/utils/pourDerivation.ts`).
- Produces: `public.pours` rows inserted at conversion time; `newJob.contractMaxPours` set from derivation count.

- [ ] **Step 1: Import the utility**

In `src/opus/components/PipelineRegistry.tsx`, add near the top with the other imports:

```ts
import { derivePoursFromQuote } from "../utils/pourDerivation";
```

- [ ] **Step 2: Derive pours and use the count for `contractMaxPours`**

In `handleConvertToJob`, replace:

```ts
// Create a new active Job object
const newJob: Job = {
  id: Math.random().toString(36).substr(2, 9),
  jobRef: convertingQuote.reference.replace("QTE", "OP").replace("JOB", "OP"),
  siteName: convertingQuote.clientInfo.site || "New Unassigned Site",
  mainContractor: convertingQuote.clientInfo.entity || "Contractor",
  postcode: convertingQuote.clientInfo.postcode || "N/A",
  currentPours: 0,
  contractMaxPours: 10,
  status: "pending",
  scheduleValue: convertingQuote.totals?.grossTotal || 0,
};
```

with:

```ts
const derivedPours = derivePoursFromQuote(convertingQuote.items || []);

// Create a new active Job object
const newJob: Job = {
  id: Math.random().toString(36).substr(2, 9),
  jobRef: convertingQuote.reference.replace("QTE", "OP").replace("JOB", "OP"),
  siteName: convertingQuote.clientInfo.site || "New Unassigned Site",
  mainContractor: convertingQuote.clientInfo.entity || "Contractor",
  postcode: convertingQuote.clientInfo.postcode || "N/A",
  currentPours: 0,
  contractMaxPours: derivedPours.length > 0 ? derivedPours.length : 10,
  status: "pending",
  scheduleValue: convertingQuote.totals?.grossTotal || 0,
};
```

- [ ] **Step 3: Insert derived pours after the job upsert succeeds**

Immediately after this existing block:

```ts
const { error: jobError } = await supabase
  .from("jobs")
  .upsert(jobToRow(newJob, profile?.tenant_id));
if (jobError) throw jobError;
```

add:

```ts
if (derivedPours.length > 0) {
  const { error: poursError } = await supabase.from("pours").insert(
    derivedPours.map((pour) => ({
      job_id: newJob.id,
      pour_number: pour.pourNumber,
      date: null,
      mix_type: pour.mixType,
      volume_m3: pour.volumeM3,
      status: "scheduled",
      notes: pour.notes,
      tenant_id: profile?.tenant_id,
    })),
  );
  if (poursError) {
    // Job conversion already succeeded; scheduled pours are a nice-to-have
    // derived from the BoQ, so failure here doesn't roll back the job —
    // same tolerance tier as the quote-PDF attach below.
    console.error("Failed to insert derived pours", poursError);
    toast.error(`Job created, but scheduled pours failed to save: ${poursError.message}`);
  }
}
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open the Pipeline Registry, convert a quote whose BoQ has at least one line containing "pour"/"slab"/"concrete"/"screed" to a job. Confirm in Supabase Studio that `public.pours` has one row per matched line and the new job's `contract_max_pours` equals that count.

- [ ] **Step 5: Commit**

```bash
git add src/opus/components/PipelineRegistry.tsx
git commit -m "feat: derive scheduled pours from BoQ on quote conversion"
```

---

### Task 4: JobDetails reads real pours instead of mock state

**Files:**

- Modify: `src/opus/components/JobDetails.tsx`

**Interfaces:**

- Consumes: `public.pours` table from Task 1.
- Produces: `pourLogs` state now sourced from Supabase; `PourLog.id` becomes the real `pours.id` (uuid string, same type as before).

- [ ] **Step 1: Replace the mock-seeding effect with a real fetch + subscription**

Replace this existing block (currently seeding `pourLogs` from `job.currentPours`):

```ts
// Seed mock pour logs for this job once on load — must NOT re-run when
// currentPours changes, since checking/unchecking/adding/removing a pour
// all update currentPours via onUpdateJob, and re-running this would wipe
// out those edits with a freshly regenerated mock list.
useEffect(() => {
  const list: PourLog[] = [];
  const count = job.currentPours || 0;
  for (let i = 1; i <= count; i++) {
    let mixType = "C32/40";
    let volumeM3 = 30;
    let dateStr = "";
    // ... (existing mock generation body)
  }
  setPourLogs(list.reverse());
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [job.id]);
```

with:

```ts
const rowToPourLog = (r: any): PourLog => ({
  id: r.id,
  pourNumber: r.pour_number,
  date: r.date || "",
  mixType: r.mix_type,
  volumeM3: Number(r.volume_m3),
  status: r.status,
  notes: r.notes || undefined,
});

const fetchPourLogs = async () => {
  const { data, error } = await supabase
    .from("pours")
    .select("*")
    .eq("job_id", job.id)
    .order("pour_number", { ascending: false });
  if (error) {
    console.error("Failed to load pours", error);
    return;
  }
  setPourLogs((data || []).map(rowToPourLog));
};

useEffect(() => {
  fetchPourLogs();

  const channel = supabase
    .channel(`job-pours-${job.id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pours", filter: `job_id=eq.${job.id}` },
      fetchPourLogs,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [job.id]);
```

(Note: `PourLog.notes` must already be optional in the interface — check the existing `interface PourLog` block a few lines above and add `notes?: string;` if it isn't already there.)

- [ ] **Step 2: Persist new pours via insert instead of local state**

Replace `handleAddPourSubmit`:

```ts
const handleAddPourSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  const nextPourNumber = pourLogs.reduce((max, l) => Math.max(max, l.pourNumber), 0) + 1;
  const newLog: PourLog = {
    id: `${job.id}-pour-${Date.now()}`,
    pourNumber: nextPourNumber,
    date: newPourDate,
    mixType: newPourMix,
    volumeM3: Number(newPourVolume),
    status: "scheduled",
    notes: newPourNotes || `Scheduled pour #${nextPourNumber}`,
  };

  setPourLogs([newLog, ...pourLogs]);
  setIsAddingPour(false);
  setNewPourNotes("");
  setNewPourDate(new Date().toISOString().split("T")[0]);
  toast.success("Pour scheduled");
  logPourAudit("SCHEDULE_POUR", newLog);
};
```

with:

```ts
const handleAddPourSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const nextPourNumber = pourLogs.reduce((max, l) => Math.max(max, l.pourNumber), 0) + 1;
  const notes = newPourNotes || `Scheduled pour #${nextPourNumber}`;

  const { data, error } = await supabase
    .from("pours")
    .insert({
      job_id: job.id,
      pour_number: nextPourNumber,
      date: newPourDate,
      mix_type: newPourMix,
      volume_m3: Number(newPourVolume),
      status: "scheduled",
      notes,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to schedule pour", error);
    toast.error("Failed to schedule pour");
    return;
  }

  const newLog = rowToPourLog(data);
  setPourLogs([newLog, ...pourLogs]);
  setIsAddingPour(false);
  setNewPourNotes("");
  setNewPourDate(new Date().toISOString().split("T")[0]);
  toast.success("Pour scheduled");
  logPourAudit("SCHEDULE_POUR", newLog);
};
```

- [ ] **Step 3: Persist complete/revert toggles via update**

Replace `executeTogglePourComplete`:

```ts
const executeTogglePourComplete = () => {
  if (!pourToggleTarget) return;
  const log = pourToggleTarget;
  const wasCompleted = log.status === "completed";

  setPourLogs((prev) =>
    prev.map((l) =>
      l.id === log.id
        ? {
            ...l,
            status: wasCompleted ? "scheduled" : "completed",
          }
        : l,
    ),
  );

  const nextPourCount = Math.max(0, currentPours + (wasCompleted ? -1 : 1));
  setCurrentPours(nextPourCount);
  onUpdateJob({ ...job, currentPours: nextPourCount });

  setPourToggleTarget(null);
  toast.success(
    wasCompleted
      ? `Pour #${log.pourNumber} marked as scheduled`
      : `Pour #${log.pourNumber} marked complete`,
  );
  logPourAudit(wasCompleted ? "REVERT_POUR" : "COMPLETE_POUR", log);
};
```

with:

```ts
const executeTogglePourComplete = async () => {
  if (!pourToggleTarget) return;
  const log = pourToggleTarget;
  const wasCompleted = log.status === "completed";
  const nextStatus = wasCompleted ? "scheduled" : "completed";

  const { error } = await supabase.from("pours").update({ status: nextStatus }).eq("id", log.id);
  if (error) {
    console.error("Failed to toggle pour status", error);
    toast.error("Failed to update pour");
    setPourToggleTarget(null);
    return;
  }

  setPourLogs((prev) => prev.map((l) => (l.id === log.id ? { ...l, status: nextStatus } : l)));

  const nextPourCount = Math.max(0, currentPours + (wasCompleted ? -1 : 1));
  setCurrentPours(nextPourCount);
  onUpdateJob({ ...job, currentPours: nextPourCount });

  setPourToggleTarget(null);
  toast.success(
    wasCompleted
      ? `Pour #${log.pourNumber} marked as scheduled`
      : `Pour #${log.pourNumber} marked complete`,
  );
  logPourAudit(wasCompleted ? "REVERT_POUR" : "COMPLETE_POUR", log);
};
```

- [ ] **Step 4: Persist deletes**

Replace the start of `executeRemovePour` (keep the rest of the function — the count-adjustment/toast/audit logic after the filter — unchanged):

```ts
  const executeRemovePour = () => {
    if (!pourToRemove) return;
    const updatedLogs = pourLogs.filter((l) => l.id !== pourToRemove.id);
    setPourLogs(updatedLogs);

    if (pourToRemove.status === "completed") {
      const nextPourCount = Math.max(0, currentPours - 1);
      setCurrentPours(nextPourCount);
```

with:

```ts
  const executeRemovePour = async () => {
    if (!pourToRemove) return;

    const { error } = await supabase.from("pours").delete().eq("id", pourToRemove.id);
    if (error) {
      console.error("Failed to remove pour", error);
      toast.error("Failed to remove pour");
      return;
    }

    const updatedLogs = pourLogs.filter((l) => l.id !== pourToRemove.id);
    setPourLogs(updatedLogs);

    if (pourToRemove.status === "completed") {
      const nextPourCount = Math.max(0, currentPours - 1);
      setCurrentPours(nextPourCount);
```

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open a job with derived pours (from Task 3's conversion), confirm the Pour Log section shows them with correct mix type/volume/notes and empty date. Add a new pour, mark one complete, revert it, delete one — confirm each persists across a page reload.

- [ ] **Step 6: Commit**

```bash
git add src/opus/components/JobDetails.tsx
git commit -m "feat: persist pour logs to public.pours instead of mock state"
```

---

## Self-Review Notes

- **Spec coverage:** table + RLS (Task 1), BoQ derivation with keyword match/one-line-one-pour/grade regex/TBC fallback (Task 2), conversion wiring with `contractMaxPours` fallback to 10 and non-blocking insert failure (Task 3), JobDetails real persistence for add/complete/revert/delete (Task 4). All spec sections covered.
- **Type consistency:** `DerivedPour` (Task 2) fields (`pourNumber`, `mixType`, `volumeM3`, `notes`) match what Task 3's insert mapping reads (`pour.pourNumber`, `pour.mixType`, etc.) and what Task 4's `rowToPourLog` produces for the pre-existing `PourLog` interface (`id`, `pourNumber`, `date`, `mixType`, `volumeM3`, `status`, `notes`).
- **No placeholders:** all steps contain complete code, no TBD/TODO markers.
