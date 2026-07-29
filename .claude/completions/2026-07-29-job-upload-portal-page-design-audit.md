# Design Audit: JobUploadPortalPage.tsx

**Component:** `src/opus/pages/JobUploadPortal.tsx`  
**Type:** Page component — Job document upload portal (token-based, public access)  
**Audit Date:** 2026-07-29  
**Status:** Already refactored with stateGrouping & handleError — Design audit needed

---

## ORIGINAL — Current Design Patterns

### 1. **Page Layout — Centered Card Form**
```tsx
<div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-4 font-sans text-foreground">
  <img src={logoSrc} alt="Opus Form" className="h-8 w-auto" />
  <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6">
    {/* Title + Job info */}
    <div className="text-center space-y-2">
      <div className="inline-flex px-3 py-1 bg-secondary border border-border rounded-full text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
        {jobData?.jobRef?.replace("-X", "")}
      </div>
      <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Job Document Portal</h1>
      <p className="text-sm text-muted-foreground">Uploading documents for <strong className="text-foreground">{jobData?.siteName}</strong></p>
    </div>

    {uploadSuccess ? (
      {/* Success State — Simple Check Circle */}
      <div className="text-center space-y-5 py-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success/10 border border-success/20 text-success">
          <Check className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Upload Complete</h2>
          <p className="text-sm text-muted-foreground">Your documents have been submitted to the site supervisor.</p>
        </div>
      </div>
    ) : (
      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drag & Drop Area */}
        <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} className={cn("border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer relative", ui.dragActive ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/40 bg-background")}>
          <input type="file" multiple id="file-upload-input" onChange={handleFileSelect} className="hidden" />
          <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center gap-3">
            <UploadCloud className="w-10 h-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">Drag and drop files here, or <span className="text-primary hover:underline">browse</span></p>
              <p className="text-xs text-muted-foreground">Supports PDF, DOCX, JPEG, PNG, Excel</p>
              <p className="text-[10px] text-muted-foreground">10MB per file, 100MB total per job</p>
            </div>
          </label>
        </div>

        {/* Selected files list */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Files to Upload ({files.length})</div>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {files.map((file, idx) => (
                <div key={idx} className="flex justify-between items-center bg-background border border-border rounded-lg px-3 py-2 text-xs">
                  <span className="truncate max-w-[80%] text-foreground font-mono">{file.name}</span>
                  <button type="button" onClick={() => handleRemoveFile(idx)} className="text-muted-foreground hover:text-destructive font-bold">Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit button */}
        <button type="submit" disabled={files.length === 0 || uploading} className={cn("w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex justify-center items-center gap-2", files.length === 0 || uploading ? "bg-secondary text-muted-foreground cursor-not-allowed" : "bg-primary hover:bg-primary text-white cursor-pointer")}>
          {uploading ? (<> <Loader className="w-4 h-4 animate-spin" /> Uploading... </>) : ("Submit Documentation")}
        </button>
      </form>
    )}
  </div>
</div>
```

### 2. **Success State — Simple Check Circle**
```tsx
<div className="text-center space-y-5 py-6">
  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success/10 border border-success/20 text-success">
    <Check className="w-8 h-8" />
  </div>
  <div className="space-y-1">
    <h2 className="text-lg font-bold text-foreground">Upload Complete</h2>
    <p className="text-sm text-muted-foreground">Your documents have been submitted to the site supervisor.</p>
  </div>
</div>
```

### 3. **Error/Loading States**
```tsx
// Loading
if (loading) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-4">
      <img src={logoSrc} alt="Opus Form" className="h-8 w-auto" />
      <div className="flex flex-col items-center gap-3">
        <Loader className="w-8 h-8 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Verifying Token...</span>
      </div>
    </div>
  );
}

// Error
if (errorMsg) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-4">
      <img src={logoSrc} alt="Opus Form" className="h-8 w-auto" />
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 text-primary">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground uppercase tracking-wider">Access Denied</h2>
        <p className="text-sm text-muted-foreground">{errorMsg}</p>
      </div>
    </div>
  );
}
```

---

## CRITIC FEEDBACK — Current State

| Aspect | Assessment |
|--------|------------|
| **Upload UX** | Good 3-state dropzone (idle/drag/files), clear limits |
| **File List** | Clean list with remove buttons, shows count |
| **Validation** | Client-side size/type validation, total limit enforcement |
| **Progress** | No progress indication during upload (spinner only) |
| **State Management** | Already grouped with stateGrouping utilities |
| **Error Handling** | Uses handleError utility |
| **Visual Identity** | Generic SaaS — slate/blue/primary, no concrete industry personality |
| **Terminology** | "Job Document Portal", "Submit Documentation" — generic |
| **Color Palette** | Primary/secondary/success — no domain palette |

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

