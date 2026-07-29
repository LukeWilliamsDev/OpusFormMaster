# Design Audit: JobDetails.tsx

**Component:** `src/opus/components/JobDetails.tsx`  
**Type:** Large composite component (1344 lines)  
**Audit Date:** 2026-07-29  
**Status:** ORIGINAL/EDITOR/CRITIC analysis pending application

---

## ORIGINAL — Current Design Patterns

### 1. **Tabs Navigation (Standard)**
```tsx
<Tabs defaultValue="pours">
  <TabsList className="grid w-full grid-cols-5">
    <TabsTrigger value="pours">Pours</TabsTrigger>
    <TabsTrigger value="feed">Feed</TabsTrigger>
    <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
    <TabsTrigger value="media">Media</TabsTrigger>
    <TabsTrigger value="history">History</TabsTrigger>
  </TabsList>
```
- **Pattern:** Standard horizontal tabs, 5 equal columns
- **Visual:** Underline indicator, no icons
- **Critique:** Generic, no domain personality. No visual hierarchy between primary/secondary tabs.

### 2. **Persistent Header (JobDetails specific)**
```tsx
<PersistentJobHeader
  job={job}
  status={status}
  setPendingStatus={setPendingStatus}
  executeStatusChange={executeStatusChange}
  pendingStatus={pendingStatus}
/>
```
- **Pattern:** Sticky header with job reference, site name, status pills
- **Visual:** Status buttons with colored backgrounds (primary/success/warning)
- **Critique:** Good persistence, but status buttons are generic Bootstrap-style pills

### 3. **Card Grid / List Patterns (Repeated 8+ times)**

#### Empty State Pattern (Repeated):
```tsx
{pourLogs.length === 0 && (
  <div className="py-8 text-center text-xs text-muted-foreground uppercase tracking-wider">
    No pours logged yet
  </div>
)}
```
- **Variations:** "No pours logged yet", "No notes yet", "No documents uploaded yet"
- **Critique:** Inconsistent messaging, no icon, generic empty state

#### Card Layout (Pour Logs):
```tsx
<div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-xl transition-all ${
  isCompleted
    ? "bg-card border-border hover:bg-secondary"
    : "bg-warning/5 border-warning/20 hover:bg-warning/10"
}`}
```
- **Pattern:** Conditional background colors (completed vs scheduled)
- **Critique:** Good visual distinction, but card structure is generic

### 4. **Form Patterns (Repeated 4+ times)**

#### Add Pour Form:
```tsx
<form onSubmit={handleAddPourSubmit} className="mb-4 p-4 bg-background border border-border rounded-lg space-y-4">
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div>
      <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
        Expected Date
      </label>
      <input type="date" ... className="w-full bg-card border border-border text-xs text-foreground rounded-lg px-3 py-2 outline-none font-mono" />
    </div>
    {/* Mix Type select, Volume number input */}
  </div>
  <div>
    <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
      Pour Notes
    </label>
    <input type="text" ... className="w-full bg-card border border-border text-xs text-foreground rounded-lg px-3 py-2 outline-none" />
  </div>
  <div className="flex justify-end">
    <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg text-xs cursor-pointer">
      Schedule Pour
    </button>
  </div>
</form>
```
- **Pattern:** Label above input, uppercase tracking-wider labels, grid layout for fields
- **Variations:** Job edit form, pour notes form, rename attachment
- **Critique:** Repetitive form structure, generic styling

### 5. **Status/Action Badges (Repeated)**

#### Job Status Pills:
```tsx
const isActive = status === s;
return (
  <button
    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
      isActive
        ? activeClasses
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`}
  >
    <Icon className="w-3.5 h-3.5 shrink-0" />
    {label}
  </button>
);
```
- **Colors:** Primary (active), Success (completed), Warning (pending)
- **Critique:** Generic pill pattern, no domain-specific styling

#### Pour Status Toggle:
```tsx
<button
  className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
    isCompleted
      ? "bg-success/15 border-success/30 text-success hover:bg-success/25"
      : "border-border text-transparent hover:border-primary hover:bg-primary/10"
  }`}
>
  <Check className="w-3.5 h-3.5" />
</button>
```
- **Pattern:** Circle toggle with check icon
- **Critique:** Invisible when unchecked (text-transparent), confusing UX

### 6. **Icon Button Patterns (Repeated 10+ times)**

```tsx
<button
  type="button"
  aria-label={`Edit notes for pour ${log.pourNumber}`}
  onClick={() => { setEditNoteText(log.notes || ""); setPourNoteTarget(log); }}
  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
>
  <PencilLine className="w-4 h-4" />
</button>

<button
  type="button"
  aria-label={`Remove pour ${log.pourNumber}`}
  onClick={() => setPourToRemove(log)}
  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
>
  <Trash2 className="w-4 h-4" />
