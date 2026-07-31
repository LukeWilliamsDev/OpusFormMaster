# Design Audit: SubmitCredentialsPage.tsx

**Component:** `src/opus/pages/SubmitCredentials.tsx`  
**Type:** Page component — Multi-step document upload wizard for compliance certificates  
**Audit Date:** 2026-07-29  
**Status:** Already refactored with stateGrouping & handleError — Design audit needed

---

## ORIGINAL — Current Design Patterns

### 1. **Page Layout — Centered Card Wizard**

```tsx
<div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
  {/* Static blueprint-style grid overlay */}
  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,...")`, opacity: theme === "light" ? 0.18 : 0.1 }} />

  <div className="max-w-md w-full z-10 flex flex-col items-center">
    {/* Logo */}
    <div className="text-center mb-6 sm:mb-8 w-full flex flex-col items-center">
      <button onClick={() => navigate("/")} className="focus:outline-none cursor-pointer group" title="Return to Landing Page">
        <img src={logoSrc} alt="Opus Form" className="h-12 w-auto transition-opacity group-hover:opacity-80" />
      </button>
    </div>

    {/* Form container */}
    <div className="w-full bg-card border border-border rounded-xl overflow-hidden shadow-xl shadow-black/20">
      <div className="p-6 sm:p-8">
        {/* Stepper */}
        <Stepper steps={stepLabels} currentStep={stepper.currentStep} />

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div key={isReviewStep ? "review" : `step-${stepper.currentStep}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="w-full">
            {/* Upload Step */}
            {!isReviewStep && (
              <div className="space-y-4">
                {/* Progress bar */}
                <div className="h-px bg-border rounded-full overflow-hidden mb-4">
                  <motion.div layout className="h-full bg-primary" style={{ width: `${((stepper.currentStep) / (slots.length - 1 || 1)) * 100}%` }} />
                </div>

                {/* Cert badge */}
                <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-primary mb-3">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{activeSlot.cert}</span>
                </div>

                {/* Dropzone */}
                <Dropzone slot={activeSlot} onFileSelected={...} onRemoveFile={...} />

                {/* Expiry Date */}
                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Expiration Date
                  </label>
                  <input type="date" ... className="w-full bg-secondary/40 border border-border hover:border-muted-foreground/50 focus:border-primary rounded-xl px-4 py-3 text-xs text-foreground outline-none transition-colors min-h-[48px]" />
                </div>

                {/* In-step error */}
                {errorMsg && <p className="text-[8.5px] font-bold text-red-400 uppercase tracking-wider text-center">{errorMsg}</p>}
              </div>
            )}

            {/* Review Step */}
            {isReviewStep && (
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-foreground/85 mb-4 pb-3 border-b border-border">Review Your Submissions</h4>
                  <div className="space-y-3">
                    {slots.map((slot, idx) => (
                      <div key={slot.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border hover:border-muted-foreground/40 transition-colors">
                        {/* Thumbnail */}
                        {slot.thumbnailUrl ? <img /> : <div><FileText /></div>}
                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/85 truncate">{slot.cert}</p>
                          {slot.displayFilename && <p className="text-[9px] font-mono text-muted-foreground truncate">{slot.displayFilename}</p>}
                          <p className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">Expires: {slot.expiryDate ? new Date(slot.expiryDate).toLocaleDateString("en-GB") : "—"}</p>
                        </div>
                        {/* Status + edit */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center border border-primary/30"><Check /></div>
                          <button onClick={() => goToStep(idx)} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1"><Edit3 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit error */}
                {errorMsg && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center"><p className="text-[9px] font-bold text-red-400 uppercase tracking-wider">{errorMsg}</p></div>}

                {/* Submit button */}
                <button type="button" onClick={handleSubmit} disabled={submitState.loading} className="w-full py-4 bg-primary hover:bg-primary/80 disabled:opacity-50 text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 transition-all min-h-[52px] cursor-pointer flex items-center justify-center gap-2">
                  {submitState.loading ? <> <Loader className="w-4 h-4 animate-spin" /> Submitting… </> : <> <Check className="w-4 h-4" /> Submit All Documents </>}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Open-ended: Add cert button */}
        {openEnded && !isReviewStep && (
          <button type="button" onClick={addSlot} className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-border hover:border-primary/40 rounded-xl text-[9.5px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <Plus className="w-4 h-4" /> Add Another Certification
          </button>
        )}

        {/* Navigation */}
        {!isReviewStep && (
          <div className="flex items-center gap-3">
            {stepper.currentStep > 0 && <button onClick={goBack} className="flex-1 py-3.5 bg-secondary hover:bg-muted border border-border rounded-xl text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"><ChevronLeft /> Back</button>}
            <button onClick={goNext} disabled={!canAdvance()} className={cn("flex-1 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all min-h-[48px] flex items-center justify-center gap-2 cursor-pointer", canAdvance() ? "bg-primary hover:bg-primary/80 text-primary-foreground shadow-lg shadow-primary/20" : "bg-secondary text-muted-foreground border border-border cursor-not-allowed")}>
              {stepper.currentStep === slots.length - 1 ? "Review" : "Next"} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Back on Review */}
        {isReviewStep && <button onClick={goBack} className="w-full py-3 bg-secondary hover:bg-muted border border-border rounded-xl text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"><ChevronLeft /> Back to Editing</button>}

        {/* Footer */}
        <div className="text-center pt-4 border-t border-border">
          <p className="text-[8px] text-muted-foreground uppercase tracking-widest">Opus Form Ltd — Secure Document Portal</p>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

### 2. **Stepper Component — Progress Indicator**

```tsx
const Stepper: React.FC<{ steps: string[]; currentStep: number }> = ({ steps, currentStep }) => (
  <div className="flex items-center justify-center gap-1.5 flex-wrap px-2">
    {steps.map((label, idx) => {
      const isCompleted = idx < currentStep;
      const isActive = idx === currentStep;
      return (
        <React.Fragment key={idx}>
          {idx > 0 && (
            <div
              className={`hidden sm:block h-px w-4 transition-colors duration-300 ${isCompleted ? "bg-primary" : "bg-border"}`}
            />
          )}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${isActive ? "bg-primary/15 text-primary border border-primary/30 shadow-[0_0_12px_rgba(181,101,29,0.15)]" : isCompleted ? "bg-success/10 text-success border border-success/20" : "bg-secondary text-muted-foreground border border-border"}`}
          >
            {isCompleted ? (
              <Check className="w-3 h-3" />
            ) : (
              <span className="w-3 text-center">{idx + 1}</span>
            )}
            <span className="hidden sm:inline max-w-[80px] truncate">{label}</span>
          </div>
        </React.Fragment>
      );
    })}
  </div>
);
```

---

### 3. **Dropzone Component — 3-State Upload**

```tsx
// Uploading state — progress ring
<div className="flex flex-col items-center justify-center py-10 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5">
  <ProgressRing progress={slot.progress} />
  <span className="text-[9px] font-black uppercase tracking-widest text-primary mt-3">Uploading… {slot.progress}%</span>
</div>

// Selected state — preview
<div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
  <div className="flex items-start gap-3">
    {slot.thumbnailUrl ? <img className="w-16 h-16 rounded-xl object-cover border border-border" /> : <div className="w-16 h-16 rounded-xl bg-secondary border border-border flex items-center justify-center"><FileText className="w-7 h-7 text-muted-foreground" /></div>}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-1">
        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20"><Check className="w-3 h-3 text-primary" /></div>
        <span className="text-[9px] font-black uppercase tracking-widest text-primary">Selected</span>
      </div>
      {slot.displayFilename && <p className="text-[10px] font-mono text-muted-foreground truncate" title={slot.displayFilename}>{slot.displayFilename}</p>}
    </div>
    <button onClick={onRemoveFile} className="shrink-0 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer p-1"><X className="w-4 h-4" /></button>
  </div>
</div>

// Empty state — dropzone
<div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} onClick={() => inputRef.current?.click()} className={cn("relative flex flex-col items-center justify-center py-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300", dragActive ? "border-primary bg-primary/5 shadow-[0_0_24px_rgba(181,101,29,0.1)]" : "border-border hover:border-primary/40 bg-secondary/40")}>
  <input ref={inputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={...} />
  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300", dragActive ? "bg-primary/15 border border-primary/30" : "bg-secondary border border-border")}><FileUp className={cn("w-5 h-5 transition-colors duration-300", dragActive ? "text-primary" : "text-muted-foreground")} /></div>
  <span className="hidden sm:block text-[10px] font-bold uppercase tracking-widest text-foreground/85">Drag & Drop or Click to Upload</span>
  <span className="sm:hidden text-[10px] font-bold uppercase tracking-widest text-foreground/85">Tap to Upload</span>
  <span className="text-[8px] text-muted-foreground uppercase tracking-widest mt-1.5">PDF, PNG, or JPG — Max 5 MB</span>
  {slot.error && <p className="text-[8.5px] font-bold text-red-400 uppercase tracking-wider mt-3 px-4 text-center">{slot.error}</p>}
</div>
```

---

### 4. **Progress Ring — SVG Animation**

```tsx
const ProgressRing: React.FC<{ progress: number; size?: number }> = ({ progress, size = 64 }) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="var(--border)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-primary transition-all duration-300"
      />
    </svg>
  );
};
```

---

### 5. **Animated Checkmark — Success State**

```tsx
const AnimatedCheckmark: React.FC = () => (
  <div className="relative w-20 h-20 mx-auto">
    <svg viewBox="0 0 80 80" className="w-full h-full">
      <circle
        cx="40"
        cy="40"
        r="36"
        fill="none"
        stroke="color-mix(in srgb, var(--success) 20%, transparent)"
        strokeWidth="3"
        className="animate-[scaleIn_0.4s_ease_out_forwards]"
      />
      <circle
        cx="40"
        cy="40"
        r="28"
        fill="color-mix(in srgb, var(--success) 6%, transparent)"
        className="animate-[scaleIn_0.5s_ease_out_0.1s_forwards]"
      />
      <path
        d="M24 42 L34 52 L56 30"
        fill="none"
        stroke="var(--success)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-[drawCheck_0.5s_ease_out_0.3s_forwards]"
        style={{ strokeDasharray: 60, strokeDashoffset: 60 }}
      />
    </svg>
  </div>
);
```

---

### 6. **Error Handling — Already Uses handleError**

```tsx
try {
  // fetch or submit
} catch (err: any) {
  console.error("Fetch error:", err);
  const { message } = handleError(err, { message: "Failed to fetch request details" });
  setRequestFetch((prev) => ({ ...prev, loading: false, error: message }));
  setErrorMsg(message);
}
```

---

## CRITIC FEEDBACK — Current State

| Aspect               | Assessment                                                                 |
| -------------------- | -------------------------------------------------------------------------- |
| **Wizard Pattern**   | Well-executed multi-step with stepper, review step, validation             |
| **Upload UX**        | Excellent 3-state dropzone (empty/uploading/preview) with progress ring    |
| **Animation**        | Motion/react transitions, animated checkmark, progress ring                |
| **State Management** | Already grouped with stateGrouping utilities                               |
| **Error Handling**   | Uses handleError utility                                                   |
| **Visual Identity**  | Still generic SaaS (slate/blue/primary) — no concrete industry personality |
| **Terminology**      | "Certification", "Document", "Submit" — generic                            |
| **Color Palette**    | Primary/secondary/success — no domain palette                              |

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

### 1. **Page Header: Site Office Document Portal**

```tsx
<div className="min-h-screen bg-formwork dark:bg-formwork-dark flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
  {/* Formwork shuttering pattern overlay */}
  <div className="absolute inset-0 pointer-events-none" style={{
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 0 0 L 60 0 L 60 60' fill='none' stroke='%23${theme === "light" ? "D97706" : "FDE68A"}' stroke-width='0.4'/%3E%3Ccircle cx='0' cy='0' r='1.5' fill='%23D97706'/%3E%3C/svg%3E")`,
    opacity: theme === "light" ? 0.15 : 0.08
  }} />

  <div className="max-w-md w-full z-10 flex flex-col items-center">
    <div className="text-center mb-6 sm:mb-8 w-full flex flex-col items-center">
      <button onClick={() => navigate("/")} className="focus:outline-none cursor-pointer group" title="Return to Site">
        <img src={logoSrc} alt="Opus Form" className="h-12 w-auto transition-opacity group-hover:opacity-80" />
      </button>
      <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">SITE DOCUMENT PORTAL</p>
    </div>
```

---

### 2. **Wizard Container: Delivery Ticket Form**

```tsx
<div className="w-full bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xl shadow-amber-500/5">
  <div className="p-6 sm:p-8">
    {/* Stepper — Site Progress Tracker */}
    <div className="flex items-center justify-center gap-1.5 flex-wrap px-2 mb-6">
      {stepLabels.map((label, idx) => {
        const isCompleted = idx < currentStep;
        const isActive = idx === currentStep;
        return (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <div className={`hidden sm:block h-px w-4 transition-colors duration-300 ${isCompleted ? "bg-amber-600" : "bg-stone-200 dark:bg-slate-700"}`} />
            )}
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap",
              isActive
                ? "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-2 border-amber-300 dark:border-amber-800 shadow-[0_0_12px_rgba(217,119,6,0.15)]"
                : isCompleted
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-200 dark:border-emerald-800"
                  : "bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-stone-400 border-2 border-stone-200 dark:border-slate-700"
            )}>
              {isCompleted ? <Check className="w-3 h-3" /> : <span className="w-3 text-center">{idx + 1}</span>}
              <span className="hidden sm:inline max-w-[80px] truncate">{label}</span>
            </div>
          )}
        )}
      </div>
    </div>
