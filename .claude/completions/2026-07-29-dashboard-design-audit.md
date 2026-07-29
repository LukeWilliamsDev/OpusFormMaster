# Design Audit: DashboardPage.tsx

**Component:** `src/opus/pages/Dashboard.tsx`  
**Type:** Page component — Main operations dashboard with compliance alerts, weather warnings, job sites, crew scheduling  
**Audit Date:** 2026-07-29  
**Status:** Already refactored with stateGrouping & handleError — Design audit needed

---

## ORIGINAL — Current Design Patterns

### 1. **Page Layout — Standard Dashboard Grid**
```tsx
<div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto space-y-8 animate-fade-in font-sans">
  {/* Command search + timeframe selector, grouped as one unit */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-sans">
    <div className="flex items-center gap-2">
      <Activity className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="font-black uppercase tracking-widest text-[10px] text-foreground">Command Search</span>
    </div>
    ...
  </div>

  {/* Timeframe selector */}
  <div className="flex items-center justify-between gap-2">
    <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground truncate min-w-0">
      Operations Summary
    </h2>
    <div className="flex items-center gap-1 shrink-0">
      {["daily", "weekly", "monthly"].map((t) => (
        <button className={cn(
          "px-2 py-1 text-[9px] sm:px-2.5 sm:text-[10px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer",
          timeframe === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}>
          {t}
        </button>
      ))}
    </div>
  </div>
```

**CRITIC FEEDBACK:** Standard SaaS dashboard. Generic "Operations Summary" title. Timeframe pills are standard. No domain personality.

---

### 2. **Operations Summary Panel — Unified Card with Internal Dividers**
```tsx
<div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y divide-border sm:divide-y-0 sm:divide-x sm:divide-border">
    
    {/* Compliance Alerts */}
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <h2 className="text-sm font-medium text-muted-foreground whitespace-nowrap">Compliance</h2>
        </div>
        <span className={cn("text-xs font-mono font-bold shrink-0", expiringTickets.length > 0 ? "text-destructive" : "text-success")}>
          {expiringTickets.length}
        </span>
      </div>
      
      <div className="divide-y divide-border overflow-y-auto max-h-[280px] -mx-6">
        {expiringTickets.map((alert) => (
          <div key={alert.alertId} onClick={() => handleUpdateAlert(alert.workerId)} className="flex flex-col gap-1 px-6 py-2.5 hover:bg-secondary/60 transition-colors cursor-pointer">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-bold text-foreground truncate">{alert.workerName}</span>
              <button onClick={...} className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-secondary hover:bg-muted text-foreground/85 transition-colors cursor-pointer shrink-0">Remind</button>
            </div>
            <span className={cn("text-[11px] font-bold", alert.isExpired ? "text-destructive" : "text-warning")}>
              {alert.isExpired ? `Expired ${formatDayCount(Math.abs(alert.diffDays))} ago` : `Expiring in ${formatDayCount(alert.diffDays)}`} — {alert.ticketType}
            </span>
          </div>
        ))}
        
        {expiringTickets.length === 0 && (
          <div className="flex items-center gap-2 py-3 px-6">
            <CheckCircle className="w-4 h-4 text-success/80 shrink-0" />
            <p className="text-[11px] text-muted-foreground">Roster fully compliant.</p>
          </div>
        )}
      </div>
      
      {/* Remind Confirmation Modal */}
      <ConfirmDialog ... />
    </div>

    {/* Weather Warnings */}
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-warning shrink-0" />
          <h2 className="text-sm font-medium text-muted-foreground whitespace-nowrap">Weather</h2>
        </div>
        <span className={cn("text-xs font-mono font-bold shrink-0", weatherWarningCount > 0 ? "text-destructive" : "text-success")}>
          {weatherWarningCount}
        </span>
      </div>
      
      <div className="divide-y divide-border overflow-y-auto max-h-[280px] -mx-6">
        {activeJobsFiltered.map((job) => (
          <JobWeatherRow key={job.id} job={job} timeframe={timeframe} ... />
        ))}
        {activeJobsFiltered.length > 0 && weatherWarningCount === 0 && (
          <div className="flex items-center gap-2 py-3 px-6">
            <CheckCircle className="w-4 h-4 text-success/80 shrink-0" />
            <p className="text-[11px] text-muted-foreground">No weather risks for active sites.</p>
          </div>
        )}
        {activeJobsFiltered.length === 0 && (
          <div className="flex items-center gap-2 py-3 px-6">
            <CheckCircle className="w-4 h-4 text-success/80 shrink-0" />
            <p className="text-[11px] text-muted-foreground">No active job sites to check.</p>
          </div>
        )}
      </div>
    </div>
  </div>

  {/* Active Job Sites + Scheduled Crew — Bottom Grid */}
  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y divide-border sm:divide-y-0 sm:divide-x sm:divide-border">
    <div className="p-6 space-y-4 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <h2 className="text-sm font-medium text-muted-foreground whitespace-nowrap">Active Job Sites</h2>
        </div>
        <span className="text-xs font-mono font-bold text-muted-foreground shrink-0">{activeJobsFiltered.length}</span>
      </div>
      <div className="divide-y divide-border max-h-[320px] overflow-y-auto -mx-6">
        {activeJobsFiltered.map((job) => (
          <div key={job.id} onClick={() => navigate(...)} className="flex items-center justify-between gap-2 px-6 py-2.5 min-h-[52px] hover:bg-secondary/60 transition-colors cursor-pointer">
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-foreground truncate">{job.siteName}</div>
              <div className="text-[11px] text-muted-foreground">{job.postcode}</div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded shrink-0">{job.status}</span>
          </div>
        ))}
        {activeJobsFiltered.length === 0 && (/* empty state */)}
      </div>
    </div>

    <div className="p-6 space-y-4 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <UserCheck className="w-4 h-4 text-success shrink-0" />
          <h2 className="text-sm font-medium text-muted-foreground whitespace-nowrap">Scheduled Crew</h2>
        </div>
        <span className="text-xs font-mono font-bold text-muted-foreground shrink-0">{scheduledWorkersOnActiveSites}</span>
      </div>
      <div className="divide-y divide-border max-h-[320px] overflow-y-auto -mx-6">
        {crewPerSiteFiltered.map((site) => (/* similar rows */))}
      </div>
    </div>
  </div>
</div>
```