</button>
```
- **Pattern:** p-1.5 rounded-lg, hover:bg-secondary, Trash2/PencilLine icons
- **Critique:** Extremely repetitive, no micro-interactions

### 7. **Confirm Dialog Pattern (Repeated 6+ times)**

```tsx
<ConfirmDialog
  open={!!pourToRemove}
  onOpenChange={(open) => { if (!open) setPourToRemove(null); }}
  tone="destructive"
  title="Remove Pour"
  message={pourToRemove && (
    <>
      Are you sure you want to remove <span className="font-bold text-foreground">Pour #{pourToRemove.pourNumber}</span>?
      <br /><br />
      This action cannot be undone.
    </>
  )}
  confirmLabel="Remove"
  onConfirm={executeRemovePour}
/>
```
- **Variations:** Remove pour, delete attachment, archive worker, permanent delete, revert job
- **Critique:** Identical structure, generic messaging

### 8. **Audit Log Revert UI (Unique but Complex)**

```tsx
<div className="bg-muted/40 border border-border rounded-lg divide-y divide-border text-[12px] mt-3">
  {JOB_REVERTIBLE_FIELDS.filter(f => revertConfirmTarget.oldDetails?.[f] !== undefined).map(f => {
    const changed = rawOldVal !== rawNewVal;
    return (
      <div key={f} className={`flex items-center justify-between px-4 py-2.5 ${
        changed ? "bg-amber-500/5 border-l-2 border-amber-500/40" : ""
      }`}>
        <span className={changed ? "text-amber-400/70" : "text-muted-foreground"}>
          {JOB_FIELD_LABELS[f]}
        </span>
        <div className="flex items-center gap-2 text-right">
          {changed && newVal != null && <span className="line-through text-muted-foreground">{newVal}</span>}
          {changed && <span className="text-muted-foreground">→</span>}
          <span className={changed ? "text-amber-300" : "text-foreground"}>
            {oldVal}
          </span>
        </div>
      </div>
    );
  })}
</div>
```
- **Pattern:** Diff view with amber highlighting for changes
- **Critique:** Good information density, but styling is generic

---

## EDITOR — Domain-Specific Personality Enhancements

### 1. **Navigation: Concrete Industry Tab Bar**
Replace generic tabs with domain-aware navigation:
- **Primary tabs** (core workflow): Pours, Feed, Media → larger, more prominent
- **Secondary tabs** (supporting): Suppliers, History → smaller, grouped
- **Visual:** Concrete-textured background, pour-count badges on Pours tab
- **Icons:** Concrete mixer for Pours, Clipboard for Feed, Camera for Media, Building for Suppliers, Clock for History

### 2. **Persistent Header: Site Identity Card**
```tsx
// Instead of generic status pills
<div className="bg-gradient-to-r from-stone-900 to-stone-800 border border-stone-700 rounded-xl p-4">
  <div className="flex items-center justify-between">
    <div>
      <span className="text-xs font-mono text-stone-400 uppercase tracking-widest">Site Reference</span>
      <h1 className="text-xl font-black text-white">{job.jobRef}</h1>
      <p className="text-stone-300">{job.siteName} · {job.postcode}</p>
    </div>
    <JobStatusBadge status={status} pours={currentPours}/{contractMaxPours} />
  </div>
</div>
```
- **Domain:** Concrete batch ticket aesthetic
- **Data:** Pour progress as fractional (3/12 pours) not percentage

### 3. **Pour Cards: Concrete Delivery Ticket Design**

```tsx
// Scheduled pour = Delivery ticket (white on amber)
<div className="bg-gradient-to-r from-amber-900 to-amber-800 border border-amber-700 rounded-xl p-4 relative overflow-hidden">
  <div className="absolute top-2 right-2">
    <span className="bg-amber-600/20 border border-amber-500 text-amber-200 px-2 py-0.5 rounded text-[10px] font-mono uppercase">
      SCHEDULED
    </span>
  </div>
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
      <Truck className="w-5 h-5 text-amber-200" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 text-white font-bold">
        <span className="text-lg">Pour #{pourNumber}</span>
        <span className="text-[11px] bg-white/20 px-1.5 py-0.5 rounded">C35/45</span>
      </div>
      <div className="text-amber-100 text-sm font-mono">{volumeM3}m³ · {formatDate(date)}</div>
      {notes && <div className="text-amber-200/80 text-xs italic mt-1">{notes}</div>}
    </div>
    <PourToggleButton pourNumber={pourNumber} completed={false} />
  </div>
</div>

