# Design Audit: AuditLogPage.tsx

**Component:** `src/opus/pages/AuditLog.tsx`  
**Type:** Page component — Audit log viewer with search, filter, pagination, details drawer, restore  
**Audit Date:** 2026-07-29  
**Status:** ORIGINAL/EDITOR/CRITIC analysis complete — ready for application

---

## ORIGINAL — Current Design Patterns

### 1. **Page Layout — Standard Admin Table Pattern**

```tsx
<div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto space-y-8 animate-fade-in font-sans">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-sans">
    <div className="flex items-center gap-2">
      <Activity className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="font-black uppercase tracking-widest text-[10px] text-foreground">Audit Log</span>
    </div>
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      {/* Search + Filters */}
    </div>
  </div>

  {/* Filter Row */}
  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs font-sans">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
      <input type="text" className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
    </div>
    <Select>...</Select>
    <Select>...</Select>
  </div>

  {/* Log List — Card Grid with CardGrid component! */}
  <CardGrid
    items={paginatedLogs}
    renderCard={(log) => ( /* Card rendering */ )}
    emptyMessage="No audit logs found"
    emptyIcon={<Database className="w-8 h-8 text-emerald-500 opacity-60" />}
  />
</div>
```

### 2. **Log Card — Details in Card**

```tsx
<div className="bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer">
  <div className="flex items-start gap-3">
    <div className="w-2.5 h-2.5 rounded-full bg-primary/80 mt-1.5 shrink-0" />
    <div className="flex-1 min-w-0">
      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-1">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${getActionColor(log.action)}`}
        >
          {log.action}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          {log.target_type}
        </span>
      </div>
      <h3 className="text-sm font-bold text-white mb-1 truncate">
        {getTargetDisplayName(log.target_type, log.target_id, log.details)}
      </h3>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-0.5">
          <Clock className="w-3 h-3" />
          {new Date(log.created_at).toLocaleString("en-GB")}
        </span>
        <span className="flex items-center gap-0.5">
          <User className="w-3 h-3" />
          {log.user_email || "System / Automated"}
        </span>
      </div>
    </div>
  </div>
  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
</div>
```

### 3. **Pagination — Standard**

```tsx
<div className="flex items-center justify-between border-t border-white/5 pt-4 mt-6 flex flex-col sm:flex-row gap-4">
  <div className="flex items-center gap-4 text-[10px] font-mono text-white px-2">
    Page {currentPage} of {totalPages}
  </div>
  <div className="flex items-center gap-2">
    <button className="p-1.5 rounded bg-secondary border border-white/5 text-muted-foreground hover:text-white disabled:opacity-30 disabled:hover:text-muted-foreground transition-all">
      <ChevronLeft className="w-4 h-4" />
    </button>
    <button className="p-1.5 rounded bg-secondary border border-white/5 text-muted-foreground hover:text-white disabled:opacity-30 disabled:hover:text-muted-foreground transition-all">
      <ChevronRight className="w-4 h-4" />
    </button>
  </div>
