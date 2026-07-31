# Design Audit: QuoteInvoiceBuilder.tsx

**Component:** `src/opus/components/QuoteInvoiceBuilder.tsx`  
**Type:** Large composite component (1191 lines) — Quote/Valuation Builder with live PDF preview  
**Audit Date:** 2026-07-29  
**Status:** ORIGINAL/EDITOR/CRITIC analysis complete — ready for application

---

## ORIGINAL — Current Design Patterns

### 1. **Two-Panel Layout (Standard SaaS Pattern)**

```tsx
<div className="flex flex-col lg:flex-row gap-5 pb-10">
  {/* -- LEFT PANEL: Form -- */}
  <div className="flex flex-col gap-5 flex-1 min-w-0">
    {/* Accordion: Saved History */}
    {/* Client Details */}
    {/* Line Items */}
    {/* Terms */}
    {/* Totals + Send */}
  </div>
  {/* -- RIGHT PANEL: Live PDF Mirror -- */}
  <div className="w-full lg:w-[440px] xl:w-[500px] 2xl:w-[580px] shrink-0">
    <div className="hidden lg:block sticky top-[58px]">
      <div className="w-full relative flex justify-center items-start overflow-hidden bg-background border border-border py-6 rounded-xl">
        {pdfDocument(scale, true)}
      </div>
    </div>
  </div>
</div>
```

- **Pattern:** Left form / Right preview (classic invoice builder)
- **Right panel:** Sticky PDF mirror, desktop only
- **Mobile:** Full-screen modal preview (`previewOpen` state)
- **Critique:** Standard layout, no domain personality. PDF mirror is passive, not interactive.

---

### 2. **Sticky Action Bar (Standard)**

```tsx
<div className="sticky top-16 lg:top-0 z-40 bg-background/90 backdrop-blur border-b border-border mb-4">
  <div className="w-full py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
    <button onClick={onBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-[11px] font-black uppercase tracking-widest shrink-0">← Back</button>
    <div className="w-px h-4 bg-border hidden sm:block" />
    <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 flex-1 sm:flex-initial min-w-0">
      <span className="text-[11px] font-black tracking-widest text-muted-foreground uppercase whitespace-nowrap">Ref</span>
      <input className="bg-transparent border-none outline-none text-primary text-xs font-black tracking-widest uppercase font-mono w-full sm:w-24 min-w-0" value={quoteReference} onChange={...} />
    </div>
    <div className="flex items-center gap-2 sm:shrink-0">
      <button onClick={() => setPreviewOpen(true)} className="lg:hidden flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-secondary border border-border rounded-lg px-3 py-1.5 text-foreground/85 text-[11px] font-bold tracking-widest uppercase hover:bg-secondary/70 transition-colors"> <Eye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Preview</span> </button>
      <button onClick={handleSaveDraft} className="..."> <Save className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{lastSaved ? "SAVED" : "SAVE"}</span> </button>
      <button onClick={handleDownloadPDF} className="..."> <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">PDF</span> </button>
      <button onClick={handleSend} disabled={isSendingEmail} className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-primary hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-1.5 text-white text-[11px] font-black uppercase tracking-widest cursor-pointer transition-all"> {isSendingEmail ? <Spinner /> : <Send className="w-3.5 h-3.5" />} <span className="hidden sm:inline">{isSendingEmail ? "SENDING..." : "SEND"}</span> </button>
    </div>
  </div>
</div>
```

**CRITIC FEEDBACK:** Generic sticky bar with standard icon buttons. No domain personality (concrete industry). "SAVE"/"SEND" labels are generic.

---

### 3. **Accordion Sections (Repeated 5 Times)**

**Pattern:**

```tsx
<div className="bg-card border border-border rounded-xl overflow-hidden">
  <button
    type="button"
    onClick={() => setShowHistory((h) => !h)}
    className="w-full flex items-center justify-between p-4 text-[11px] font-black tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
  >
    <div className="flex items-center gap-2">
      {" "}
      <History className="w-3.5 h-3.5" /> Saved History ({savedQuotes.length}){" "}
    </div>
    {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
  </button>
  {showHistory && (
    <div className="px-4 pb-4 flex flex-col gap-[5px] max-h-52 overflow-y-auto custom-scrollbar">
      {content}
    </div>
  )}
</div>
```