// Completed pour = Delivery receipt (green on dark)
<div className="bg-gradient-to-r from-emerald-900 to-emerald-800 border border-emerald-700 rounded-xl p-4">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
      <CheckCircle className="w-5 h-5 text-emerald-200" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 text-white font-bold">
        <span className="text-lg">Pour #{pourNumber}</span>
        <span className="text-[11px] bg-emerald-600 px-1.5 py-0.5 rounded">DELIVERED</span>
      </div>
      <div className="text-emerald-100 text-sm font-mono">{volumeM3}m³ · {formatDate(completedDate)}</div>
    </div>
    <div className="text-emerald-100/80 text-xs font-mono">{formatDate(date)}</div>
  </div>
</div>
```

**Domain Personality:**
- Scheduled = Amber "delivery ticket" (pre-pour paperwork)
- Completed = Emerald "delivery receipt" (post-pour confirmation)
- Truck icon for scheduled, CheckCircle for completed
- Volume in m³, mix type as badge

### 4. **Forms: Concrete Batch Ticket Aesthetic**

```tsx
<form className="space-y-4 p-4 bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 rounded-xl">
  <fieldset className="border-b border-stone-200 dark:border-stone-700 pb-4">
    <legend className="text-xs font-bold uppercase tracking-widest text-stone-600 dark:text-stone-400 mb-3">
      POUR DETAILS
    </legend>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-1">
          EXPECTED DATE
        </label>
        <input type="date" className="w-full bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
      </div>
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-1">
          MIX DESIGN
        </label>
        <select className="w-full bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer">
          <option value="C28/35">C28/35 — Foundation</option>
          <option value="C32/40">C32/40 — Structural</option>
          <option value="C35/45">C35/45 — Heavy Structural</option>
          <option value="C40/50">C40/50 — High Strength</option>
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-1">
          VOLUME (m³)
        </label>
        <input type="number" min="1" step="0.5" className="w-full bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
      </div>
    </div>
  </fieldset>
  <div className="flex justify-end pt-2">
    <button type="submit" className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-colors">
      SCHEDULE POUR
    </button>
  </div>
</form>
```

**Domain touches:**
- Fieldset with "POUR DETAILS" legend (batch ticket style)
- Amber-600 primary button (concrete amber)
- Mix design descriptions (C35/45 — Heavy Structural)
- Stone/amber color palette throughout

### 5. **Empty States: Concrete Site Context**

```tsx
// Instead of "No pours logged yet"
<div className="py-12 text-center">
  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
    <Truck className="w-8 h-8 text-amber-500" />
  </div>
  <p className="text-sm font-bold text-stone-700 dark:text-stone-300">No pours scheduled</p>
  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-xs mx-auto">
    Schedule your first concrete delivery to begin the pour log
  </p>
  <button className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider">
    Schedule First Pour
  </button>
</div>
```

### 6. **Action Buttons: Concrete Tool Aesthetic**

```tsx
// Primary action (amber concrete)
<button className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-colors">
  SCHEDULE POUR
</button>

// Secondary action (stone)
<button className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-900 dark:text-stone-100 font-bold rounded-lg text-xs uppercase tracking-wider transition-colors">
  CANCEL
</button>

// Destructive (rust red)
<button className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-colors">
  REMOVE POUR
</button>

// Icon actions (tool-style)
<button className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-300 transition-all">
  <PencilLine className="w-4 h-4" />
</button>
```

### 7. **Confirm Dialogs: Site Safety Notice Style**

```tsx
<ConfirmDialog
  title="REMOVE POUR"
  message={
    <>
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-stone-700 dark:text-stone-300">
          <p className="font-bold">Remove Pour #{pourNumber}?</p>
          <p className="mt-1 text-stone-500 dark:text-stone-400">
            This will permanently delete the pour record from the delivery log.
            {isCompleted && " This pour was marked as delivered — removing it will adjust the site pour count."}
          </p>
        </div>
      </div>
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs font-mono text-amber-800 dark:text-amber-200">
        Action cannot be undone. Audit log will record this removal.
      </div>
    </>
  }
  confirmLabel="REMOVE POUR"
  cancelLabel="KEEP POUR"
  confirmButtonClassName="bg-rose-600 hover:bg-rose-700 text-white"
/>
```

### 8. **Status Badge: Site Safety Tag Style**

```tsx
// Instead of generic pills
const JobStatusBadge = ({ status, pours, maxPours }) => {
  const configs = {
    "in-progress": { 
      bg: "bg-amber-600", 
      text: "text-white", 
      icon: <Truck className="w-3 h-3" />,
      label: `ACTIVE — ${pours}/${maxPours} POURS`
    },
    "pending": { 
      bg: "bg-stone-500", 
      text: "text-white", 
      icon: <Clock className="w-3 h-3" />,
      label: `PENDING — ${maxPours} POURS PLANNED`
    },
    "completed": { 
      bg: "bg-emerald-600", 
      text: "text-white", 
      icon: <CheckCircle className="w-3 h-3" />,
      label: `COMPLETE — ${pours}/${maxPours} POURS DELIVERED`
    },
  };
  const cfg = configs[status] || configs.pending;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};