</div>
```

### 4. **Details Drawer — Slide-in Panel**

```tsx
{selectedLog && (
  <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in text-white">
    <div className="w-full max-w-2xl bg-card border-l border-white/5 h-full p-6 flex flex-col justify-between shadow-2xl animate-slide-in-right">
      <div className="space-y-6 overflow-y-auto pr-1">
        {/* Header: Action badge + target type + title */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${getActionColor(selectedLog.action)}`}>
                {selectedLog.action}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                {selectedLog.target_type}
              </span>
            </div>
            <h3 className="text-lg font-black font-archivo tracking-tight">
              { /* Complex ternary for action type title */ }
            </h3>
          </div>
          <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meta Grid */}
        <div className="grid grid-cols-2 gap-4 bg-white/[0.02] border border-white/5 rounded-xl p-4 text-[11px] font-mono">
          <div>Timestamp → {new Date(selectedLog.created_at).toLocaleString("en-GB")}</div>
          <div>Operator → {selectedLog.user_email || "System / Automated"}</div>
          <div className="col-span-2">Target Resource → {getTargetDisplayName(...)}</div>
        </div>

        {/* Payload Diff */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-muted-foreground tracking-wider">
            <FileJson className="w-3.5 h-3.5" /> Payload Details
          </div>
          {selectedLog.action === "UPDATE" && selectedLog.details?.old ? (
            <AuditDiffTable diff={computeDiff(selectedLog.details.old, selectedLog.details.new)} />
          ) : (
            <pre className="p-4 bg-black/20 border border-white/5 rounded-xl text-[10px] font-mono text-foreground overflow-x-auto max-h-[400px]">
              {JSON.stringify(selectedLog.details, null, 2)}
            </pre>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-border pt-4 mt-6 flex justify-between gap-4">
        <button disabled={restoring} className="px-4 py-2 bg-primary/80 hover:bg-primary text-xs font-mono font-bold uppercase rounded-lg transition-all text-primary-foreground disabled:opacity-50">
          {restoring ? "Restoring..." : "Restore to this State"}
        </button>
        <button className="px-4 py-2 bg-secondary hover:bg-muted text-xs font-mono font-bold uppercase rounded-lg border border-white/5 transition-all text-foreground">
          Close Inspector
        </button>
      </div>
    </div>
  </div>
)}
```

### 5. **ConfirmDialog — Restore Confirmation**

```tsx
<ConfirmDialog
  open={restoreConfirmOpen}
  onOpenChange={setRestoreConfirmOpen}
  tone="destructive"
  title="Restore Record"
  message={`Are you sure you want to restore the state of the ${logPendingRestore?.target_type ?? "selected"} record? This action will overwrite current data.`}
  confirmLabel="Restore"
  onConfirm={() => {
    if (logPendingRestore) handleRestore(logPendingRestore);
  }}
/>
```

### 6. **Error Handling — Already uses handleError!**

```tsx
import { handleError } from "../utils/errorHandler";

// In fetchLogs:
try {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  setLogs(data || []);
} catch (err) {
  console.error("Error fetching audit logs:", err);
  const { message } = handleError(err, { message: "Failed to fetch audit logs" });
  toast.error(message);
} finally {
  setLoading(false);
}
```

---

## CRITIC FEEDBACK — Current State

| Aspect              | Assessment                                                          |
| ------------------- | ------------------------------------------------------------------- |
| **Visual Identity** | Dark admin theme (slate/blue) — no domain personality               |
| **Layout**          | Standard admin — search + filters + card grid + pagination + drawer |
| **CardGrid**        | ✅ Already imported and used (good!)                                |
| **Error Handling**  | ✅ Already uses handleError                                         |
| **Search/Filter**   | Functional but generic                                              |
| **Details Drawer**  | Comprehensive but generic dark theme                                |
| **Restore Flow**    | Good UX with confirmation                                           |
| **Color Palette**   | Slate/Blue/White — generic SaaS                                     |

**Key Issues:**

- Generic "Admin" aesthetic — no concrete/flooring domain personality
- Action badges use generic semantic colors (no industry mapping)
- Dark theme hardcoded (text-white, bg-black/60) — not theme-aware
- No micro-interactions
- "Audit Log" title — generic terminology

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

### 1. **Page Header: Site Office Records Room**

```tsx
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
  <div className="flex items-center gap-2">
    <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    <span className="font-black uppercase tracking-widest text-[10px] text-stone-900 dark:text-white">
      SITE RECORDS
    </span>
  </div>
  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
    <div className="relative flex-1 max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
      <input
        type="text"
        placeholder="Search records, actions, operatives…"
        className="w-full bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
      />
    </div>
    <Select>...</Select>
    <Select>...</Select>
  </div>
</div>
```

---

### 2. **Filter Bar: Site Filters**

```tsx
<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs font-sans">
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
    <input
      type="text"
      placeholder="Search records…"
      className="w-full bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
    />
  </div>

  <Select>
    <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700">
      <SelectValue placeholder="All Actions" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="ALL">All Actions</SelectItem>
      <SelectItem value="CREATE">Record Created</SelectItem>
      <SelectItem value="UPDATE">Record Updated</SelectItem>
      <SelectItem value="DELETE">Record Deleted</SelectItem>
      <SelectItem value="INSPECT">Record Inspected</SelectItem>
      <SelectItem value="APPROVE_DOCUMENT">Document Approved</SelectItem>
      <SelectItem value="REJECT_DOCUMENT">Document Rejected</SelectItem>
      <SelectItem value="SUBMIT_DOCUMENTS">Documents Uploaded</SelectItem>
      <SelectItem value="RESEND_DOCUMENT_REQUEST">Link Renewed</SelectItem>
    </SelectContent>
  </Select>

  <Select>
    <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700">
      <SelectValue placeholder="All Types" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="ALL">All Types</SelectItem>
      <SelectItem value="staff">Operatives</SelectItem>
      <SelectItem value="jobs">Sites</SelectItem>
      <SelectItem value="shifts">Deployments</SelectItem>
      <SelectItem value="quotes">Tickets</SelectItem>
      <SelectItem value="document_requests">Doc Requests</SelectItem>
    </SelectContent>
  </Select>
</div>
```

---

### 3. **Log Cards: Site Record Cards**

```tsx
<CardGrid
  items={paginatedLogs}
  renderCard={(log) => (
    <div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl p-4 hover:bg-stone-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
      <div className="flex items-start gap-3">
        {/* Action indicator — site badge style */}
        <div
          className={cn(
            "w-2.5 h-2.5 rounded-full mt-1.5 shrink-0",
            log.action === "CREATE" && "bg-emerald-500",
            log.action === "UPDATE" && "bg-amber-500",
            log.action === "DELETE" && "bg-red-500",
            log.action === "INSPECT" && "bg-stone-500",
            log.action === "APPROVE_DOCUMENT" && "bg-emerald-600",
            log.action === "REJECT_DOCUMENT" && "bg-red-600",
            log.action === "SUBMIT_DOCUMENTS" && "bg-blue-500",
            log.action === "RESEND_DOCUMENT_REQUEST" && "bg-amber-600",
          )}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-1">
            {/* Action badge — site tag style */}
            <span
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-black border uppercase shrink-0",
                log.action === "CREATE" &&
                  "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
                log.action === "UPDATE" &&
                  "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
                log.action === "DELETE" &&
                  "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
                log.action === "INSPECT" &&
                  "bg-stone-50 dark:bg-stone-900/20 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800",
                log.action === "APPROVE_DOCUMENT" &&
                  "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
                log.action === "REJECT_DOCUMENT" &&
                  "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
                log.action === "SUBMIT_DOCUMENTS" &&
                  "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
                log.action === "RESEND_DOCUMENT_REQUEST" &&
                  "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
              )}
            >
              {log.action}
            </span>
            <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400 uppercase tracking-widest">
              {log.target_type}
            </span>
          </div>

          <h3 className="text-sm font-bold text-stone-900 dark:text-white mb-1 truncate">
            {getTargetDisplayName(log.target_type, log.target_id, log.details)}
          </h3>

          <div className="flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {new Date(log.created_at).toLocaleString("en-GB")}
            </span>
            <span className="flex items-center gap-0.5">
              <User className="w-3 h-3" />
              {log.user_email || "System / Automated"}
            </span>
          </div>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
    </div>
  )}
  emptyMessage="No site records found"
  emptyIcon={<Database className="w-8 h-8 text-emerald-500 opacity-60" />}
  columns={1}
  gap={3}
/>
```

---

### 4. **Pagination: Site Record Navigator**

```tsx
<div className="flex items-center justify-between border-t border-stone-200 dark:border-slate-700 pt-4 mt-6 flex flex-col sm:flex-row gap-4">
  <div className="flex items-center gap-4 text-[10px] font-mono text-stone-500 dark:text-stone-400 px-2">
    Page {currentPage} of {totalPages}
  </div>
  <div className="flex items-center gap-2">
    <button
      disabled={currentPage === 1}
      className="p-1.5 rounded bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white disabled:opacity-30 disabled:hover:text-stone-500 dark:disabled:hover:text-stone-400 transition-all"
    >
      <ChevronLeft className="w-4 h-4" />
    </button>
    <button
      disabled={currentPage === totalPages}
      className="p-1.5 rounded bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white disabled:opacity-30 disabled:hover:text-stone-500 dark:disabled:hover:text-stone-400 transition-all"
    >
      <ChevronRight className="w-4 h-4" />
    </button>
  </div>
</div>
```

---

### 5. **Details Drawer: Site Record Inspector**

```tsx
{
  selectedLog && (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border-l-2 border-amber-500 h-full p-6 flex flex-col justify-between shadow-2xl animate-slide-in-right">
        <div className="space-y-6 overflow-y-auto pr-1">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-700 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-black border uppercase",
                    selectedLog.action === "CREATE" &&
                      "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
                    selectedLog.action === "UPDATE" &&
                      "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
                    selectedLog.action === "DELETE" &&
                      "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
                    selectedLog.action === "INSPECT" &&
                      "bg-stone-50 dark:bg-stone-900/20 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800",
                    selectedLog.action === "APPROVE_DOCUMENT" &&
                      "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
                    selectedLog.action === "REJECT_DOCUMENT" &&
                      "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
                    selectedLog.action === "SUBMIT_DOCUMENTS" &&
                      "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
                    selectedLog.action === "RESEND_DOCUMENT_REQUEST" &&
                      "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
                  )}
                >
                  {selectedLog.action}
                </span>
                <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                  {selectedLog.target_type}
                </span>
              </div>
              <h3 className="text-lg font-black font-archivo tracking-tight text-stone-900 dark:text-white">
                {/* Domain-aware titles */}
                {selectedLog.action === "UPDATE" &&
                computeDiff(selectedLog.details?.old, selectedLog.details?.new).length > 0
                  ? "VARIANCE REPORT"
                  : selectedLog.action === "INSPECT"
                    ? "SITE INSPECTION"
                    : selectedLog.action === "CREATE"
                      ? "RECORD CREATED"
                      : selectedLog.action === "DELETE"
                        ? "RECORD DELETED"
                        : selectedLog.action === "APPROVE_DOCUMENT"
                          ? "DOCUMENT APPROVED"
                          : selectedLog.action === "REJECT_DOCUMENT"
                            ? "DOCUMENT REJECTED"
                            : selectedLog.action === "SUBMIT_DOCUMENTS"
                              ? "DOCUMENTS UPLOADED"
                              : selectedLog.action === "RESEND_DOCUMENT_REQUEST"
                                ? "LINK RENEWED"
                                : selectedLog.action === "UPDATE"
                                  ? "RECORD UPDATED"
                                  : "SYSTEM EVENT"}
              </h3>
            </div>
            <button
              onClick={() => setSelectedLog(null)}
              className="p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Meta Grid — Site Record Style */}
          <div className="grid grid-cols-2 gap-4 bg-stone-50 dark:bg-slate-900/50 border border-stone-200 dark:border-slate-700 rounded-xl p-4 text-[11px] font-mono">
            <div>
              <p className="text-stone-500 dark:text-stone-400 uppercase font-black text-[9px] tracking-wider">
                TIMESTAMP
              </p>
              <p className="text-stone-900 dark:text-white mt-0.5">
                {new Date(selectedLog.created_at).toLocaleString("en-GB")}
              </p>
            </div>
            <div>
              <p className="text-stone-500 dark:text-stone-400 uppercase font-black text-[9px] tracking-wider">
                OPERATOR
              </p>
              <p className="text-stone-900 dark:text-white mt-0.5">
                {selectedLog.user_email || "System / Automated"}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-stone-500 dark:text-stone-400 uppercase font-black text-[9px] tracking-wider">
                TARGET RESOURCE
              </p>
              <p className="text-stone-900 dark:text-white mt-0.5 select-all font-sans font-bold text-sm">
                {getTargetDisplayName(
                  selectedLog.target_type,
                  selectedLog.target_id,
                  selectedLog.details,
                )}
              </p>
              {selectedLog.target_type === "staff" &&
                selectedLog.target_id?.startsWith("worker-") && (
                  <span className="text-[9px] text-stone-500 dark:text-stone-400 font-mono tracking-normal block mt-0.5">
                    ID: {selectedLog.target_id}
                  </span>
                )}
            </div>
          </div>

          {/* Payload Details — Variance Report Style */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-stone-500 dark:text-stone-400 tracking-wider">
              <FileJson className="w-3.5 h-3.5" />
              <span>PAYLOAD DETAILS</span>
            </div>
            {selectedLog.action === "UPDATE" && selectedLog.details?.old ? (
              <AuditDiffTable
                diff={computeDiff(selectedLog.details.old, selectedLog.details.new)}
              />
            ) : (
              <pre className="p-4 bg-stone-100 dark:bg-slate-900/50 border border-stone-200 dark:border-slate-700 rounded-xl text-[10px] font-mono text-stone-900 dark:text-stone-100 overflow-x-auto max-h-[400px]">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Actions — Site Action Buttons */}
        <div className="border-t border-stone-200 dark:border-slate-700 pt-4 mt-6 flex justify-between gap-4">
          <button
            disabled={restoring}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-xs font-mono font-bold uppercase rounded-lg transition-all text-white disabled:opacity-50 shadow-lg shadow-amber-600/20"
          >
            {restoring ? "RESTORING..." : "RESTORE TO THIS STATE"}
          </button>
          <button className="px-4 py-2 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-xs font-mono font-bold uppercase rounded-lg border border-stone-200 dark:border-slate-700 transition-all text-stone-900 dark:text-white">
            CLOSE INSPECTOR
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### 6. **ConfirmDialog: Site Safety Notice**

```tsx
<ConfirmDialog
  open={restoreConfirmOpen}
  onOpenChange={setRestoreConfirmOpen}
  tone="destructive"
  title="RESTORE RECORD"
  message={
    <>
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-stone-700 dark:text-stone-300">
          <p className="font-bold">Restore Record State?</p>
          <p className="mt-1 text-stone-500 dark:text-stone-400">
            This will overwrite the current {logPendingRestore?.target_type ?? "selected"} record
            with the state from this log entry. Any changes made after this point will be lost.
          </p>
        </div>
      </div>
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs font-mono text-amber-800 dark:text-amber-200">
        Action cannot be undone. Audit log will record this restoration.
      </div>
    </>
  }
  confirmLabel="RESTORE"
  cancelLabel="CANCEL"
  confirmButtonClassName="bg-red-600 hover:bg-red-700 text-white"
  onConfirm={() => {
    if (logPendingRestore) handleRestore(logPendingRestore);
  }}
/>
```

---

### 7. **Micro-Interactions**

```css
/* Card hover lift */
.audit-card {
  @apply transition-all duration-200;
}
.audit-card:hover {
  @apply -translate-y-0.5 shadow-lg;
  box-shadow:
    0 10px 25px -5px rgb(217 119 6 / 0.2),
    0 8px 10px -6px rgb(217 119 6 / 0.1);
}

/* Button press */
.btn-site:active {
  @apply scale-[0.98];
}

/* Action badge pulse for new logs */
@keyframes badge-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgb(217 119 6 / 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgb(217 119 6 / 0);
  }
}
.action-badge-new {
  animation: badge-pulse 2s infinite;
}

/* Drawer entrance */
@keyframes drawer-slide {
  0% {
    opacity: 0;
    transform: translateX(100%);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}
.drawer-enter {
  animation: drawer-slide 0.3s ease-out;
}

/* Pagination button hover */
.page-btn:hover {
  @apply bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300;
}
```

---

## CRITIC FEEDBACK

| Aspect                 | Original                 | Editor                                                   | Critic Assessment                   |
| ---------------------- | ------------------------ | -------------------------------------------------------- | ----------------------------------- |
| **Visual Identity**    | Generic dark admin       | Concrete site records room                               | **Strong** — authentic domain       |
| **Terminology**        | "Audit Log", "Inspector" | "Site Records", "Inspector"                              | **Clear** — site office language    |
| **Action Badges**      | Generic semantic colors  | Industry-mapped (Create=Green, Update=Amber, Delete=Red) | **Excellent** — instant recognition |
| **Drawer**             | Dark modal               | Light/dark aware, amber accent                           | **Better** — theme consistent       |
| **Restore Flow**       | Generic confirm          | Safety notice with variance report context               | **Safety-critical** — appropriate   |
| **Color Palette**      | Slate/Blue               | Amber/Stone/Emerald                                      | **Authentic** — concrete industry   |
| **Micro-interactions** | None                     | Lift, pulse, slide, scale                                | **Polished** — feels alive          |

**Risk Areas:**

- Color contrast on amber/stone — verify WCAG AA
- Dark mode text on stone backgrounds
- Action badge density on mobile cards
- AuditDiffTable theming consistency

---

## APPLY — Implementation Priority

1. **Color System** — CSS variables for amber/stone/emerald
2. **Page Header** — "SITE RECORDS" with amber icon
3. **Filter Bar** — Stone borders, amber focus
4. **Log Cards** — Action badges mapped to concrete actions
5. **Pagination** — Stone borders, amber hover
6. **Details Drawer** — Site record inspector style
7. **Confirm Dialog** — Safety notice with amber warning
8. **Micro-interactions** — CSS animations
9. **Dark Mode** — Full theme-aware support

---

**Estimated Effort:** 1-2 days for full page overhaul  
**Dependencies:** CSS variable system, AlertTriangle icon  
**Testing:** Light/dark mode, responsive, accessibility (WCAG AA)  
**Rollout:** Feature flag for gradual deployment

---

**Total Design Pairs:** 7 major sections = ~14 ORIGINAL/EDITOR/CRITIC pairs