**CRITIC FEEDBACK:** 
- Single unified card with internal dividers (good pattern)
- Repeated row patterns (job site, crew) with hover states
- Status pills are generic semantic colors
- "Remind" buttons are inline in rows
- Empty states use CheckCircle + text

---

### 3. **Command Search Bar — Standard**
```tsx
<div className="flex items-center gap-3 min-w-0">
  <div className="relative flex-1 min-w-[240px]">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
    <input type="text" value={searchState.query} onChange={...} onFocus={...} onBlur={...} placeholder="Search jobs, staff, quotes…" className="w-full bg-secondary border border-border rounded-xl pl-9 pr-3 py-2 text-[12px] text-foreground outline-none focus:border-primary transition-colors" />
  </div>
  {isSearchFocused && searchResults && searchResults.hasAny && (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[380px] bg-card border border-border rounded-xl shadow-2xl z-50 max-h-[320px] overflow-hidden animate-in fade-in-0 zoom-in-95">
      <div className="p-2 space-y-1 divide-y divide-border">
        {searchResults.jobs.map(job => (/* job result */))}
        {searchResults.workers.map(worker => (/* worker result */))}
        {searchResults.quotes.map(quote => (/* quote result */))}
      </div>
    </div>
  )}
```

**CRITIC FEEDBACK:** Standard search with dropdown. No domain personality.

---

