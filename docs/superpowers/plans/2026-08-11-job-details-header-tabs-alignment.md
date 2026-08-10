# Job Details Header + Non-Overview Tab Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Job Details header so the title reliably stays on one line, and align every non-Overview tab panel's heading/card-shell style to match the Overview panel's established convention.

**Architecture:** Pure presentation-layer JSX/Tailwind changes across `JobDetails.tsx` (header), `MediaTab.tsx` (Attachments), and `JobOverviewTab.tsx` (Suppliers). Billing (`InvoiceList.tsx`, `FinalBillList.tsx`) and History (`HistoryTab.tsx`) were audited against the spec's reference pattern and already conform — no changes needed there, confirmed in Task 0.

**Tech Stack:** React 19 + TypeScript, TailwindCSS, no test runner for this page (visual-only changes, no unit tests apply) — verification is manual/browser-driven per the spec's breakpoint matrix.

## Global Constraints

- No changes to data fetching, filtering, revert/upload/delete logic, or any dialog behavior — presentation-layer only (spec §3).
- Any `DialogContent` max-width override touched in passing must stay scoped to `lg:` — an unconditional `max-w-*` breaks the mobile bottom-sheet (known codebase pitfall).
- Reference heading style to match everywhere: `text-sm font-bold text-foreground` (sentence case, not uppercase) — the pattern already used by Overview's "Scheduled Pours" / "Staff On Site" and by `InvoiceList.tsx:110` / `FinalBillList.tsx:126`.
- Reference card shell: `bg-card border border-border rounded-xl p-4`, `space-y-4` internal rhythm.
- Reference unified side-by-side pattern: one outer `bg-card border border-border rounded-xl overflow-hidden` wrapping a grid, columns as plain divs, `md:border-r` (or `lg:border-r`) as the divider — never two separate bordered cards with a gap.
- Test at every width in the spec's matrix: 375, 414, 640, 768, 1024, 1280, 1440, 1920px.

---

### Task 0: Audit Billing and History panels against the reference pattern

**Files:**

- Read: `src/opus/components/billing/InvoiceList.tsx`
- Read: `src/opus/components/billing/FinalBillList.tsx`
- Read: `src/opus/components/HistoryTab.tsx`

**Interfaces:** None — read-only audit task, no code changes.

- [ ] **Step 1: Confirm InvoiceList already conforms**

Open `src/opus/components/billing/InvoiceList.tsx`. Confirm line 110 reads:

```tsx
<h3 className="text-sm font-bold text-foreground leading-tight">Quotes</h3>
```

and the outer wrapper at line 227-229 reads:

```tsx
<div
  className={embedded ? "space-y-4" : "bg-card border border-border rounded-xl p-4 space-y-4"}
>
```

Both already match the reference pattern. No change needed.

- [ ] **Step 2: Confirm FinalBillList already conforms**

Open `src/opus/components/billing/FinalBillList.tsx`. Confirm line 126 reads:

```tsx
<h3 className="text-sm font-bold text-foreground leading-tight">Invoices sent</h3>
```

Already matches. No change needed.

- [ ] **Step 3: Confirm HistoryTab already conforms**

Open `src/opus/components/HistoryTab.tsx`. Confirm line 103 reads:

```tsx
<div className="bg-card border border-border rounded-xl p-4 space-y-4">
```

Already matches the reference card shell. HistoryTab has no in-panel section heading (the tab label itself is the title), so there's no heading style to align. No change needed.

- [ ] **Step 4: Commit the audit note**

No files changed in this task — nothing to commit. Proceed to Task 1.

---

### Task 1: Header restructure — title gets its own full-width row

**Files:**

- Modify: `src/opus/components/JobDetails.tsx:922-1007`

**Interfaces:**

- Consumes: existing local state/handlers already in scope at this point in the component — `onBack`, `backLabel`, `job`, `statusDropdown` (JSX built at line 846-893), `loadingWeather`, `weatherData`. No new props or state needed.
- Produces: nothing consumed by later tasks — this is a self-contained JSX restructure.

- [ ] **Step 1: Replace the 3-column header block with a two-row stack**

