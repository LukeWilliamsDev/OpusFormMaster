# Design Audit: RosterView.tsx

**Component:** `src/opus/components/RosterView.tsx`  
**Type:** Large composite component (2528 lines)  
**Audit Date:** 2026-07-29  
**Status:** ORIGINAL/EDITOR/CRITIC analysis complete — ready for application

---

## ORIGINAL — Current Design Patterns

### 1. **Worker Cards — Grid & Row Variants (Duplicated Logic)**

**Mobile Grid Card** (`renderMobileWorkerCard`):

```tsx
<div className="bg-card hover:bg-secondary border border-border rounded-2xl p-4 flex flex-col justify-between gap-3 cursor-pointer transition-all duration-150">
  <div className="flex items-center space-x-3 min-w-0">
    <div
      className={`w-9 h-9 rounded-full border flex items-center justify-center font-semibold text-[12px] tracking-wide shrink-0 ${avatarBorderColorClasses}`}
    >
      {initials.toUpperCase()}
    </div>
    <div className="min-w-0">
      <h4 className="text-[14px] font-bold text-foreground tracking-wide truncate">
        {worker.name}
      </h4>
      <span className="text-[11px] text-muted-foreground font-medium block mt-0.5 truncate">
        {worker.role}
      </span>
    </div>
  </div>
  <div className="flex items-center gap-2 pt-3 border-t border-border">
    <span
      className={`px-2 py-0.5 rounded text-[9.5px] font-semibold tracking-wider uppercase ${badgeColorClasses}`}
    >
      {statusText}
    </span>
    {ticketCount > 0 && ticketCount !== expiredCount && (
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium tracking-wide">
        <FileText className="w-3 h-3" /> {ticketCount} {ticketCount === 1 ? "ticket" : "tickets"}
      </span>
    )}
  </div>
</div>
```

**Desktop Row Card** (`renderWorkerRow`):

```tsx
<div className="bg-card hover:bg-secondary border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-4 cursor-pointer transition-all duration-150">
  <div className="flex items-center gap-3 min-w-0">
    <div
      className={`w-9 h-9 rounded-full border flex items-center justify-center font-semibold text-[12px] tracking-wide shrink-0 ${avatarBorderColorClasses}`}
    >
      {initials.toUpperCase()}
    </div>
    <div className="min-w-0">
      <h4 className="text-[14px] font-bold text-foreground tracking-wide truncate">
        {worker.name}
      </h4>
      <span className="text-[11px] text-muted-foreground font-medium block truncate">
        {worker.role}
      </span>
    </div>
  </div>
  <div className="flex items-center gap-3 shrink-0">
    {ticketCount > 0 && ticketCount !== expiredCount && (
      <span className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground font-medium tracking-wide">
        <FileText className="w-3 h-3" /> {ticketCount} {ticketCount === 1 ? "ticket" : "tickets"}
      </span>
    )}
    <span
      className={`px-2 py-0.5 rounded text-[9.5px] font-semibold tracking-wider uppercase whitespace-nowrap ${badgeColorClasses}`}
    >
      {statusText}
    </span>
  </div>
</div>
```

**CRITIC FEEDBACK:** Two nearly identical card implementations (mobile grid + desktop row) with duplicated status logic, badge classes, avatar logic. Should be unified.

---

### 2. **Tabs Navigation — Standard Pattern**