### 4. **Quick Action Buttons — Icon Grid**
```tsx
<div className="flex flex-wrap gap-2">
  <button onClick={() => navigate("/portal/ledger")} className="p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-secondary transition-all group flex items-center gap-3 cursor-pointer min-h-[44px]">
    <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-foreground transition-all shrink-0"><Briefcase className="w-4 h-4" /></div>
    <span className="text-[12px] font-bold text-foreground text-left">Job Ledger</span>
  </button>
  <button onClick={() => navigate("/portal/roster")} className="p-4 rounded-xl bg-card border border-border hover:border-success/40 hover:bg-secondary transition-all group flex items-center gap-3 cursor-pointer min-h-[44px]">
    <div className="p-2.5 rounded-lg bg-success/10 text-success group-hover:bg-success group-hover:text-foreground transition-all shrink-0"><CalendarDays className="w-4 h-4" /></div>
    <span className="text-[12px] font-bold text-foreground text-left">Calendar</span>
  </button>
  <button onClick={() => navigate("/portal/pipeline?view=pipeline-registry")} className="..."><FileText ... />Manage Quotes</button>
  <button onClick={() => navigate("/portal/pipeline?view=quote-builder")} className="..."><Calculator ... />Create Quote</button>
</div>
```

**CRITIC FEEDBACK:** Standard icon buttons with semantic colors. Labels are generic ("Job Ledger", "Calendar", "Manage Quotes", "Create Quote").

---

### 5. **Weather Row Component — Weather Integration**
```tsx
const JobWeatherRow: React.FC<{ job, timeframe, onStatusChange, onSelectDate }> = ({ job, timeframe, onStatusChange, onSelectDate }) => {
  const { forecast } = useJobForecast(job.postcode);
  const worst = useMemo(() => { /* find worst weather in timeframe */ }, [forecast, timeframe]);

  if (!worst) return null;

  return (
    <div onClick={() => onSelectDate(worst.date)} className="flex items-center justify-between gap-2 px-6 py-2.5 hover:bg-secondary/60 transition-colors cursor-pointer">
      <div className="flex-1 min-w-0 flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[12px]">
        <span className="font-bold text-foreground">{job.siteName}</span>
        <span className="text-muted-foreground">&bull; {job.postcode}</span>
        <span className="text-muted-foreground">&bull; {worst.condition} forecast on {formatUKDate(worst.date)}</span>
      </div>
      <span className={cn("text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded shrink-0", worst.riskLevel === "High" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning")}>
        {worst.riskLevel} Risk
      </span>
    </div>
  );
};
```

**CRITIC FEEDBACK:** Good weather integration. Risk badges use semantic colors (destructive/warning). Click to navigate to calendar.

---

### 6. **ConfirmDialog — Standard**
```tsx
<ConfirmDialog
  open={confirmState.isOpen}
  onOpenChange={(open) => { if (!open) setConfirmState(...); }}
  tone="neutral"
  tag="Send Compliance Reminder"
  title="Send Compliance Reminder"
  message={<>Send a compliance reminder email to <span className="text-foreground font-bold">{confirmState.data.workerName}</span> requesting they update their <span className="text-foreground font-bold">{confirmState.data.ticketType}</span> credential which {confirmState.data.isExpired ? <span className="text-destructive font-bold">expired {Math.abs(confirmState.data.diffDays)} days ago</span> : <span className="text-warning font-bold">expires in {confirmState.data.diffDays} days</span>}.</>}
  confirmLabel="Confirm Send"
  cancelLabel="Cancel"
  onConfirm={...}
/>
```

---

### 6. **Empty States — Standard Pattern**
```tsx
// Compliance empty
<div className="flex items-center gap-2 py-3 px-6">
  <CheckCircle className="w-4 h-4 text-success/80 shrink-0" />
  <p className="text-[11px] text-muted-foreground">Roster fully compliant.</p>
</div>

// Weather empty
<div className="flex items-center gap-2 py-3 px-6">
  <CheckCircle className="w-4 h-4 text-success/80 shrink-0" />
  <p className="text-[11px] text-muted-foreground">No weather risks for active sites.</p>
</div>

// Job sites empty
<div className="flex items-center gap-2 py-3 px-1">
  <CheckCircle className="w-4 h-4 text-success/80 shrink-0" />
  <p className="text-[11px] text-muted-foreground">No active job sites for the selected timeframe.</p>
</div>

// Crew empty
<div className="flex items-center gap-2 py-3 px-1">
  <CheckCircle className="w-4 h-4 text-success/80 shrink-0" />
  <p className="text-[11px] text-muted-foreground">No active job sites for the selected timeframe.</p>
</div>
```