### 1. **Page Header: Site Office Document Drop**
```tsx
<div className="min-h-screen bg-formwork dark:bg-formwork-dark flex flex-col items-center justify-center gap-8 p-4 font-sans text-foreground">
  {/* Formwork shuttering pattern overlay — site hoarding */}
  <div className="absolute inset-0 pointer-events-none" style={{
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 0 0 L 60 0 L 60 60' fill='none' stroke='%23${theme === "light" ? "D97706" : "FDE68A"}' stroke-width='0.4'/%3E%3Ccircle cx='0' cy='0' r='1.5' fill='%23D97706'/%3E%3C/svg%3E")`,
    opacity: theme === "light" ? 0.15 : 0.08
  }} />
  
  <img src={logoSrc} alt="Opus Form" className="h-8 w-auto" />
  <div className="w-full max-w-lg bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 rounded-2xl p-6 md:p-8 space-y-6">
    {/* Site Header */}
    <div className="text-center space-y-2">
      <div className="inline-flex px-3 py-1 bg-stone-100 dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 rounded-full text-[10px] font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 font-mono">
        {jobData?.jobRef?.replace("-X", "")}
      </div>
      <h1 className="text-2xl font-extrabold text-stone-900 dark:text-white tracking-tight">SITE DOCUMENT DROP</h1>
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Uploading attachments for <strong className="text-stone-900 dark:text-white">{jobData?.siteName}</strong>
      </p>
    </div>
```

---

### 2. **Upload Zone: Site Delivery Receipt**
```tsx
<form onSubmit={handleSubmit} className="space-y-6">
  {/* Drop Zone — Site Delivery Receipt */}
  <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} className={cn(
    "border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer relative",
    ui.dragActive
      ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-[0_0_24px_rgba(217,119,6,0.15)]"
      : "border-stone-300 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 bg-white dark:bg-slate-800"
  )}>
    <input type="file" multiple id="file-upload-input" onChange={handleFileSelect} className="hidden" />
    <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center gap-3">
      <div className="w-14 h-14 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center border-2 border-amber-200 dark:border-amber-800">
        <UploadCloud className="w-6 h-6 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-stone-900 dark:text-white">
          Drag delivery tickets here, or <span className="text-amber-600 dark:text-amber-400 hover:underline">browse</span>
        </p>
        <p className="text-xs text-stone-500 dark:text-stone-400">PDF, DOCX, JPEG, PNG, XLSX — Site delivery tickets & photos</p>
        <p className="text-[10px] text-stone-400 dark:text-stone-500">10MB per file, 100MB total per site</p>
      </div>
    </label>
  </div>
```

---

### 3. **File Queue: Site Attachment Register**
```tsx
{files.length > 0 && (
  <div className="space-y-2">
    <div className="text-[10px] text-stone-500 dark:text-stone-400 font-black uppercase tracking-wider">
      SITE ATTACHMENT REGISTER ({files.length})
    </div>
    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
      {files.map((file, idx) => (
        <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5 text-stone-500" />
            </div>
            <span className="truncate max-w-[80%] text-stone-900 dark:text-white font-mono">{file.name}</span>
          </div>
          <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400 shrink-0">
            {(file.size / 1024 / 1024).toFixed(1)} MB
          </span>
          <button type="button" onClick={() => handleRemoveFile(idx)} className="text-stone-400 hover:text-red-500 font-bold px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">REMOVE</button>
        </div>
      ))}
    </div>
  )}
)}
```

---

### 4. **Progress During Upload: Concrete Pour Progress**
```tsx
{uploading && (
  <div className="bg-stone-50 dark:bg-stone-900/30 border-2 border-stone-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
    <div className="flex items-center gap-2">
      <Truck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
      <span className="text-sm font-black uppercase tracking-wider text-stone-700 dark:text-stone-300">POURING ATTACHMENTS TO SITE</span>
    </div>
    <div className="h-3 bg-stone-200 dark:bg-slate-700 rounded-full overflow-hidden">
      <motion.div 
        className="h-full bg-amber-600 rounded-full" 
        initial={{ width: 0 }} 
        animate={{ width: "100%" }} 
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
    </div>
    <p className="text-[10px] font-mono text-amber-600 dark:text-amber-400 text-center">
      TRANSFERRING {files.length} ATTACHMENT(S)...
    </p>
  </div>
)}
```

---

### 5. **Submit Button: Concrete Delivery Button**
```tsx
<button type="submit" disabled={files.length === 0 || uploading} className={cn(
  "w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex justify-center items-center gap-2 min-h-[52px]",
  files.length === 0 || uploading
    ? "bg-stone-200 dark:bg-slate-700 text-stone-400 dark:text-stone-500 cursor-not-allowed"
    : "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-lg shadow-amber-600/20 active:scale-[0.98]"
)}>
  {uploading ? (
    <>
      <Loader className="w-4 h-4 animate-spin" />
      POURING ATTACHMENTS...
    </>
  ) : (
    <>
      <UploadCloud className="w-4 h-4" />
      SUBMIT TO SITE
    </>
  )}