In `src/opus/components/JobDetails.tsx`, replace the entire block from the `{/* Header: job ref, title and status */}` comment (line 922) through its closing `</div>` (line 1007) with:

```tsx
{
  /* Header: title full-width, metadata chips below */
}
<div className="bg-card border border-border rounded-xl p-6 md:p-8 space-y-4">
  <h1
    className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight break-words line-clamp-2"
    title={job.siteName}
  >
    {job.siteName}
  </h1>

  <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-col items-start gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Job Reference
        </span>
        <span className="text-xl font-bold font-mono text-foreground bg-secondary border border-border rounded-md px-2.5 py-1.5">
          {job.jobRef.replace("-X", "")}
        </span>
      </div>
      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-secondary/50 border border-border rounded-md px-2.5 py-1.5 self-end">
        <span className="text-foreground">{job.mainContractor}</span>
        <span className="text-muted-foreground">·</span>
        <span className="font-mono normal-case tracking-normal text-muted-foreground">
          {job.postcode}
        </span>
      </div>
      {job.email && (
        <a
          href={`mailto:${job.email}`}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold normal-case tracking-normal bg-secondary/50 border border-border rounded-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground transition-colors self-end"
        >
          <Mail className="w-3.5 h-3.5 shrink-0" />
          {job.email}
        </a>
      )}
    </div>

    <div className="flex flex-col items-start gap-1.5 w-full sm:w-[150px] shrink-0">
      {statusDropdown}
      {loadingWeather ? (
        <div className="w-full flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/50 border border-border rounded-md px-2.5 py-1.5">
          <Loader className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
          Loading
        </div>
      ) : weatherData ? (
        <>
          <div className="w-full flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-secondary/50 border border-border rounded-md px-2.5 py-1.5">
            {weatherData.condition === "Rain" ? (
              <CloudRain className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            ) : weatherData.condition === "Frost" ? (
              <Snowflake className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            ) : weatherData.condition === "Wind" ? (
              <Wind className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            ) : (
              <CloudSun className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
            <span className="text-foreground">{weatherData.temperature}°C</span>
            <span className="text-muted-foreground normal-case font-medium tracking-normal">
              {weatherData.condition}
            </span>
          </div>
          <span
            className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-bold uppercase tracking-wider ${
              weatherData.isImpactful
                ? "bg-destructive/15 text-destructive border-destructive/30"
                : "bg-success/15 text-success border-success/30"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {weatherData.riskLevel} Risk
          </span>
        </>
      ) : (
        <span className="w-full text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/50 border border-border rounded-md px-2.5 py-1.5">
          Weather unavailable
        </span>
      )}
    </div>
  </div>
</div>;
```

This drops the two `hidden sm:block w-px bg-border` divider elements and all `order-*` utilities — JSX order now matches visual order directly (title row, then metadata row with left/right groups), so there's no risk of a divider stranding itself outside its pair (a documented past failure in this file).

- [ ] **Step 2: Start the dev server and visually confirm no console errors**

```bash
npm run dev
```

Open the Portal via the landing page's "Portal Access" button, sign in (test creds: `toby@opusform.co.uk`), navigate to Job Ledger → any job with a long site name (e.g. "Manchester College - Openshaw Campus"). Confirm the page renders with no console errors and the title appears above the metadata row.

- [ ] **Step 3: Commit**

```bash
git add src/opus/components/JobDetails.tsx
git commit -m "refactor(portal): job header — title gets full-width row"
```

---

### Task 2: Attachments panel — align section headings to sentence-case pattern

**Files:**

- Modify: `src/opus/components/MediaTab.tsx:137-139`
- Modify: `src/opus/components/MediaTab.tsx:265-267`

**Interfaces:** None — className-only edits, no signature changes.

- [ ] **Step 1: Fix the "Site Before & After" heading**

In `src/opus/components/MediaTab.tsx`, find:

```tsx
<h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Site Before & After</h2>
```

Replace with:

```tsx
<h2 className="text-sm font-bold text-foreground">Site Before &amp; After</h2>
```

- [ ] **Step 2: Fix the "Project Attachments" heading**

In the same file, find:

```tsx
<h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Project Attachments</h2>
```

Replace with:

```tsx
<h2 className="text-sm font-bold text-foreground">Project Attachments</h2>
```

- [ ] **Step 3: Verify in browser**

With the dev server still running, navigate to a job's Attachments tab. Confirm both column headings now render in sentence case (`Site Before & After`, `Project Attachments`) matching the Overview panel's "Scheduled Pours" heading weight/size, not small-caps.

- [ ] **Step 4: Commit**

```bash
git add src/opus/components/MediaTab.tsx
git commit -m "style(portal): align attachments panel headings to sentence-case pattern"
```

---

### Task 3: Suppliers panel — align section labels to sentence-case pattern

**Files:**

- Modify: `src/opus/components/JobOverviewTab.tsx:29-34`
- Modify: `src/opus/components/JobOverviewTab.tsx:66-68`

**Interfaces:** None — className-only edits, no signature changes.

- [ ] **Step 1: Fix the map column label**

In `src/opus/components/JobOverviewTab.tsx`, find:

```tsx
<div className="flex items-center gap-2">
  <MapPin className="w-4 h-4 text-destructive" />
  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
    Live Site Proximity Matrix
  </span>
</div>
```

Replace with:

```tsx
<div className="flex items-center gap-2">
  <MapPin className="w-4 h-4 text-destructive" />
  <span className="text-sm font-bold text-foreground">Site Proximity Map</span>
</div>
```

- [ ] **Step 2: Fix the supplier list label**

In the same file, find:

```tsx
<div className="text-[12px] text-muted-foreground font-bold uppercase tracking-wider mb-4">
  Closest Local Suppliers
</div>
```

Replace with:

```tsx
<div className="text-sm font-bold text-foreground mb-4">Closest Local Suppliers</div>
```

- [ ] **Step 3: Verify in browser**

Navigate to a job's Suppliers tab. Confirm both labels now render at `text-sm font-bold text-foreground` (matching Overview's heading treatment), not small uppercase tracked text. Confirm the map still renders and supplier list still scrolls/selects as before (no behavior change).

- [ ] **Step 4: Commit**

```bash
git add src/opus/components/JobOverviewTab.tsx
git commit -m "style(portal): align suppliers panel labels to sentence-case pattern"
```

---

### Task 4: Full breakpoint verification pass

**Files:** None modified — verification only.

**Interfaces:** None.

- [ ] **Step 1: Resize through every width in the spec's matrix, on every tab**

With the dev server running and a job open (use the same long-title job from Task 1), for each width in `[375, 414, 640, 768, 1024, 1280, 1440, 1920]`:

1. Resize the browser pane to that width.
2. For each tab (`Overview`, `Attachments`, `Suppliers`, `Billing`, `History`), click into it and screenshot.
3. Check: title stays on one line where there's room (or clamps cleanly to 2 lines without overflow); metadata chip row wraps without clipping; tab bar stays icon-only and doesn't crowd/overflow; no horizontal scrollbar appears anywhere; Attachments/Suppliers/Billing/History all visually match Overview's spacing and heading weight.

This is 8 widths × 5 tabs = 40 checks. Log any failure with the exact width + tab it occurred at.

- [ ] **Step 2: Fix any failures found**

If a check fails, identify which Task's change (or pre-existing code) caused it, fix inline, and re-run Step 1 for that width/tab combination only (not the full matrix) to confirm the fix.

- [ ] **Step 3: Final commit**

Only if Step 2 required fixes:

```bash
git add -A
git commit -m "fix(portal): resolve breakpoint issues found in verification pass"
```

If no fixes were needed, nothing to commit — the plan is complete.

---

## Self-Review

**Spec coverage:**

- Header restructure (spec §1) → Task 1. ✓
- Tabs row unchanged (spec §2) → no task needed, confirmed unchanged by construction. ✓
- Non-Overview tab visual alignment (spec §3) → Task 0 (Billing/History already conform) + Task 2 (Attachments) + Task 3 (Suppliers). ✓
- Breakpoint test matrix (spec Testing section) → Task 4. ✓

**Placeholder scan:** No TBD/TODO — every step has exact file paths, exact before/after code, exact commands.

**Type consistency:** N/A — no new functions/types introduced, only JSX/className edits to existing components.