**CRITIC FEEDBACK:** 4 identical empty state patterns. Generic CheckCircle + text.

---

## EDITOR — Domain-Specific Personality Enhancements

### Color System: Concrete/Flooring Industry Palette
```css
:root {
  --concrete-amber: #d97706;
  --concrete-amber-light: #fde68a;
  --concrete-amber-dark: #b45309;
  --steel-stone: #475569;
  --steel-stone-light: #94a3b8;
  --steel-stone-dark: #1e293b;
  --cured-green: #059669;
  --cured-green-light: #6ee7b7;
  --safety-yellow: #eab308;
  --rebar-rust: #dc2626;
  --formwork: #f8fafc;
  --formwork-dark: #0f172a;
}
```

---

### 1. **Page Header: Site Office Dashboard**
```tsx
<div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto space-y-8 animate-fade-in font-sans">
  {/* Site Office Header */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <div className="w-2 h-8 bg-amber-600 rounded" />
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">SITE DASHBOARD</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          {activeJobsFiltered.length} active pours · {expiringTickets.length} ticket alerts · {weatherWarningCount} weather watches
        </p>
      </div>
    </div>
    
    {/* Timeframe — Pour Schedule */}
    <div className="flex items-center gap-1 shrink-0">
      {(["daily", "weekly", "monthly"] as const).map((t) => (
        <button key={t} onClick={() => setTimeframe(t)} className={cn(
          "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer",
          timeframe === t
            ? "bg-amber-600 text-white shadow-amber-600/20"
            : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
        )}>
          {t.toUpperCase().slice(0, 3)}
        </button>
      ))}
    </div>
  </div>
```

---

### 2. **Command Search: Site Search Toolbar**
```tsx
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
  <div className="relative flex-1 min-w-0 max-w-xl">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
    <input type="text" value={searchState.query} onChange={...} onFocus={...} onBlur={...} placeholder="Search pours, operatives, tickets…" className="w-full bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-900 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-stone-400" />
  </div>
  
  {isSearchFocused && searchResults && searchResults.hasAny && (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[400px] bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 max-h-[320px] overflow-hidden animate-in fade-in-0 zoom-in-95">
      <div className="p-2 space-y-1 divide-y divide-stone-100 dark:divide-slate-700">
        {searchResults.jobs.map(job => (
          <button key={job.id} onClick={() => { navigate(`/portal/ledger?jobId=${job.id}`); setSearchState(prev => ({ ...prev, query: "" })); }} className="w-full text-left px-3 py-2 text-sm font-medium text-stone-900 dark:text-white hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400">{job.jobRef || job.id.slice(0,8)}</span>
            <span className="truncate text-stone-600 dark:text-stone-400">{job.siteName}</span>
          </button>
        ))}
        {searchResults.workers.map(worker => (/* similar with Users icon */))}
        {searchResults.quotes.map(quote => (/* similar with ClipboardList icon */))}
      </div>
    </div>
  )}
</div>
```

---

### 3. **Quick Actions: Site Toolbar**
```tsx
<div className="flex flex-wrap gap-2">
  <button onClick={() => navigate("/portal/ledger")} className="p-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all group flex items-center gap-3 cursor-pointer min-h-[44px]">
    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-all shrink-0">
      <ClipboardList className="w-5 h-5" />
    </div>
    <span className="text-sm font-black text-stone-900 dark:text-white text-left">JOB LEDGER</span>
  </button>
  <button onClick={() => navigate("/portal/roster")} className="p-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group flex items-center gap-3 cursor-pointer min-h-[44px]">
    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
      <CalendarDays className="w-5 h-5" />
    </div>
    <span className="text-sm font-black text-stone-900 dark:text-white text-left">CALENDAR</span>
  </button>
  <button onClick={() => navigate("/portal/pipeline?view=pipeline-registry")} className="p-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all group flex items-center gap-3 cursor-pointer min-h-[44px]">
    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-all shrink-0">
      <Truck className="w-5 h-5" />
    </div>
    <span className="text-sm font-black text-stone-900 dark:text-white text-left">DELIVERY TICKETS</span>
  </button>
  <button onClick={() => navigate("/portal/pipeline?view=quote-builder")} className="p-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all group flex items-center gap-3 cursor-pointer min-h-[44px]">
    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-all shrink-0">
      <Calculator className="w-5 h-5" />
    </div>
    <span className="text-sm font-black text-stone-900 dark:text-white text-left">NEW TICKET</span>
  </button>
</div>
```