**Variations:** Saved History, Client Details, Line Items, Terms, Summary & Authorization
**CRITIC FEEDBACK:** 5 identical accordion structures. No visual differentiation between primary/secondary sections. Generic "card + border + rounded-xl" styling.

---

### 4. **Form Fields — Generic Input Pattern**

**Client Details:**

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
  <div className="flex flex-col gap-1.5">
    <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
      Client Name
    </span>
    <div className="flex items-center bg-secondary border border-border rounded-xl p-2.5 px-3 focus-within:border-primary transition-colors">
      <input
        type="text"
        className="w-full bg-transparent border-none outline-none text-foreground text-[11px] placeholder:text-muted-foreground/50 font-medium"
        placeholder="e.g. ABC CONSTRUCTIONS LTD"
      />
    </div>
  </div>
  <div className="flex flex-col gap-1.5">
    <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
      Email
    </span>
    <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl p-2.5 px-3 focus-within:border-primary transition-colors">
      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
      <input
        type="email"
        className="w-full bg-transparent border-none outline-none text-foreground text-[11px] placeholder:text-muted-foreground/50 font-medium"
      />
    </div>
  </div>
  ...
</div>
```

**Line Items (with suggestion dropdown):**

```tsx
<div className="p-3 bg-background border border-border rounded-xl relative group">
  <button className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-red-400 transition-colors p-1 cursor-pointer z-10"> <Trash2 className="w-4 h-4" /> </button>
  <div className="flex flex-col gap-2.5">
    <div className="relative flex-1 pr-7">
      <input type="text" className="w-full bg-transparent border-none outline-none text-foreground text-xs placeholder:text-muted-foreground font-bold tracking-wider py-1.5" placeholder="Description of item..." onFocus={() => setFocusedItemId(item.id)} />
      <AnimatePresence> {focusedItemId === item.id && ( <motion.div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto no-scrollbar"> {suggestions.map(...)} </motion.div> )} </AnimatePresence>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <div className="flex flex-col gap-1"> <span className="text-[9px] font-black tracking-widest text-muted-foreground uppercase">Qty</span> <div className="flex items-center bg-card border border-border rounded-lg h-9 px-2"> <input type="number" className="w-full bg-transparent border-none outline-none text-foreground text-xs font-mono font-bold" /> </div> </div>
      <div className="flex flex-col gap-1"> <span className="text-[9px] font-black tracking-widest text-muted-foreground uppercase">Unit</span> <div className="relative flex items-center bg-card border border-border rounded-lg h-9 px-2"> <input type="text" ... /> <AnimatePresence> {unitFocusedItemId === item.id && <motion.div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto no-scrollbar"> {COMMON_UNITS.map(...)} </motion.div> } </AnimatePresence> </div> </div>
      <div className="flex flex-col gap-1"> <span className="text-[9px] font-black tracking-widest text-muted-foreground uppercase">Rate (£)</span> <div className="flex items-center bg-card border border-border rounded-lg h-9 px-2 gap-1.5"> <input type="text" ... /> <button className={cn(isIncludedRate ? "bg-primary text-white" : "bg-background text-muted-foreground border border-border")}> INCL </button> </div> </div>
      <div className="flex flex-col gap-1"> <span className="text-[9px] font-black tracking-widest text-muted-foreground uppercase">Total</span> <div className="flex items-center h-9 px-1 text-xs font-black font-mono text-primary"> {isIncludedRate ? "INCL" : `£${getLineTotal(item).toLocaleString(...)}`} </div> </div>
    </div>
  </div>
</div>
```

**CRITIC FEEDBACK:** Repetitive form field structure. Labels = uppercase tracking-wider. Inputs = bg-transparent border-none. Suggested items dropdown is nice but generic.

---

### 5. **Empty States — Generic**

```tsx
{
  items.length === 0 && (
    <div className="bg-background border border-dashed border-border/60 rounded-xl p-8 text-center">
      <div className="text-[11px] font-black tracking-widest text-muted-foreground uppercase mb-3">
        No line items added yet
      </div>
      <button
        type="button"
        onClick={addItem}
        className="text-[11px] font-black tracking-wide text-primary hover:brightness-110 uppercase bg-secondary px-4 py-2 rounded-lg border border-border"
      >
        {" "}
        Initialize First Line{" "}
      </button>
    </div>
  );
}

{
  savedQuotes.length === 0 && (
    <div className="bg-background border border-dashed border-border rounded-lg p-6 text-center">
      <div className="text-[11px] font-black tracking-widest text-muted-foreground uppercase">
        {" "}
        No saved quotes found{" "}
      </div>
    </div>
  );
}
```

---

### 6. **ConfirmDialog — Repeated 2 Times**

```tsx
<ConfirmDialog
  open={!!quoteToDelete}
  onOpenChange={(open) => { if (!open) setQuoteToDelete(null); }}
  tone="destructive"
  tag="This Cannot Be Undone"
  title="Delete Quote"
  message={...}
  confirmLabel="Delete Quote"
  onConfirm={deleteQuote}
/>
```

```tsx
<NoticeModal
  open={validationErrors.length > 0}
  onOpenChange={(open) => { if (!open) setValidationErrors([]); }}
  tone="error"
  tag="VALIDATION FAILURE"
  title="VALIDATION FAILURE"
  message={<ul>{validationErrors.map(...)}}</ul>}
  actionLabel="DISMISS"
/>
```

---

### 7. **Saved History List — Card Pattern**

```tsx
savedQuotes.map((q) => (
  <div key={q.id} onClick={() => loadQuote(q)} className="flex items-center justify-between bg-background border border-border rounded-lg p-2.5 px-3 hover:border-primary/30 cursor-pointer transition-all duration-200">
    <div>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-foreground/85"> {q.reference} </span>
        <span className="text-[11px] text-muted-foreground">{q.date}</span>
      </div>
    </div>
    <div className="flex items-center gap-2.5">
      <span className="text-[11px] font-mono font-black uppercase tracking-widest text-muted-foreground"> £ {q.totals?.grossTotal?.toLocaleString(...)} </span>
      <button onClick={(e) => confirmDeleteQuote(e, q)} className="bg-transparent border-none cursor-pointer text-muted-foreground p-0.5 flex items-center hover:text-red-500 transition-colors" title="Delete saved quote"> <Trash2 className="w-3.5 h-3.5" /> </button>
    </div>
  </div>
))
```

---

### 8. **PDF Preview — Live Mirror**

**Desktop (sticky sidebar):**

```tsx
<div className="hidden lg:block sticky top-[58px]">
  <div className="flex items-center gap-2 text-muted-foreground px-1 mb-3">
    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
    <span className="text-[11px] font-black uppercase tracking-[0.2em]"> PDF Live Mirror </span>
  </div>
  <div
    ref={containerRef}
    className="w-full relative flex justify-center items-start overflow-hidden bg-background border border-border py-6 rounded-xl font-archivo no-scrollbar"
  >
    {pdfDocument(scale, true)}
  </div>
</div>
```

**Mobile (modal):**

```tsx
<AnimatePresence>
  {previewOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="lg:hidden fixed inset-0 z-[95] bg-black/85 backdrop-blur-sm flex flex-col"
    >
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/85 flex items-center gap-2">
          {" "}
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" /> PDF Live Preview{" "}
        </span>
        <button
          onClick={() => setPreviewOpen(false)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          {" "}
          <X className="w-5 h-5" />{" "}
        </button>
      </div>
      <div
        ref={modalContainerRef}
        className="flex-1 overflow-y-auto flex justify-center items-start bg-background py-6 px-3 font-archivo no-scrollbar"
      >
        {" "}
        {pdfDocument(modalScale)}{" "}
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

---

### 9. **Validation Error Modal**

```tsx
<NoticeModal
  open={validationErrors.length > 0}
  onOpenChange={(open) => { if (!open) setValidationErrors([]); }}
  tone="error"
  tag="VALIDATION FAILURE"
  title="VALIDATION FAILURE"
  message={<ul>{validationErrors.map(...)}</ul>}
  actionLabel="DISMISS"
/>
```

---

### 10. **Totals Grid — Standard**

```tsx
<div className="flex flex-col gap-2">
  <div className="flex justify-between text-[13px] border-b border-border pb-2">
    <span className="text-muted-foreground">Net Total</span>
    <span className="font-semibold font-mono">
      {" "}
      £{totals.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
    </span>
  </div>
  <div className="flex justify-between text-[16px] pt-1">
    <span className="font-bold text-foreground">Total</span>
    <span className="font-extrabold text-primary font-mono">
      {" "}
      £{totals.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
    </span>
  </div>
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

### 1. **Action Bar: Site Office Toolbar**

```tsx
<div className="sticky top-16 lg:top-0 z-40 bg-formwork/95 dark:bg-formwork-dark/95 backdrop-blur border-b border-stone-200 dark:border-slate-700 shadow-sm">
  <div className="max-w-7xl mx-auto px-4 sm:px-6">
    <div className="w-full py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-[11px] font-black uppercase tracking-widest shrink-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          BACK TO SITES
        </button>
        <div className="w-px h-5 bg-stone-200 dark:bg-slate-700 hidden sm:block" />

        {/* Quote Reference — Batch Ticket Style */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg px-3 py-2 flex-1 sm:flex-initial min-w-0">
          <span className="text-[11px] font-black tracking-widest text-stone-500 dark:text-stone-400 uppercase whitespace-nowrap">
            BATCH REF
          </span>
          <input
            className="bg-transparent border-none outline-none text-amber-700 dark:text-amber-300 text-xs font-black tracking-widest uppercase font-mono w-full sm:w-24 min-w-0"
            value={quoteReference}
            onChange={(e) => setQuoteReference(e.target.value)}
            placeholder="JOB-0000"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:shrink-0">
        <button
          onClick={() => setPreviewOpen(true)}
          className="lg:hidden flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg px-3 py-2 text-stone-700 dark:text-stone-300 text-[11px] font-bold tracking-widest uppercase hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">PREVIEW</span>
        </button>

        <button
          onClick={handleSaveDraft}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg px-3 py-2 text-stone-700 dark:text-stone-300 text-[11px] font-bold tracking-widest uppercase hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{lastSaved ? "SAVED" : "SAVE DRAFT"}</span>
        </button>

        <button
          onClick={handleDownloadPDF}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg px-3 py-2 text-stone-700 dark:text-stone-300 text-[11px] font-bold tracking-widest uppercase hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">PDF</span>
        </button>

        <button
          onClick={handleSend}
          disabled={isSendingEmail}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-white text-[11px] font-black uppercase tracking-widest cursor-pointer transition-all shadow-lg shadow-amber-600/20"
        >
          {isSendingEmail ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">
            {isSendingEmail ? "SENDING..." : "SEND TO CLIENT"}
          </span>
        </button>
      </div>
    </div>
  </div>
</div>
```

**Domain touches:**

- "BACK TO SITES" — site office language
- "BATCH REF" — concrete batch ticket terminology
- Amber primary button (concrete brand)
- Stone/formwork background (construction site aesthetic)

---

### 2. **Section Cards: Concrete Formwork Panels**

```tsx
{
  /* SAVED HISTORY — Formwork Panel */
}
<div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
  <button
    type="button"
    onClick={() => setShowHistory((h) => !h)}
    className="w-full flex items-center justify-between p-4 text-[11px] font-black tracking-widest uppercase text-stone-500 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
  >
    <div className="flex items-center gap-2">
      <History className="w-3.5 h-3.5 text-amber-600" />
      <span>SAVED QUOTES ({savedQuotes.length})</span>
    </div>
    {showHistory ? (
      <ChevronUp className="w-4 h-4 text-amber-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-stone-400" />
    )}
  </button>
  {showHistory && (
    <div className="px-4 pb-4 flex flex-col gap-[5px] max-h-52 overflow-y-auto custom-scrollbar border-t border-stone-200 dark:border-slate-700">
      {content}
    </div>
  )}
</div>;
```

**Domain touches:**

- Amber accent for expandable sections (concrete brand)
- "SAVED QUOTES" instead of "Saved History" — domain language
- Amber chevron when expanded (active state)

---

### 3. **Form Fields: Batch Ticket Input Style**

```tsx
{
  /* CLIENT DETAILS — Batch Ticket Style */
}
<div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl p-4 sm:p-6 space-y-4">
  <div className="flex items-center gap-2 border-b border-stone-200 dark:border-slate-700 pb-3">
    <Building2 className="w-4 h-4 text-amber-600" />
    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
      CLIENT & PROJECT
    </h3>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">
        CLIENT NAME
      </label>
      <div className="relative">
        <input
          type="text"
          className="w-full bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-600 rounded-lg px-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          placeholder="ABC CONSTRUCTIONS LTD"
        />
      </div>
    </div>

    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">
        EMAIL
      </label>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="email"
          className="w-full bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-600 rounded-lg pl-10 pr-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          placeholder="accounts@client.com"
        />
      </div>
    </div>

    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">
        PROJECT / SITE NAME
      </label>
      <div className="relative">
        <LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="text"
          className="w-full bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-600 rounded-lg pl-10 pr-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          placeholder="PROJECT TITAN"
        />
      </div>
    </div>

    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">
        SITE POSTCODE
      </label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="text"
          className="w-full bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-600 rounded-lg pl-10 pr-4 py-3 text-sm font-mono font-medium text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 tracking-wide"
          placeholder="SW1A 1AA"
        />
      </div>
      {clientInfo.postcode.trim() && !isValidUKPostcode(clientInfo.postcode) && (
        <p className="text-[11px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">
          INVALID UK POSTCODE FORMAT
        </p>
      )}
    </div>
  </div>
</div>;
```

**Domain touches:**

- Labels = ALL CAPS, font-black (batch ticket style)
- Amber-600 focus rings (concrete brand)
- Icons in input prefixes (Building2, Mail, LayoutGrid, MapPin)
- Validation = "INVALID UK POSTCODE FORMAT" (site notice style)

---

### 4. **Line Items: Concrete Delivery Ticket Grid**

```tsx
{/* LINE ITEMS — Delivery Ticket Grid */}
<div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl p-4 sm:p-6 space-y-4">
  <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-700 pb-3">
    <div className="flex items-center gap-2">
      <ClipboardList className="w-4 h-4 text-amber-600" />
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">LINE ITEMS — DELIVERY TICKET</h3>
    </div>
    <button type="button" onClick={addItem} className="flex items-center gap-1.5 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg p-1.5 px-3 text-stone-700 dark:text-stone-300 text-[11px] font-bold tracking-widest uppercase hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors">
      <Plus className="w-3.5 h-3.5 text-amber-600" />
      ADD LINE
    </button>
  </div>

  <div className="flex flex-col gap-2">
    {items.map((item) => (
      <div key={item.id} className="p-4 bg-stone-50 dark:bg-slate-900/50 border border-stone-200 dark:border-slate-700 rounded-xl relative group">
        <button type="button" onClick={() => removeItem(item.id)} className="absolute top-3 right-3 text-stone-400 hover:text-red-500 transition-colors p-1 cursor-pointer z-10"> <Trash2 className="w-4 h-4" /> </button>

        <div className="flex flex-col gap-3">
          {/* Description with Suggested Items Dropdown */}
          <div className="relative flex-1 pr-7">
            <input type="text" className="w-full bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm font-bold tracking-wider outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" placeholder="Description of item..." onFocus={() => setFocusedItemId(item.id)} />
            {focusedItemId === item.id && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto no-scrollbar">
                {SUGGESTED_ITEMS.filter(s => !item.description || s.description.toLowerCase().includes(item.description.toLowerCase())).map(suggestion => (
                  <button type="button" onClick={() => updateItem(item.id, { description: suggestion.description, unit: suggestion.unit, rate: suggestion.rate })} className="w-full text-left px-4 py-3 text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors border-b border-stone-100 dark:border-slate-800 last:border-none flex justify-between items-center">
                    <span>{suggestion.description}</span>
                    <span className="text-amber-600 dark:text-amber-400 font-mono text-[11px]">£{suggestion.rate}/{suggestion.unit}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Labeled Grid for Qty / Unit / Rate / Total */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">QTY</label>
              <div className="relative flex items-center bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-600 rounded-xl h-10 px-3">
                <input type="number" className="w-full bg-transparent border-none outline-none text-foreground text-sm font-mono font-bold" value={item.quantity} onChange={...} />
              </div>
            </div>

            <div className="relative flex flex-col gap-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">UNIT</label>
              <div className="relative flex items-center bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-600 rounded-xl h-10 px-3">
                <input type="text" className="w-full bg-transparent border-none outline-none text-foreground text-sm font-bold uppercase" value={item.unit} onChange={...} onFocus={() => setUnitFocusedItemId(item.id)} placeholder="Unit..." />
                {unitFocusedItemId === item.id && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto no-scrollbar">
                    {COMMON_UNITS.filter(u => !item.unit || u.toLowerCase().includes(item.unit.toLowerCase())).map(u => (
                      <button key={u} type="button" onClick={() => updateItem(item.id, { unit: u })} className="w-full text-left px-4 py-2 text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors border-b border-stone-100 dark:border-slate-800 last:border-none">{u}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="relative flex flex-col gap-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">RATE (£)</label>
              <div className="relative flex items-center bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-600 rounded-xl h-10 px-3 gap-2">
                <input type="text" className="w-full bg-transparent border-none outline-none text-foreground text-sm font-mono font-bold" value={item.rate} onChange={...} placeholder="0.00" />
                <button type="button" onClick={() => updateItem(item.id, { rate: isIncludedRate(item.rate) ? 0 : "INCLUDED" })} className={cn(isIncludedRate(item.rate) ? "bg-amber-600 text-white shadow-sm" : "bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-slate-700 hover:bg-stone-200 dark:hover:bg-slate-700")}>
                  INCL
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">TOTAL</label>
              <div className="relative flex items-center bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-600 rounded-xl h-10 px-3">
                <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">{isIncludedRate(item.rate) ? "INCL" : `£${getLineTotal(item).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ))}
  {items.length === 0 && (
    <div className="bg-stone-50 dark:bg-slate-900/30 border-2 border-dashed border-stone-200 dark:border-slate-700 rounded-xl p-8 text-center">
      <ClipboardList className="w-10 h-10 mx-auto mb-3 text-amber-400" />
      <p className="text-sm font-bold text-stone-700 dark:text-slate-300 uppercase tracking-wider">NO LINE ITEMS</p>
      <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">Initialize your first delivery line to begin the quote</p>
      <button type="button" onClick={addItem} className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-600/20">INITIALIZE FIRST LINE</button>
    </div>
  )}
</div>
```

**Domain touches:**

- "LINE ITEMS — DELIVERY TICKET" header
- "INCL" button = Included in rate (construction terminology)
- Amber focus rings, stone borders
- Suggested items = concrete industry standard items
- Total column = amber text (concrete brand)

---

### 5. **Terms & Conditions: Site Safety Notice Style**

```tsx
{/* TERMS — Site Safety Notice */}
<div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl p-4 sm:p-6 space-y-4">
  <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-700 pb-3">
    <div className="flex items-center gap-2">
      <FileText className="w-4 h-4 text-amber-600" />
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">TERMS & CONDITIONS — SITE NOTICE</h3>
    </div>
    <button type="button" onClick={() => setTerms([...terms, ""])} className="bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg w-[28px] h-[28px] flex items-center justify-center cursor-pointer text-stone-500 dark:text-stone-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {terms.map((term, index) => (
      <div key={index} className="flex items-start justify-between gap-3 bg-stone-50 dark:bg-slate-900/30 border border-stone-200 dark:border-slate-700 rounded-xl p-3">
        <textarea value={term} onChange={...} rows={2} className="w-full bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white leading-relaxed resize-none min-h-0 font-medium placeholder:text-stone-400" placeholder="Enter condition..." />
        <button type="button" onClick={() => setTerms(terms.filter((_, i) => i !== index))} className="text-stone-400 hover:text-red-500 transition-colors p-1 shrink-0"><X className="w-3.5 h-3.5" /></button>
      </div>
    ))}
  </div>
</div>
```

---

### 6. **Summary & Authorization: Delivery Receipt Style**

```tsx
{
  /* SUMMARY & AUTHORIZATION — Delivery Receipt */
}
<div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl p-4 sm:p-6 space-y-4">
  <div className="flex items-center gap-2 border-b border-stone-200 dark:border-slate-700 pb-3">
    <CheckCircle2 className="w-4 h-4 text-amber-600" />
    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
      SUMMARY & AUTHORIZATION
    </h3>
  </div>

  {/* Totals Grid — Receipt Style */}
  <div className="bg-stone-50 dark:bg-slate-900/50 border border-stone-200 dark:border-slate-700 rounded-xl p-4">
    <div className="flex justify-between text-sm border-b border-stone-200 dark:border-slate-700 pb-2">
      <span className="text-stone-500">NET TOTAL</span>
      <span className="font-semibold font-mono text-amber-700 dark:text-amber-300">
        £{totals.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </span>
    </div>
    <div className="flex justify-between text-lg pt-2">
      <span className="font-bold text-slate-900 dark:text-white">TOTAL</span>
      <span className="font-extrabold text-amber-600 dark:text-amber-400 font-mono">
        £{totals.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </span>
    </div>
  </div>
</div>;
```

---

### 7. **PDF Preview: Delivery Receipt Mirror**

```tsx
{/* RIGHT PANEL: Live PDF Mirror — Delivery Receipt */}
<div className="w-full lg:w-[440px] xl:w-[500px] 2xl:w-[580px] shrink-0">
  <div className="hidden lg:block sticky top-[58px]">
    <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 px-1 mb-3">
      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      <span className="text-[11px] font-black uppercase tracking-[0.2em]">DELIVERY RECEIPT MIRROR</span>
    </div>
    <div ref={containerRef} className="w-full relative flex justify-center items-start overflow-hidden bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 py-6 rounded-xl font-archivo no-scrollbar">
      {pdfDocument(scale, true)}
    </div>
  </div>

  {/* Mobile Modal */}
  <AnimatePresence>
    {previewOpen && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="lg:hidden fixed inset-0 z-[95] bg-black/85 backdrop-blur-sm flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-stone-200 dark:border-slate-700 shrink-0">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            DELIVERY RECEIPT
          </span>
          <button onClick={() => setPreviewOpen(false)} className="text-stone-400 hover:text-white transition-colors p-1"><X className="w-5 h-5" /></button>
        </div>
        <div ref={modalContainerRef} className="flex-1 overflow-y-auto flex justify-center items-start bg-white dark:bg-slate-900 py-6 px-3 font-archivo no-scrollbar">{pdfDocument(modalScale)}</div>
      </motion.div>
    )}
  </AnimatePresence>
```

---

### 8. **Empty States: Site Context + CTA**

```tsx
// No line items
<div className="bg-stone-50 dark:bg-slate-900/30 border-2 border-dashed border-stone-200 dark:border-slate-700 rounded-xl p-8 text-center">
  <ClipboardList className="w-12 h-12 mx-auto mb-3 text-amber-400" />
  <p className="text-sm font-bold text-stone-700 dark:text-slate-300 uppercase tracking-wider">NO LINE ITEMS</p>
  <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">Initialize your first delivery line to begin the quote</p>
  <button type="button" onClick={addItem} className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-600/20">INITIALIZE FIRST LINE</button>
</div>

// No saved quotes
<div className="bg-stone-50 dark:bg-slate-900/30 border-2 border-dashed border-stone-200 dark:border-slate-700 rounded-xl p-6 text-center">
  <History className="w-10 h-10 mx-auto mb-3 text-stone-400" />
  <p className="text-sm font-bold text-stone-700 dark:text-slate-300 uppercase tracking-wider">NO SAVED QUOTES</p>
  <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">Create your first quote draft to see it here</p>
</div>

// Validation error modal
<NoticeModal ... message={<>
  <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-relaxed mb-4">THE FOLLOWING FIELDS ARE REQUIRED BEFORE SENDING:</p>
  <ul className="space-y-2">
    {validationErrors.map((error, idx) => (
      <li key={idx} className="flex items-center gap-2 text-[11px] text-red-300 uppercase font-black tracking-widest bg-white/10 dark:bg-slate-800 border border-red-500/20 p-2.5 rounded-lg">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500/80" />
        {error}
      </li>
    ))}
  </ul>
</>} ... />
```

---

### 9. **Confirm Dialogs: Site Safety Notice Style**

```tsx
<ConfirmDialog
  open={!!quoteToDelete}
  onOpenChange={(open) => {
    if (!open) setQuoteToDelete(null);
  }}
  tone="destructive"
  tag="THIS CANNOT BE UNDONE"
  title="DELETE QUOTE"
  message={
    <>
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-700 dark:text-slate-300">
          <p className="font-bold">Delete Quote {quoteToDelete?.reference}?</p>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            This action is irreversible and will permanently delete this quote draft from the
            database.
          </p>
        </div>
      </div>
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs font-mono text-amber-800 dark:text-amber-200">
        Action cannot be undone. Audit log will record this deletion.
      </div>
    </>
  }
  confirmLabel="DELETE QUOTE"
  cancelLabel="KEEP QUOTE"
  confirmButtonClassName="bg-red-600 hover:bg-red-700 text-white"
/>
```

---

### 10. **Micro-Interactions**

```css
/* Card hover lift */
.quote-card {
  @apply transition-all duration-200;
}
.quote-card:hover {
  @apply -translate-y-0.5 shadow-lg;
  box-shadow:
    0 10px 25px -5px rgb(217 119 6 / 0.2),
    0 8px 10px -6px rgb(217 119 6 / 0.1);
}

/* Button press */
.btn-concrete:active {
  @apply scale-[0.98];
}

/* Amber focus ring */
input:focus,
select:focus,
textarea:focus {
  @apply border-amber-500 ring-1 ring-amber-500;
}

/* Status badge pulse for sent quotes */
@keyframes pulse-amber {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgb(217 119 6 / 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgb(217 119 6 / 0);
  }
}
.status-sent {
  animation: pulse-amber 2s infinite;
}

/* Suggested items dropdown fade-in */
@keyframes dropdown-fade {
  0% {
    opacity: 0;
    transform: translateY(-8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
.dropdown-enter {
  animation: dropdown-fade 0.15s ease-out;
}

/* Line item hover */
.line-item {
  @apply transition-all duration-200;
}
.line-item:hover {
  @apply bg-stone-50 dark:bg-slate-900/50;
}

/* Send button loading spin */
@keyframes spin-amber {
  to {
    transform: rotate(360deg);
  }
}
.send-loading .spinner {
  animation: spin-amber 0.8s linear infinite;
}
```

---

## CRITIC FEEDBACK

| Aspect                 | Original                  | Editor                                                | Critic Assessment                                      |
| ---------------------- | ------------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| **Visual Identity**    | Generic SaaS (slate/blue) | Concrete/Construction (amber/stone)                   | **Strong improvement** — domain personality throughout |
| **Layout**             | Standard two-panel        | Formwork panel + delivery receipt mirror              | **Authentic** — matches site office workflow           |
| **Action Bar**         | Generic sticky            | Site office toolbar (batch ref, amber send)           | **Significant** — site office language                 |
| **Forms**              | Generic inputs            | Batch ticket fieldsets, amber focus, mix descriptions | **Strong** — domain language                           |
| **Line Items**         | Generic grid              | Delivery ticket grid, suggested concrete items        | **Domain-native** — matches real paperwork             |
| **PDF Preview**        | "Live Mirror"             | "Delivery Receipt Mirror"                             | **Clear** — matches actual output                      |
| **Empty States**       | Generic text              | Contextual illustrations + CTAs                       | **Major** — guides to action                           |
| **Confirm Dialogs**    | Generic warnings          | Safety notice style, context-aware                    | **Safety-critical** — appropriate gravity              |
| **Color Palette**      | Slate/Blue                | Amber/Stone (concrete site colors)                    | **Authentic** — matches industry                       |
| **Micro-interactions** | None                      | Hover lift, amber pulse, dropdown fade                | **Polish** — feels alive                               |

**Risk Areas:**

- Color contrast on stone/amber — verify WCAG AA
- Amber focus rings — ensure visible in light/dark
- Batch ticket label sizing on mobile
- PDF preview scaling on tablet breakpoints

---

## APPLY — Implementation Priority

1. **Color System** — CSS variables for amber/stone palette
2. **Action Bar** — Site office toolbar
3. **Form Fields** — Batch ticket fieldsets + amber focus
4. **Line Items** — Delivery ticket grid
5. **Action Buttons** — Amber primary, stone secondary
6. **Empty States** — Illustrations + CTAs
7. **Confirm Dialogs** — Safety notice style
8. **PDF Preview** — Delivery receipt branding
9. **Micro-interactions** — CSS animations
10. **Section Cards** — Formwork panels

---

**Estimated Effort:** 2-3 days for full component overhaul  
**Dependencies:** CSS variable system, icon additions (Truck, Building2, etc.)  
**Testing:** Light/dark mode, responsive, accessibility (WCAG AA)  
**Rollout:** Feature flag for gradual deployment