```tsx
<div className="flex border-b border-border pb-0 gap-6 mb-4">
  <button
    className={`pb-3 text-[11px] font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeDossierTab === "general" ? "border-brand-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
  >
    Compliance
  </button>
  <button
    className={`pb-3 text-[11px] font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeDossierTab === "assignments" ? "border-brand-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
  >
    Site Assignments
  </button>
  {canViewAuditLog && <button className={`...`}>Audit Log</button>}
</div>
```

**CRITIC FEEDBACK:** Generic tabs, no icons, no visual hierarchy between primary/secondary tabs.

---

### 3. **Card-Based Lists — Repeated 4+ Times**

**Ticket Cards** (Compliance tab):

```tsx
<div
  className={`flex flex-col gap-2 sm:grid sm:grid-cols-12 sm:gap-2 bg-secondary p-2 rounded-xl border border-border ${cardBg}`}
>
  <div className="sm:col-span-5">
    <input
      type="text"
      value={ticket.type}
      className="w-full bg-transparent border-none text-[10px] font-bold text-foreground uppercase px-1 py-1 focus:ring-0"
    />
  </div>
  <div className="flex items-center gap-2 sm:contents">
    <div className="flex-1 sm:col-span-5">
      <input
        type="date"
        className="w-full bg-transparent border-none text-[10px] text-muted-foreground px-1 py-1 focus:ring-0"
      />
    </div>
    <button className="sm:col-span-2 text-red-500 hover:text-red-400 flex items-center justify-center shrink-0">
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>
</div>
```

**Shift Cards** (Assignments tab):

```tsx
<div className="bg-card border border-border rounded-xl p-4 space-y-3">
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-medium text-foreground">{job?.siteName}</h3>
    <span className="text-xs font-mono font-bold text-muted-foreground">
      {formatDateRange(dates)}
    </span>
  </div>
  <div className="space-y-1">
    {dates.map((date) => (
      <div key={date} className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="w-3.5 h-3.5 shrink-0" />
        <span>{getDayName(date)}</span>
      </div>
    ))}
  </div>
</div>
```

---

### 4. **Forms — Repetitive Structure (3 Major Forms)**

**Add Worker Form:**

```tsx
<form onSubmit={handleAddWorkerSubmit} className="space-y-6">
  <div className="flex flex-col">
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xl flex-1 flex flex-col h-full">
      <div className="p-3 sm:p-4 pb-3 sm:pb-4 border-b border-white/5 bg-secondary flex items-center space-x-3 shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
          General Information
        </span>
      </div>
      <div className="p-3 sm:p-4 space-y-4">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
            Full Name
          </label>
          <input
            type="text"
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-[11px] font-medium text-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
            Role
          </label>
          <select className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-[11px] font-medium text-foreground focus:outline-none focus:border-primary transition-colors uppercase font-bold" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label>Phone</label>
            <input type="tel" />
          </div>
          <div>
            <label>Email</label>
            <input type="email" />
          </div>
        </div>
      </div>
    </div>
  </div>
</form>
```

**Edit Worker Form** — Nearly identical structure with ticket sub-forms.

---

### 5. **ConfirmDialogs — Repeated 7+ Times**

```tsx
<ConfirmDialog
  open={!!ticketToRemove}
  onOpenChange={(open) => {
    if (!open) setTicketToRemove(null);
  }}
  tone="destructive"
  title="Remove Compliance Record"
  message={
    ticketToRemove &&
    selectedWorkerDetails && (
      <>
        Are you sure you want to remove{" "}
        <span className="font-bold text-foreground">{ticketToRemove.type}</span> from{" "}
        <span className="font-bold text-foreground">{selectedWorkerDetails.name}</span>'s compliance
        record?
        <br />
        <br />
        This permanently deletes the ticket entry. This cannot be undone from here — the worker will
        need to re-upload the document if it's still required.
      </>
    )
  }
  confirmLabel="Remove"
  onConfirm={() => {
    removeTicket(selectedWorkerDetailsId!, ticketToRemove!);
    setTicketToRemove(null);
  }}
/>
```

**CRITIC FEEDBACK:** 7+ identical ConfirmDialogs with only message/title differences. No domain personality.

---

### 6. **Status Badges — Repetitive Logic**

```tsx
// Mobile card
if (expiredCount > 0) {
  statusText = `${expiredCount} EXPIRED`;
  badgeColorClasses = "bg-destructive/10 border border-destructive/30 text-destructive font-bold";
} else if (expiringCount > 0) {
  statusText = "EXPIRING";
  badgeColorClasses = "bg-warning/15 border border-warning/30 text-warning font-bold";
} else if (ticketCount === 0) {
  statusText = "NO TICKETS";
  badgeColorClasses = "bg-muted border border-border text-muted-foreground font-bold";
} else {
  statusText = "ALL CLEAR";
  badgeColorClasses = "bg-success/10 border border-success/30 text-success font-bold";
}
```

**CRITIC FEEDBACK:** Logic duplicated between mobile/row renderers. Colors are generic semantic (success/warning/destructive) — no domain personality.

---

### 7. **Empty States — Generic**

```tsx
{selectedWorkerDetails.tickets.length === 0 ? (
  <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
    No compliance certificates or tickets registered
  </div>
) : (...)}

{paginatedEvents.length === 0 ? (
  <div className="p-8 text-center text-xs font-mono text-muted-foreground">No logs matching filters.</div>
) : ...}

{events.length === 0 && (
  <div className="text-xs text-muted-foreground py-8 text-center uppercase tracking-wider">No notes yet</div>
)}
```

**CRITIC FEEDBACK:** All empty states use same generic pattern — no illustrations, no CTAs, no domain context.

---

### 8. **Avatar/Initials — Repeated 4 Times**

```tsx
const nameParts = worker.name.split(" ");
const initials =
  nameParts.length > 1 ? `${nameParts[0][0]}${nameParts[1][0]}` : `${nameParts[0][0] || ""}`;
<div
  className={`w-9 h-9 rounded-full border flex items-center justify-center font-semibold text-[12px] tracking-wide shrink-0 ${avatarBorderColorClasses}`}
>
  {initials.toUpperCase()}
</div>;
```

---

### 9. **Tabs — Standard Underline Style**

```tsx
<TabsList className="w-full grid grid-cols-4">
  <TabsTrigger
    value="overview"
    aria-label="Overview"
    className="flex items-center justify-center gap-1 px-1.5"
  >
    <LayoutGrid className="w-3.5 h-3.5 shrink-0" /> <span className="text-[11px]">Overview</span>
  </TabsTrigger>
  <TabsTrigger
    value="media"
    aria-label="Media"
    className="flex items-center justify-center gap-1 px-1.5"
  >
    <Paperclip className="w-3.5 h-3.5 shrink-0" /> <span className="text-[11px]">Media</span>
  </TabsTrigger>
  <TabsTrigger
    value="suppliers"
    aria-label="Local Suppliers"
    className="flex items-center justify-center gap-1 px-1.5"
  >
    <MapPin className="w-3.5 h-3.5 shrink-0" /> <span className="text-[11px]">Suppliers</span>
  </TabsTrigger>
  <TabsTrigger
    value="history"
    aria-label="History"
    className="flex items-center justify-center gap-1 px-1.5"
  >
    <History className="w-3.5 h-3.5 shrink-0" /> <span className="text-[11px]">History</span>
  </TabsTrigger>
</TabsList>
```

---

### 10. **Tables — Divide-y Border Pattern**

```tsx
<div className="divide-y divide-border px-4">
  {paginatedLogs.map((log) => {
    return (
      <div
        key={log.id}
        onClick={() => setSelectedLog(log)}
        className="flex gap-4 py-4 cursor-pointer hover:bg-white/[0.02] transition-all px-2 rounded-lg"
      >
        <div className={`w-2.5 h-2.5 rounded-full ${bulletColor} mt-1.5 shrink-0`} />
        <div className="flex-1">
          <div className="text-[14px] font-semibold text-white">{friendlyEventName}</div>
          <div className="text-[12px] text-muted-foreground mt-1">
            {log.user_email || "system"} · {new Date(log.created_at).toLocaleString("en-GB")}
          </div>
        </div>
      </div>
    );
  })}
</div>
```

---

## EDITOR — Domain-Specific Personality Enhancements

### Color System: Concrete/Flooring Industry Palette

```css
:root {
  /* Primary: Concrete Amber — warm, industrial, authoritative */
  --concrete-amber: #d97706;
  --concrete-amber-light: #fde68a;
  --concrete-amber-dark: #b45309;

  /* Secondary: Steel Stone — cool, structural */
  --steel-stone: #475569;
  --steel-stone-light: #94a3b8;
  --steel-stone-dark: #1e293b;

  /* Success: Cured Green — cured concrete */
  --cured-green: #059669;
  --cured-green-light: #6ee7b7;

  /* Warning: Safety Yellow — high-vis */
  --safety-yellow: #eab308;

  /* Destructive: Rebar Rust — exposed rebar */
  --rebar-rust: #dc2626;

  /* Surface: Formwork Gray */
  --formwork: #f8fafc;
  --formwork-dark: #0f172a;
}
```

---

### 1. **Worker Cards: Site Badge Design**

**Mobile Grid Card — Site Badge Style:**

```tsx
<div className="relative bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 rounded-xl p-4 flex flex-col justify-between gap-3 cursor-pointer transition-all duration-200 hover:shadow-[0_8px_20px_-5px_rgb(217_119_6_/_0.15)] hover:-translate-y-0.5">
  {/* Status ribbon — top right */}
  <div className="absolute top-2 right-2 z-10">
    <span
      className={cn(
        "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border shrink-0",
        status === "EXPIRED" && "bg-red-600 text-white border-red-500",
        status === "EXPIRING" && "bg-amber-500 text-white border-amber-400",
        status === "PENDING" &&
          "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500",
        status === "ACTIVE" && "bg-emerald-600 text-white border-emerald-500",
        status === "NO_TICKETS" &&
          "bg-stone-200 dark:bg-slate-700 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-slate-600",
      )}
    >
      {statusText}
    </span>
  </div>

  {/* Main content */}
  <div className="flex items-center space-x-3 min-w-0">
    {/* Avatar — concrete pour circle */}
    <div
      className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-[13px] tracking-wide shrink-0 border-2",
        status === "EXPIRED" &&
          "bg-red-500/10 dark:bg-red-900/20 border-red-500/30 text-red-600 dark:text-red-400",
        status === "EXPIRING" &&
          "bg-amber-500/10 dark:bg-amber-900/20 border-amber-500/30 text-amber-700 dark:text-amber-300",
        status === "PENDING" &&
          "bg-amber-500/10 dark:bg-amber-900/20 border-amber-500/30 text-amber-700 dark:text-amber-300",
        status === "ACTIVE" &&
          "bg-emerald-500/10 dark:bg-emerald-900/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
        status === "NO_TICKETS" &&
          "bg-stone-100 dark:bg-slate-800 border-stone-300 dark:border-slate-600 text-stone-600 dark:text-stone-400",
      )}
    >
      {initials.toUpperCase()}
    </div>

    <div className="min-w-0">
      <h4 className="text-[15px] font-black text-slate-900 dark:text-white tracking-wide truncate">
        {worker.name}
      </h4>
      <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5 truncate">
        {worker.role}
      </span>
    </div>
  </div>

  {/* Footer — ticket count + action */}
  <div className="flex items-center gap-2 pt-3 border-t border-stone-200 dark:border-slate-700">
    <span className="text-[11px] text-slate-400 font-medium tracking-wide flex items-center gap-1">
      <FileText className="w-3.5 h-3.5" />
      {ticketCount} {ticketCount === 1 ? "ticket" : "tickets"}
    </span>
    <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-400">
      Tap to view dossier
    </span>
  </div>
</div>
```

**Domain touches:**

- Status ribbon (site safety tag style)
- Concrete pour circle avatar with status-colored border
- "Tap to view dossier" — site supervisor language
- Emerald for active (cured), Amber for pending (setting), Red for expired (failed cure)

---

### 2. **Tabs: Site Navigation Bar**

```tsx
<div className="bg-white/5 dark:bg-slate-900/50 backdrop-blur-sm border-b border-stone-200 dark:border-slate-700">
  <div className="max-w-7xl mx-auto px-4 sm:px-6">
    <div className="flex gap-1 p-1 rounded-xl bg-stone-100 dark:bg-slate-800/50">
      {/* Primary tabs — core workflow */}
      <TabsTrigger value="compliance" className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
        activeDossierTab === "compliance"
          ? "bg-white dark:bg-slate-800 shadow-sm text-amber-700 dark:text-amber-300"
          : "text-stone-500 hover:text-stone-700 dark:text-slate-400 hover:text-white"
      )}>
        <ClipboardCheck className="w-4 h-4" />
        <span className="hidden sm:inline">Compliance</span>
      </TabsTrigger>

      <TabsTrigger value="assignments" className={cn(...)}>
        <MapPin className="w-4 h-4" />
        <span className="hidden sm:inline">Assignments</span>
      </TabsTrigger>

      {/* Secondary tab — grouped */}
      {canViewAuditLog && (
        <TabsTrigger value="audit_log" className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
          activeDossierTab === "audit_log"
            ? "bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400"
            : "text-slate-400 hover:text-slate-600"
        )}>
          <History className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Audit</span>
        </TabsTrigger>
      )}
    </TabsList>
  </Tabs>
</div>
```

**Domain touches:**

- Primary tabs = core workflow (compliance, assignments) — prominent
- Secondary tab (audit) — de-emphasized
- Icons: ClipboardCheck (compliance), MapPin (site assignments), History (audit)
- Amber accent for active state (concrete brand)

---

### 3. **Ticket Cards: Concrete Delivery Ticket**

```tsx
<div className={cn(
  "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-xl transition-all",
  status === "EXPIRED"
    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-50/50"
    : status === "PENDING" || status === "EXPIRING_SOON"
      ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:bg-amber-50/50"
      : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50/50"
)}>
  <div className="flex items-center gap-3 min-w-0">
    {/* Status icon + type */}
    <div className={cn(
      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
      status === "EXPIRED" && "bg-red-100 dark:bg-red-900/30",
      status === "PENDING" && "bg-amber-100 dark:bg-amber-900/30",
      status === "EXPIRING_SOON" && "bg-amber-50 dark:bg-amber-900/20",
      status === "ACTIVE" && "bg-emerald-100 dark:bg-emerald-900/30"
    )}>
      <Icon className={cn("w-5 h-5", status === "EXPIRED" && "text-red-600", ...)} />
    </div>

    <div className="space-y-1 min-w-0">
      <div className="flex items-center flex-wrap gap-2 text-sm font-bold text-slate-900 dark:text-white">
        <span className="text-lg">{ticket.type}</span>
        <span className={cn(
          "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border shrink-0",
          status === "EXPIRED" && "bg-red-100 dark:bg-red-900/30 text-red-600 border-red-200",
          status === "PENDING" && "bg-amber-100 dark:bg-amber-900/30 text-amber-700 border-amber-200",
          status === "EXPIRING_SOON" && "bg-amber-100 dark:bg-amber-900/30 text-amber-700 border-amber-200",
          status === "ACTIVE" && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 border-emerald-200",
        )}>
          {statusText}
        </span>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
        {ticket.mixType || "C35/45"} · {ticket.volumeM3}m³
      </div>
      {ticket.notes && (
        <div className="text-[13px] text-slate-500/80 dark:text-slate-400/80 italic truncate max-w-[280px]">
          {ticket.notes}
        </div>
      )}
    </div>
  </div>

  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
    <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
      {formatDate(ticket.expiryDate)}
    </div>
    <button
      onClick={() => setEditNoteText(ticket.notes || ""); setPourNoteTarget(ticket)}
      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      aria-label={`Edit notes for ${ticket.type}`}
    >
      <PencilLine className="w-4 h-4" />
    </button>
    <button
      onClick={() => setPourToRemove(ticket)}
      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      aria-label={`Remove ${ticket.type}`}
    >
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
</div>
```

**Domain touches:**

- Status = delivery ticket colors (Red=expired/rejected, Amber=pending/setting, Emerald=delivered/cured)
- Volume in m³, mix type (C35/45 etc.) — concrete terminology
- Ticket = delivery ticket / pour record

---

### 4. **Forms: Concrete Batch Ticket Aesthetic**

```tsx
<form className="space-y-6 p-6 bg-stone-50 dark:bg-slate-900/50 border border-stone-200 dark:border-slate-700 rounded-2xl">
  <fieldset className="border-b border-stone-200 dark:border-slate-700 pb-6">
    <legend className="text-xs font-black uppercase tracking-widest text-stone-600 dark:text-stone-400 mb-4">
      WORKER DETAILS
    </legend>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label className="block text-[11px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-1">
          FULL NAME
        </label>
        <input
          type="text"
          className="w-full bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
        />
      </div>

      <div>
        <label className="block text-[11px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-1">
          MIX DESIGN
        </label>
        <select className="w-full bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer">
          <option value="C28/35">C28/35 — Foundation</option>
          <option value="C32/40">C32/40 — Structural</option>
          <option value="C35/45">C35/45 — Heavy Structural</option>
          <option value="C40/50">C40/50 — High Strength</option>
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-1">
          VOLUME (m³)
        </label>
        <input
          type="number"
          step="0.5"
          min="1"
          className="w-full bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-mono text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
        />
      </div>
    </div>
  </fieldset>

  <div className="flex justify-end pt-2">
    <button
      type="button"
      className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
    >
      CANCEL
    </button>
    <button
      type="submit"
      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-lg shadow-amber-600/20"
    >
      SCHEDULE POUR
    </button>
  </div>
</form>
```

**Domain touches:**

- Fieldset legend = "WORKER DETAILS" (site sign-in sheet style)
- "MIX DESIGN" instead of "Role" — concrete terminology
- "VOLUME (m³)" — concrete volume
- Amber-600 primary button (concrete amber)
- Stone/amber color palette throughout

---

### 5. **Empty States: Site Context + CTA**

```tsx
// No tickets
<div className="py-12 text-center">
  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
    <ClipboardList className="w-8 h-8 text-amber-500" />
  </div>
  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No compliance tickets</p>
  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
    Schedule your first compliance upload to begin the worker's site passport
  </p>
  <button className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider">
    Add First Ticket
  </button>
</div>

// No shifts
<div className="py-12 text-center">
  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-100 dark:bg-slate-800 flex items-center justify-center">
    <Calendar className="w-8 h-8 text-stone-500" />
  </div>
  <p className="text-sm font-bold text-stone-700 dark:text-stone-300">No site assignments yet</p>
  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-xs mx-auto leading-relaxed">
    Add this worker to a job site to see their deployment history
  </p>
  <button className="mt-4 px-4 py-2 bg-stone-600 hover:bg-stone-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider">
    View Job Ledger
  </button>
</div>
```

---

### 6. **ConfirmDialogs: Site Safety Notice Style**

```tsx
<ConfirmDialog
  title="REMOVE POUR"
  message={
    <>
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-700 dark:text-slate-300">
          <p className="font-bold">Remove Pour #{pourNumber}?</p>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            This will permanently delete the pour record from the delivery log.
            {isCompleted &&
              " This pour was marked as delivered — removing it will adjust the site pour count."}
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
  confirmButtonClassName="bg-red-600 hover:bg-red-700 text-white"
/>
```

### 7. **Status Badge: Site Safety Tag Style**

```tsx
const JobStatusBadge = ({ status, pours, maxPours }) => {
  const configs = {
    "in-progress": {
      bg: "bg-amber-600",
      text: "text-white",
      icon: <Truck className="w-3 h-3" />,
      label: `ACTIVE — ${pours}/${maxPours} POURS`,
    },
    pending: {
      bg: "bg-stone-500",
      text: "text-white",
      icon: <Clock className="w-3 h-3" />,
      label: `PENDING — ${maxPours} POURS PLANNED`,
    },
    completed: {
      bg: "bg-emerald-600",
      text: "text-white",
      icon: <CheckCircle className="w-3 h-3" />,
      label: `COMPLETE — ${pours}/${maxPours} POURS DELIVERED`,
    },
  };
  const cfg = configs[status] || configs.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border uppercase ${cfg.bg} ${cfg.text} border-white/20`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
};
```

### 8. **Audit Revert: Concrete Variance Report Style**

```tsx
<div className="bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 rounded-2xl divide-y divide-stone-200 dark:divide-stone-700">
  <div className="px-4 py-3 bg-stone-100 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-700">
    <h3 className="text-xs font-black uppercase tracking-widest text-stone-600 dark:text-stone-400">
      VARIANCE REPORT — JOB REVERT
    </h3>
  </div>
  {fields.map((f) => (
    <div
      key={f}
      className={`px-4 py-3 flex items-center justify-between ${changed ? "bg-amber-50 dark:bg-amber-900/20 border-l-2 border-amber-500" : ""}`}
    >
      <span
        className={`text-xs font-bold uppercase tracking-widest ${changed ? "text-amber-700 dark:text-amber-300" : "text-stone-500"}`}
      >
        {JOB_FIELD_LABELS[f]}
      </span>
      <div className="flex items-center gap-2 text-right">
        {changed && newVal != null && (
          <span className="line-through text-stone-400 text-[12px]">{newVal}</span>
        )}
        {changed && <span className="text-stone-400 text-[11px]">→</span>}
        <span
          className={`font-bold ${changed ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"}`}
        >
          {oldVal}
        </span>
      </div>
    </div>
  ))}