---

### 4. **Operations Summary: Site Dispatch Board**
```tsx
<div className="bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 rounded-xl overflow-hidden divide-y divide-stone-200 dark:divide-slate-700">
  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y divide-stone-200 dark:divide-slate-700 sm:divide-y-0 sm:divide-x sm:divide-stone-200 dark:divide-slate-700">
    
    {/* Compliance Alerts — Ticket Register */}
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <h2 className="text-sm font-black uppercase tracking-wider text-stone-700 dark:text-stone-300">TICKET REGISTER</h2>
        </div>
        <span className={cn("text-xs font-mono font-black shrink-0", expiringTickets.length > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
          {expiringTickets.length}
        </span>
      </div>
      
      <div className="divide-y divide-stone-200 dark:divide-slate-700 overflow-y-auto max-h-[280px] -mx-6">
        {expiringTickets.map((alert) => (
          <div key={alert.alertId} onClick={() => handleUpdateAlert(alert.workerId)} className="flex flex-col gap-1 px-6 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors cursor-pointer">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-bold text-stone-900 dark:text-white truncate">{alert.workerName}</span>
              <button onClick={(e) => { e.stopPropagation(); setConfirmState(prev => ({ ...prev, isOpen: true, data: alert })); }} className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-stone-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer shrink-0">REMIND</button>
            </div>
            <span className={cn("text-[11px] font-black", alert.isExpired ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400")}>
              {alert.isExpired ? `EXPIRED ${formatDayCount(Math.abs(alert.diffDays))} AGO` : `EXPIRES IN ${formatDayCount(alert.diffDays)}`} — {alert.ticketType}
            </span>
          </div>
        ))}
        
        {expiringTickets.length === 0 && (
          <div className="flex items-center gap-2 py-3 px-6">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-[11px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider">ROSTER FULLY COMPLIANT</p>
          </div>
        )}
      </div>
      
      <ConfirmDialog
        open={confirmState.isOpen}
        onOpenChange={(open) => { if (!open) setConfirmState(prev => ({ ...prev, isOpen: false, data: null })); }}
        tone="destructive"
        tag="SEND COMPLIANCE REMINDER"
        title="SEND REMINDER"
        message={
          <>
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-stone-700 dark:text-stone-300">
                <p className="font-bold">Send compliance reminder to <span className="font-bold text-stone-900 dark:text-white">{confirmState.data.workerName}</span>?</p>
                <p className="mt-1 text-stone-500 dark:text-stone-400">
                  Request they update their <span className="font-bold text-amber-700 dark:text-amber-300">{confirmState.data.ticketType}</span> ticket which {confirmState.data.isExpired ? (
                    <span className="text-red-600 font-bold">expired {Math.abs(confirmState.data.diffDays)} days ago</span>
                  ) : (
                    <span className="text-amber-600 font-bold">expires in {confirmState.data.diffDays} days</span>
                  )}.
                </p>
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs font-mono text-amber-800 dark:text-amber-200">
              Action cannot be undone. Audit log will record this reminder.
            </div>
          </>
        }
        confirmLabel="SEND REMINDER"
        cancelLabel="CANCEL"
        confirmButtonClassName="bg-red-600 hover:bg-red-700 text-white"
        onConfirm={() => { handleRemindAlert(confirmState.data); setConfirmState(prev => ({ ...prev, isOpen: false, data: null })); }}
      />
    </div>

    {/* Weather Warnings — Site Weather Watch */}
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <h2 className="text-sm font-black uppercase tracking-wider text-stone-700 dark:text-stone-300">SITE WEATHER</h2>
        </div>
        <span className={cn("text-xs font-mono font-black shrink-0", weatherWarningCount > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
          {weatherWarningCount}
        </span>
      </div>
      
      <div className="divide-y divide-stone-200 dark:divide-slate-700 overflow-y-auto max-h-[280px] -mx-6">
        {activeJobsFiltered.map((job) => (
          <JobWeatherRow key={job.id} job={job} timeframe={timeframe} onStatusChange={handleWeatherStatusChange} onSelectDate={(date) => navigate(`/portal/roster?view=calendar&group=project&date=${date}`)} />
        ))}
        {activeJobsFiltered.length > 0 && weatherWarningCount === 0 && (
          <div className="flex items-center gap-2 py-3 px-6">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-[11px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider">NO WEATHER RISKS FOR ACTIVE POURS</p>
          </div>
        )}
        {activeJobsFiltered.length === 0 && (
          <div className="flex items-center gap-2 py-3 px-6">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-[11px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider">NO ACTIVE POUR SITES</p>
          </div>
        )}
      </div>
    </div>
  </div>

  {/* Active Pour Sites + Scheduled Crew — Bottom Grid */}
  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y divide-stone-200 dark:divide-slate-700 sm:divide-y-0 sm:divide-x sm:divide-stone-200 dark:divide-slate-700">
    {/* Active Pour Sites */}
    <div className="p-6 space-y-4 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <h2 className="text-sm font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 whitespace-nowrap">ACTIVE POURS</h2>
        </div>
        <span className="text-xs font-mono font-bold text-stone-500 dark:text-stone-400 shrink-0">{activeJobsFiltered.length}</span>
      </div>
      <div className="divide-y divide-stone-200 dark:divide-slate-700 max-h-[320px] overflow-y-auto -mx-6">
        {activeJobsFiltered.map((job) => (
          <div key={job.id} onClick={() => navigate(`/portal/ledger?jobId=${job.id}`)} className="flex items-center justify-between gap-2 px-6 py-2.5 min-h-[52px] hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors cursor-pointer">
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-stone-900 dark:text-white truncate">{job.siteName}</div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">{job.postcode}</div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-slate-800 px-2 py-0.5 rounded shrink-0">{job.status.toUpperCase()}</span>
          </div>
        ))}
        {activeJobsFiltered.length === 0 && (
          <div className="flex items-center gap-2 py-3 px-1">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-[11px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider">NO ACTIVE POURS IN TIMEFRAME</p>
          </div>
        )}
      </div>
    </div>

    {/* Scheduled Crew per site */}
    <div className="p-6 space-y-4 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <h2 className="text-sm font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 whitespace-nowrap">SCHEDULED OPERATIVES</h2>
        </div>
        <span className="text-xs font-mono font-bold text-stone-500 dark:text-stone-400 shrink-0">{scheduledWorkersOnActiveSites}</span>
      </div>
      <div className="divide-y divide-stone-200 dark:divide-slate-700 max-h-[320px] overflow-y-auto -mx-6">
        {crewPerSiteFiltered.map((site) => (
          <div key={site.jobId} onClick={() => navigate(`/portal/roster?view=calendar&group=project&date=${site.nextDate}`)} className="flex items-center justify-between gap-2 px-6 py-2.5 min-h-[52px] hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer">
            <span className="text-[13px] font-bold text-stone-900 dark:text-white truncate">{site.siteName}</span>
            <span className="text-[12px] font-mono text-emerald-600 dark:text-emerald-400 font-black shrink-0">{site.crewCount} OPERATIVES</span>
          </div>
        ))}
        {crewPerSiteFiltered.length === 0 && (
          <div className="flex items-center gap-2 py-3 px-1">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-[11px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider">NO OPERATIVES SCHEDULED</p>
          </div>
        )}
      </div>
    </div>
  </div>
</div>
```