```

---

### 3. **Dropzone: Site Ticket Upload**

```tsx
// Empty state — Site Ticket Dropzone
<div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} onClick={() => inputRef.current?.click()} className={cn(
  "relative flex flex-col items-center justify-center py-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300",
  dragActive
    ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-[0_0_24px_rgba(217,119,6,0.15)]"
    : "border-stone-300 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 bg-stone-50 dark:bg-slate-800/50"
)}>
  <input ref={inputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={...} />

  <div className={cn(
    "w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300",
    dragActive ? "bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-300" : "bg-stone-100 dark:bg-slate-800 border-2 border-stone-300 dark:border-slate-700"
  )}>
    <FileUp className={cn("w-5 h-5 transition-colors duration-300", dragActive ? "text-amber-600 dark:text-amber-400" : "text-stone-400 dark:text-stone-500")} />
  </div>

  <span className="hidden sm:block text-[10px] font-black uppercase tracking-widest text-stone-700 dark:text-stone-300">
    DRAG & DROP OR CLICK TO UPLOAD
  </span>
  <span className="sm:hidden text-[10px] font-black uppercase tracking-widest text-stone-700 dark:text-stone-300">
    TAP TO UPLOAD
  </span>
  <span className="text-[8px] text-stone-400 dark:text-stone-500 uppercase tracking-widest mt-1.5">
    PDF, PNG, OR JPG — MAX 5 MB
  </span>
  {slot.error && (
    <p className="text-[8.5px] font-bold text-red-500 uppercase tracking-wider mt-3 px-4 text-center">{slot.error}</p>
  )}
</div>

// Selected state — Ticket Preview
<div className="rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
  <div className="flex items-start gap-3">
    {slot.thumbnailUrl ? (
      <img src={slot.thumbnailUrl} alt="Preview" className="w-16 h-16 rounded-xl object-cover border-2 border-stone-200 dark:border-slate-700" />
    ) : (
      <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 flex items-center justify-center">
        <FileText className="w-7 h-7 text-stone-400 dark:text-stone-500" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-1">
        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center border-2 border-emerald-300 dark:border-emerald-800">
          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
          TICKET SELECTED
        </span>
      </div>
      {slot.displayFilename && (
        <p className="text-[10px] font-mono text-stone-500 dark:text-stone-400 truncate" title={slot.displayFilename}>
          {slot.displayFilename}
        </p>
      )}
    </div>
    <button type="button" onClick={onRemoveFile} className="shrink-0 text-stone-400 hover:text-red-500 transition-colors cursor-pointer p-1" aria-label="Remove ticket">
      <X className="w-4 h-4" />
    </button>
  </div>
</div>
```

---

### 4. **Stepper: Site Progress Tracker**

```tsx
<div className="flex items-center justify-center gap-1.5 flex-wrap px-2 mb-6">
  {steps.map((label, idx) => {
    const isCompleted = idx < currentStep;
    const isActive = idx === currentStep;
    return (
      <React.Fragment key={idx}>
        {idx > 0 && (
          <div
            className={`hidden sm:block h-px w-4 transition-colors duration-300 ${isCompleted ? "bg-amber-600" : "bg-stone-200 dark:bg-slate-700"}`}
          />
        )}
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap",
            isActive
              ? "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-2 border-amber-300 dark:border-amber-800 shadow-[0_0_12px_rgba(217,119,6,0.15)]"
              : isCompleted
                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-200 dark:border-emerald-800"
                : "bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-stone-400 border-2 border-stone-200 dark:border-slate-700",
          )}
        >
          {isCompleted ? (
            <Check className="w-3 h-3" />
          ) : (
            <span className="w-3 text-center">{idx + 1}</span>
          )}
          <span className="hidden sm:inline max-w-[80px] truncate">{label}</span>
        </div>
      </React.Fragment>
    );
  })}
</div>
```

---

### 5. **Progress Bar: Pour Schedule Tracker**

```tsx
<div className="h-1.5 bg-stone-200 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
  <motion.div
    layout
    className="h-full bg-amber-600"
    style={{ width: `${(stepper.currentStep / (slots.length - 1 || 1)) * 100}%` }}
  />
</div>
```

---

### 6. **Expiry Date: Ticket Expiry**

```tsx
<div className="space-y-2">
  <label className="text-[8px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
    <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
    TICKET EXPIRY DATE
  </label>
  <input
    type="date"
    value={activeSlot.expiryDate}
    onChange={(e) => updateSlot(stepper.currentStep, { expiryDate: e.target.value })}
    className="w-full bg-stone-50 dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 text-xs text-stone-900 dark:text-white outline-none transition-colors min-h-[48px]"
  />
</div>
```

---

### 7. **Review Step: Ticket Register**

```tsx
<div className="bg-white dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 rounded-xl p-5">
  <h4 className="text-xs font-black uppercase tracking-widest text-stone-900 dark:text-white mb-4 pb-3 border-b-2 border-stone-200 dark:border-slate-700">
    REVIEW YOUR TICKETS
  </h4>
  <div className="space-y-3">
    {slots.map((slot, idx) => (
      <div
        key={slot.id}
        className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-slate-900/50 border-2 border-stone-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
      >
        {/* Thumbnail */}
        {slot.thumbnailUrl ? (
          <img
            src={slot.thumbnailUrl}
            alt={slot.cert}
            className="w-12 h-12 rounded-lg object-cover border-2 border-stone-200 dark:border-slate-700 shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-stone-100 dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-stone-400 dark:text-stone-500" />
          </div>
        )}
        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-stone-900 dark:text-white truncate">
            {slot.cert}
          </p>
          {slot.displayFilename && (
            <p className="text-[9px] font-mono text-stone-500 dark:text-stone-400 truncate">
              {slot.displayFilename}
            </p>
          )}
          <p className="text-[9px] text-stone-500 dark:text-stone-400 uppercase tracking-widest mt-0.5">
            EXPIRES: {slot.expiryDate ? new Date(slot.expiryDate).toLocaleDateString("en-GB") : "—"}
          </p>
        </div>
        {/* Status + edit */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center border-2 border-emerald-300 dark:border-emerald-800">
            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          </div>
          <button
            onClick={() => goToStep(idx)}
            className="text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer p-1"
            aria-label={`Edit ${slot.cert}`}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    ))}
  </div>
</div>
```

---

### 8. **Submit Button: Site Submission**

```tsx
<button
  type="button"
  onClick={handleSubmit}
  disabled={submitState.loading}
  className="w-full py-4 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 disabled:cursor-not-allowed text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-amber-600/20 transition-all min-h-[52px] cursor-pointer flex items-center justify-center gap-2"
>
  {submitState.loading ? (
    <>
      <Loader className="w-4 h-4 animate-spin" />
      SUBMITTING TICKETS…
    </>
  ) : (
    <>
      <Check className="w-4 h-4" />
      SUBMIT ALL TICKETS
    </>
  )}
</button>
```

---

### 9. **Navigation: Site Workflow Controls**

```tsx
{
  !isReviewStep && (
    <div className="flex items-center gap-3">
      {stepper.currentStep > 0 && (
        <button
          onClick={goBack}
          className="flex-1 py-3.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 border-2 border-stone-200 dark:border-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
        >
          <ChevronLeft className="w-4 h-4" /> BACK
        </button>
      )}
      <button
        onClick={goNext}
        disabled={!canAdvance()}
        className={cn(
          "flex-1 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all min-h-[48px] flex items-center justify-center gap-2 cursor-pointer",
          canAdvance()
            ? "bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20"
            : "bg-stone-100 dark:bg-slate-800 text-stone-400 dark:text-stone-500 border-2 border-stone-200 dark:border-slate-700 cursor-not-allowed",
        )}
      >
        {stepper.currentStep === slots.length - 1 ? "REVIEW" : "NEXT"}{" "}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

{
  isReviewStep && (
    <button
      onClick={goBack}
      className="w-full py-3 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 border-2 border-stone-200 dark:border-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
    >
      <ChevronLeft className="w-4 h-4" /> BACK TO EDITING
    </button>
  );
}
```

---

### 10. **Animated Checkmark: Ticket Accepted**

```tsx
const AnimatedCheckmark: React.FC = () => (
  <div className="relative w-20 h-20 mx-auto">
    <svg viewBox="0 0 80 80" className="w-full h-full">
      <circle
        cx="40"
        cy="40"
        r="36"
        fill="none"
        stroke="color-mix(in srgb, var(--cured-green) 20%, transparent)"
        strokeWidth="3"
        className="animate-[scaleIn_0.4s_ease_out_forwards]"
        style={{ transformOrigin: "center" }}
      />
      <circle
        cx="40"
        cy="40"
        r="28"
        fill="color-mix(in srgb, var(--cured-green) 6%, transparent)"
        className="animate-[scaleIn_0.5s_ease_out_0.1s_forwards]"
        style={{ transformOrigin: "center", opacity: 0 }}
      />
      <path
        d="M24 42 L34 52 L56 30"
        fill="none"
        stroke="var(--cured-green)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-[drawCheck_0.5s_ease_out_0.3s_forwards]"
        style={{ strokeDasharray: 60, strokeDashoffset: 60 }}
      />
    </svg>
  </div>
);
```

---

### 11. **Micro-Interactions (CSS)**

```css
/* Amber focus rings */
input:focus,
select:focus,
textarea:focus {
  @apply border-amber-500 ring-1 ring-amber-500;
}

/* Button press */
.btn-site:active {
  @apply scale-[0.98];
}

/* Progress ring amber */
.progress-ring circle:last-child {
  @apply text-amber-600;
}

/* Stepper active pulse */
@keyframes stepper-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgb(217 119 6 / 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgb(217 119 6 / 0);
  }
}
.stepper-active {
  animation: stepper-pulse 2s infinite;
}

/* Dropzone active glow */
@keyframes dropzone-glow {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgb(217 119 6 / 0.3);
  }
  50% {
    box-shadow: 0 0 24px 4px rgb(217 119 6 / 0.2);
  }
}
.dropzone-active {
  animation: dropzone-glow 1.5s infinite;
}

/* Checkmark draw */
@keyframes drawCheck {
  0% {
    stroke-dashoffset: 60;
  }
  100% {
    stroke-dashoffset: 0;
  }
}
.animate-drawCheck {
  animation: drawCheck 0.5s ease-out 0.3s forwards;
}
```

---

## CRITIC FEEDBACK

| Aspect                 | Original                              | Editor                                            | Critic Assessment                                      |
| ---------------------- | ------------------------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| **Visual Identity**    | Generic SaaS (slate/blue)             | Concrete/Flooring (amber/stone/emerald)           | **Strong improvement** — domain personality throughout |
| **Terminology**        | "Certification", "Document", "Submit" | "Ticket", "Ticket Register", "Submit Tickets"     | **Clear** — matches site office language               |
| **Upload UX**          | Excellent 3-state dropzone            | Same UX, domain styling                           | **Excellent** — best-in-class upload preserved         |
| **Wizard Pattern**     | Standard stepper                      | Site Progress Tracker                             | **Authentic** — matches pour scheduling                |
| **Progress Indicator** | Standard bar                          | Pour Schedule Tracker                             | **Domain-native** — concrete scheduling metaphor       |
| **Status Indicators**  | Semantic colors                       | Industry-mapped (Amber=pending, Emerald=approved) | **Clear** — instant recognition                        |
| **Review Step**        | Generic review                        | Ticket Register                                   | **Authentic** — matches site paperwork                 |
| **Color Palette**      | Slate/Blue/Primary                    | Amber/Stone/Emerald/Rust                          | **Authentic** — concrete industry colors               |
| **Micro-interactions** | Motion/react transitions              | + Amber pulse, focus rings, draw check            | **Polished** — feels alive                             |

**Risk Areas:**

- Color contrast on amber backgrounds — verify WCAG AA
- Amber focus rings — ensure visible in light/dark
- Stepper density on mobile — may need responsive adjustment

---

## APPLY — Implementation Priority

1. **Color System** — CSS variables for amber/stone/emerald palette
2. **Page Header** — Site Office Document Portal
3. **Dropzone** — Site Ticket Dropzone (3 states)
4. **Stepper** — Site Progress Tracker
5. **Progress Bar** — Pour Schedule Tracker
6. **Review Step** — Ticket Register
7. **Buttons/Inputs** — Amber focus, stone borders
8. **Confirm Dialog** — Safety notice style
9. **Animated Checkmark** — Cured green
10. **Micro-interactions** — CSS animations

---

**Estimated Effort:** 1 day for full page overhaul  
**Dependencies:** CSS variable system, icon additions  
**Testing:** Light/dark mode, responsive, accessibility (WCAG AA)  
**Rollout:** Feature flag for gradual deployment

---

**Total Design Pairs:** 11 major sections = ~22 ORIGINAL/EDITOR/CRITIC pairs