</button>
```

---

### 6. **Success State: Delivery Receipt**
```tsx
{uploadSuccess ? (
  <div className="text-center space-y-5 py-6">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
      <Check className="w-8 h-8" />
    </div>
    <div className="space-y-1">
      <h2 className="text-lg font-bold text-stone-900 dark:text-white">DELIVERY CONFIRMED</h2>
      <p className="text-sm text-stone-500 dark:text-stone-400">
        {files.length} attachment(s) delivered to site supervisor.
      </p>
    </div>
    <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-lg text-[10px] font-mono text-emerald-700 dark:text-emerald-300">
      DELIVERY RECEIPT LOGGED · AUDIT TRAIL UPDATED
    </div>
  </div>
) : ( ... )}
```

---

### 7. **Error State: Access Denied Notice**
```tsx
if (errorMsg) {
  return (
    <div className="min-h-screen bg-formwork dark:bg-formwork-dark flex flex-col items-center justify-center gap-8 p-4">
      {/* Formwork pattern */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,...")`, opacity: theme === "light" ? 0.15 : 0.08 }} />
      
      <img src={logoSrc} alt="Opus Form" className="h-8 w-auto" />
      <div className="w-full max-w-md bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 rounded-2xl p-6 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-stone-900 dark:text-white uppercase tracking-wider">ACCESS DENIED</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">{errorMsg}</p>
      </div>
    </div>
  );
}
```

---

### 8. **Loading State: Verifying Site Access**
```tsx
if (loading) {
  return (
    <div className="min-h-screen bg-formwork dark:bg-formwork-dark flex flex-col items-center justify-center gap-8 p-4">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,...")`, opacity: theme === "light" ? 0.15 : 0.08 }} />
      
      <img src={logoSrc} alt="Opus Form" className="h-8 w-auto" />
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-stone-200 dark:border-slate-700 border-t-amber-600 rounded-full animate-spin" />
        <span className="text-xs text-stone-500 dark:text-stone-400 font-black uppercase tracking-widest">VERIFYING SITE ACCESS...</span>
      </div>
    </div>
  );
}
```

---

### 8. **Micro-Interactions**
```css
/* File card hover */
.attachment-card {
  @apply transition-all duration-200;
}
.attachment-card:hover {
  @apply -translate-y-0.5 shadow-lg;
  box-shadow: 0 10px 25px -5px rgb(217 119 6 / 0.2), 0 8px 10px -6px rgb(217 119 6 / 0.1);
}

/* Button press */
.btn-site:active {
  @apply scale-[0.98];
}

/* Upload progress */
@keyframes pour-fill {
  0% { width: 0; }
  100% { width: 100%; }
}
.pour-progress { animation: pour-fill 1.5s ease-out; }

/* Amber focus ring */
input:focus, button:focus, select:focus {
  @apply border-amber-500 ring-1 ring-amber-500;
}

/* Drag active pulse */
@keyframes drag-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgb(217 119 6 / 0.4); }
  50% { box-shadow: 0 0 0 12px rgb(217 119 6 / 0); }
}
.drag-active { animation: drag-pulse 2s infinite; }
```

---

## CRITIC FEEDBACK

| Aspect | Original | Editor | Critic Assessment |
|--------|----------|--------|-------------------|
| **Visual Identity** | Generic SaaS | Concrete/Flooring (amber/stone/emerald) | **Strong improvement** — domain personality throughout |
| **Terminology** | "Job Document Portal", "Submit Documentation" | "Site Document Drop", "Site Delivery Receipt", "Attachment Register" | **Clear** — site office language |
| **Upload Zone** | Generic dropzone | "Site Delivery Receipt" with truck icon | **Authentic** — matches concrete delivery paperwork |
| **File List** | Generic list | "Site Attachment Register" with file sizes | **Functional** — site register terminology |
| **Progress** | Spinner only | "Pouring Attachments" with truck icon + progress bar | **Excellent** — concrete pour metaphor |
| **Success** | Generic checkmark | "Delivery Confirmed" with receipt notice | **Authentic** — matches site sign-off |
| **Color Palette** | Slate/Blue | Amber/Stone/Emerald | **Authentic** — concrete industry colors |
| **Micro-interactions** | None | Card lift, pour progress, amber pulse | **Polished** — feels alive |

**Risk Areas:**
- Color contrast on amber/stone — verify WCAG AA
- Amber focus rings — ensure visible in light/dark
- Upload progress bar — test on slow connections
- Drag zone pulse animation — ensure not distracting

---

## APPLY — Implementation Priority

1. **Color System** — CSS variables for amber/stone/emerald palette
2. **Page Header** — "SITE DOCUMENT DROP" with formwork pattern
3. **Drop Zone** — "Site Delivery Receipt" with truck icon
4. **File Queue** — "Site Attachment Register" with file sizes
5. **Submit Button** — "SUBMIT TO SITE" amber button
6. **Progress** — "Pouring Attachments" with truck + progress bar
7. **Success** — "Delivery Confirmed" receipt notice
8. **Micro-interactions** — CSS animations

---

**Estimated Effort:** 0.5-1 day for full page overhaul  
**Dependencies:** CSS variable system, Truck/UploadCloud icons  
**Testing:** Light/dark mode, responsive, accessibility (WCAG AA)  
**Rollout:** Feature flag for gradual deployment

---

**Total Design Pairs:** 9 major sections = ~18 ORIGINAL/EDITOR/CRITIC pairs