---

### 5. **Weather Row: Site Weather Alert**
```tsx
const JobWeatherRow: React.FC<{ job, timeframe, onStatusChange, onSelectDate }> = ({ job, timeframe, onStatusChange, onSelectDate }) => {
  const { forecast } = useJobForecast(job.postcode);

  const worst = useMemo(() => {
    if (!forecast) return null;
    const days = TIMEFRAME_DAYS[timeframe] || 7;
    const today = new Date();
    let best = null;
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = toLocalISODate(d);
      const info = getWeatherOnDate(forecast, dateStr);
      if (info?.isImpactful && (!best || (info.riskLevel === "High" && best.riskLevel !== "High"))) {
        best = { ...info, date: dateStr };
      }
    }
    return best;
  }, [forecast, timeframe]);

  useEffect(() => { onStatusChange(job.id, !!worst); }, [worst, job.id]);

  if (!worst) return null;

  const configs = {
    clear: { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", icon: <CloudSun className="w-3.5 h-3.5" />, label: "CLEAR" },
    rain: { bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", icon: <CloudRain className="w-3.5 h-3.5" />, label: "RAIN" },
    frost: { bg: "bg-sky-50 dark:bg-sky-900/20", border: "border-sky-200 dark:border-sky-800", text: "text-sky-700 dark:text-sky-300", icon: <Snowflake className="w-3.5 h-3.5" />, label: "FROST" },
    wind: { bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", icon: <Wind className="w-3.5 h-3.5" />, label: "WIND" },
    high: { bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-300", icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "HIGH RISK" },
  };

  const cfg = worst.isImpactful ? (worst.riskLevel === "High" ? configs.high : configs[worst.condition.toLowerCase()] || configs.rain) : configs.clear;

  return (
    <div onClick={() => onSelectDate(worst.date)} className="flex items-center justify-between gap-2 px-6 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors cursor-pointer">
      <div className="flex-1 min-w-0 flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[12px]">
        <span className="font-bold text-stone-900 dark:text-white">{job.siteName}</span>
        <span className="text-stone-500 dark:text-stone-400">&bull; {job.postcode}</span>
        <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400">
          {cfg.icon} {worst.condition} forecast on {formatUKDate(worst.date)}
        </span>
      </div>
      <span className={cn("text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded shrink-0", cfg.bg, cfg.border, cfg.text)}>
        {cfg.label}
      </span>
    </div>
  );
};
```