```

### 9. **Audit Revert: Concrete Variance Report Style**

```tsx
<div className="bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 rounded-xl divide-y divide-stone-200 dark:divide-stone-700">
  <div className="px-4 py-3 bg-stone-100 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
    <h3 className="text-xs font-bold uppercase tracking-widest text-stone-600 dark:text-stone-400">
      VARIANCE REPORT — JOB REVERT
    </h3>
  </div>
  {fields.map(f => (
    <div key={f} className={`px-4 py-3 flex items-center justify-between ${changed ? "bg-amber-50 dark:bg-amber-900/20 border-l-2 border-amber-500" : ""}`}>
      <span className={`text-xs font-bold uppercase tracking-wider ${changed ? "text-amber-700 dark:text-amber-300" : "text-stone-500"}`}>
        {JOB_FIELD_LABELS[f]}
      </span>
      <div className="flex items-center gap-2 text-right">
        {changed && newVal != null && (
          <span className="line-through text-stone-400 text-[12px]">{newVal}</span>
        )}
        {changed && <span className="text-stone-400 text-[11px]">→</span>}
        <span className={`font-bold ${changed ? "text-amber-600 dark:text-amber-400" : "text-stone-900 dark:text-stone-100"}`}>
          {oldVal}
        </span>
      </div>
    </div>
  ))}
</div>
```

### 10. **Micro-Interactions**

```css
/* Pour card hover */
.pour-card {
  @apply transition-all duration-200;
}
.pour-card:hover {
  @apply -translate-y-0.5 shadow-lg;
  box-shadow: 0 10px 25px -5px rgb(217 119 6 / 0.2), 0 8px 10px -6px rgb(217 119 6 / 0.1);
}

/* Button press */
.btn-concrete:active {
  @apply scale-[0.98];
}

/* Status badge pulse for active */
@keyframes pulse-amber {
  0%, 100% { box-shadow: 0 0 0 0 rgb(217 119 6 / 0.4); }
  50% { box-shadow: 0 0 0 8px rgb(217 119 6 / 0); }
}
.status-active { animation: pulse-amber 2s infinite; }

/* Pour toggle check animation */
@keyframes check-pop {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
.pour-toggle.checking .check-icon { animation: check-pop 0.3s ease-out; }
```

---

## CRITIC FEEDBACK

| Aspect | Original | Editor | Critic Assessment |
|--------|----------|--------|-------------------|
| **Visual Identity** | Generic SaaS (slate/gray) | Concrete/Flooring (amber/stone/emerald) | **Strong improvement** — domain personality throughout |
| **Information Hierarchy** | Flat tabs, equal weight | Primary/secondary tabs, site identity header | **Significant** — core workflow (pours) emphasized |
| **Data Density** | Good | Better — pour cards show mix/volume/date at glance | **Improved** — less clicking for key info |
| **Empty States** | Generic text | Contextual with illustrations + CTAs | **Major** — guides user to action |
| **Forms** | Generic inputs | Batch ticket fieldset, amber focus, mix descriptions | **Strong** — domain language throughout |
| **Status Badges** | Generic pills | Safety tag style, pour progress, icons | **Clear** — instant recognition |
| **Confirm Dialogs** | Generic warnings | Safety notice style, context-aware | **Safety-critical** — appropriate gravity |
| **Pour Cards** | Generic cards | Delivery ticket (scheduled) / Receipt (completed) | **Domain-native** — matches real workflow |
| **Micro-interactions** | None | Hover lift, amber pulse, check pop, amber focus | **Polish** — feels alive and responsive |
| **Color Palette** | Slate/Blue | Amber/Stone/Emerald/Rust (concrete site colors) | **Authentic** — matches industry |

**Risk Areas:**
- Color contrast on amber backgrounds — verify WCAG AA
- Amber focus rings — ensure visible in light/dark
- Truck icon for scheduled — ensure recognizable at small sizes
- Audit revert UI complexity — may need progressive disclosure

---

## APPLY — Implementation Priority

1. **Color System** — Create CSS variables for amber/stone/emerald palette
2. **Pour Cards** — Highest impact, core workflow
3. **Forms** — Batch ticket fieldset + amber focus
4. **Status Badges** — Safety tag style
5. **Tabs** — Primary/secondary hierarchy + icons
6. **Empty States** — Illustrations + CTAs
7. **Confirm Dialogs** — Safety notice style
8. **Audit Revert** — Variance report
9. **Micro-interactions** — CSS animations
10. **Persistent Header** — Site identity card

---

**Estimated Effort:** 2-3 days for full component overhaul  
**Dependencies:** CSS variable system, icon additions (Truck, Building2, etc.)  
**Testing:** Light/dark mode, responsive, accessibility (WCAG AA)  
**Rollout:** Feature flag for gradual deployment