</div>
```

### 9. **Micro-Interactions**

```css
/* Pour card hover */
.pour-card {
  @apply transition-all duration-200;
}
.pour-card:hover {
  @apply -translate-y-0.5 shadow-lg;
  box-shadow:
    0 10px 25px -5px rgb(217 119 6 / 0.2),
    0 8px 10px -6px rgb(217 119 6 / 0.1);
}

/* Button press */
.btn-concrete:active {
  @apply scale-[0.98];
}

/* Status badge pulse for active */
@keyframes pulse-amber {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgb(217 119 6 / 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgb(217 119 6 / 0);
  }
}
.status-active {
  animation: pulse-amber 2s infinite;
}

/* Pour toggle check animation */
@keyframes check-pop {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
.pour-toggle.checking .check-icon {
  animation: check-pop 0.3s ease-out;
}
```

---

## CRITIC FEEDBACK

| Aspect                    | Original                  | Editor                                                | Critic Assessment                                      |
| ------------------------- | ------------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| **Visual Identity**       | Generic SaaS (slate/gray) | Concrete/Flooring (amber/stone/emerald)               | **Strong improvement** — domain personality throughout |
| **Information Hierarchy** | Flat tabs, equal weight   | Primary/secondary tabs, site identity header          | **Significant** — core workflow (pours) emphasized     |
| **Data Density**          | Good                      | Better — pour cards show mix/volume/date at glance    | **Improved** — less clicking for key info              |
| **Empty States**          | Generic text              | Contextual with illustrations + CTAs                  | **Major** — guides user to action                      |
| **Forms**                 | Generic inputs            | Batch ticket fieldset + amber focus, mix descriptions | **Strong** — domain language throughout                |
| **Status Badges**         | Generic pills             | Safety tag style, pour progress, icons                | **Clear** — instant recognition                        |
| **Confirm Dialogs**       | Generic warnings          | Safety notice style, context-aware                    | **Safety-critical** — appropriate gravity              |
| **Pour Cards**            | Generic cards             | Delivery ticket (scheduled) / Receipt (completed)     | **Domain-native** — matches real workflow              |
| **Micro-interactions**    | None                      | Hover lift, amber pulse, check pop, amber focus       | **Polish** — feels alive and responsive                |
| **Color Palette**         | Slate/Blue                | Amber/Stone/Emerald/Rust (concrete site colors)       | **Authentic** — matches industry                       |

**Risk Areas:**

- Color contrast on amber backgrounds — verify WCAG AA
- Amber focus rings — ensure visible in light/dark
- Truck icon for scheduled — ensure recognizable at small sizes
- Audit revert UI complexity — may need progressive disclosure

---

## APPLY — Implementation Priority

1. **Color System** — Create CSS variables for amber/stone/emerald palette
2. **Worker Cards** — Highest impact, core workflow
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

---

**Estimated Effort:** 2-3 days for full component overhaul  
**Dependencies:** CSS variable system, icon additions (Truck, Building2, etc.)  
**Testing:** Light/dark mode, responsive, accessibility (WCAG AA)  
**Rollout:** Feature flag for gradual deployment