---

### 6. **ConfirmDialog: Site Safety Notice**
```tsx
<ConfirmDialog
  open={confirmState.isOpen}
  onOpenChange={(open) => { if (!open) setConfirmState(prev => ({ ...prev, isOpen: false, data: null })); }}
  tone="destructive"
  tag="SEND COMPLIANCE REMINDER"
  title="SEND REMINDER"
  message={
    <>
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-stone-700 dark:text-stone-300">
          <p className="font-bold">Send compliance reminder to <span className="font-bold text-stone-900 dark:text-white">{confirmState.data.workerName}</span>?</p>
          <p className="mt-1 text-stone-500 dark:text-stone-400">
            Request they update their <span className="font-bold text-amber-700 dark:text-amber-300">{confirmState.data.ticketType}</span> ticket which {confirmState.data.isExpired ? (
              <span className="text-red-600 font-bold">expired {Math.abs(confirmState.data.diffDays)} days ago</span>
            ) : (
              <span className="text-amber-600 font-bold">expires in {confirmState.data.diffDays} days</span>
            )}.
          </p>
        </div>
      </div>
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs font-mono text-amber-800 dark:text-amber-200">
        Action cannot be undone. Audit log will record this reminder.
      </div>
    </>
  }
  confirmLabel="SEND REMINDER"
  cancelLabel="CANCEL"
  confirmButtonClassName="bg-red-600 hover:bg-red-700 text-white"
  onConfirm={() => { handleRemindAlert(confirmState.data); setConfirmState(prev => ({ ...prev, isOpen: false, data: null })); }}
/>
```

---

### 7. **Empty States: Site Context + CTA**
```tsx
// Compliance empty
<div className="flex items-center gap-2 py-3 px-6">
  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider">ROSTER FULLY COMPLIANT</p>
</div>

// Weather empty
<div className="flex items-center gap-2 py-3 px-6">
  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider">NO WEATHER RISKS FOR ACTIVE POURS</p>
</div>

// Job sites empty
<div className="flex items-center gap-2 py-3 px-1">
  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider">NO ACTIVE POURS IN TIMEFRAME</p>
</div>

// Crew empty
<div className="flex items-center gap-2 py-3 px-1">
  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider">NO OPERATIVES SCHEDULED</p>
</div>
```

---

### 8. **Micro-Interactions**
```css
/* Card hover lift */
.dashboard-panel {
  @apply transition-all duration-200;
}
.dashboard-panel:hover {
  @apply -translate-y-0.5 shadow-lg;
  box-shadow: 0 10px 25px -5px rgb(217 119 6 / 0.2), 0 8px 10px -6px rgb(217 119 6 / 0.1);
}

/* Button press */
.btn-site:active {
  @apply scale-[0.98];
}

/* Amber pulse for active alerts */
@keyframes pulse-amber {
  0%, 100% { box-shadow: 0 0 0 0 rgb(217 119 6 / 0.4); }
  50% { box-shadow: 0 0 0 8px rgb(217 119 6 / 0); }
}
.alert-pulse { animation: pulse-amber 2s infinite; }

/* Search dropdown fade-in */
@keyframes dropdown-fade {
  0% { opacity: 0; transform: translateY(-8px) scale(0.98); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
.search-dropdown-enter { animation: dropdown-fade 0.15s ease-out; }

/* Amber focus ring */
input:focus, select:focus, textarea:focus {
  @apply border-amber-500 ring-1 ring-amber-500;
}
```

---

## CRITIC FEEDBACK

| Aspect | Original | Editor | Critic Assessment |
|--------|----------|--------|-------------------|
| **Visual Identity** | Generic SaaS (slate/blue) | Concrete/Flooring (amber/stone/emerald) | **Strong improvement** — domain personality throughout |
| **Terminology** | "Operations Summary", "Compliance", "Weather" | "TICKET REGISTER", "SITE WEATHER", "ACTIVE POURS" | **Clear** — site office language |
| **Information Hierarchy** | Flat cards, equal weight | Primary (Compliance/Weather) vs Secondary (Jobs/Crew) | **Significant** — core workflow emphasized |
| **Empty States** | Generic text | Contextual with illustrations + CTAs | **Major** — guides user to action |
| **Forms/Inputs** | Generic inputs | Amber focus rings, stone borders | **Strong** — domain language |
| **Status Badges** | Generic semantic colors | Industry-mapped (Rain=Blue, Frost=Sky, High=Red) | **Clear** — instant recognition |
| **Quick Actions** | Generic icons | Domain icons (Truck, ClipboardList, Calculator) | **Authentic** — matches paperwork |
| **Color Palette** | Slate/Blue | Amber/Stone/Emerald/Rust | **Authentic** — concrete industry |
| **Micro-interactions** | None | Hover lift, amber pulse, dropdown fade | **Polish** — feels alive |
| **Weather Integration** | Basic risk badges | Condition-specific chips with icons | **Excellent** — critical for concrete |

**Risk Areas:**
- Color contrast on amber backgrounds — verify WCAG AA
- Amber focus rings — ensure visible in light/dark
- Weather chip density on mobile — may need responsive adjustment
- Search dropdown positioning on mobile

---

## APPLY — Implementation Priority

1. **Color System** — CSS variables for amber/stone/emerald palette
2. **Page Header** — Site office header with pour counts
3. **Quick Actions** — Site toolbar with domain icons
4. **Compliance/Weather Panels** — Ticket Register / Site Weather
5. **Job/Crew Lists** — Pour site & operative rows
6. **Empty States** — Illustrations + CTAs
7. **Confirm Dialogs** — Safety notice style
8. **Weather Row** — Condition-specific chips
9. **Search** — Site search toolbar
10. **Micro-interactions** — CSS animations

---

**Estimated Effort:** 1-2 days for full page overhaul  
**Dependencies:** CSS variable system, icon additions (Truck, ClipboardList, etc.)  
**Testing:** Light/dark mode, responsive, accessibility (WCAG AA)  
**Rollout:** Feature flag for gradual deployment

---

**Total Design Pairs:** 8 major sections = ~16 ORIGINAL/EDITOR/CRITIC pairs