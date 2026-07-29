# Design Audit: Pipeline.tsx (Page Component)

**Component:** `src/opus/pages/Pipeline.tsx`  
**Type:** Page component — Thin wrapper/router for PipelineRegistry & QuoteInvoiceBuilder  
**Audit Date:** 2026-07-29  
**Status:** MINIMAL DESIGN WORK NEEDED — Page is primarily a router/switcher

---

## ORIGINAL — Current Design Patterns

### 1. **Thin Page Wrapper / Router**
```tsx
export const PipelinePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentView = searchParams.get("view") || "pipeline-registry";
  const quoteToLoadId = searchParams.get("quoteId");

  const handleEditQuote = (quoteId: string) => {
    setSearchParams({ view: "quote-builder", quoteId });
  };

  const handleQuoteLoaded = () => {
    setSearchParams({ view: "quote-builder" });
  };

  const handleBackToPipeline = () => {
    setSearchParams({ view: "pipeline-registry" });
  };

  return (
    <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto space-y-6 animate-fade-in">
      {currentView === "quote-builder" ? (
        <QuoteInvoiceBuilder
          onLogout={() => {}}
          onBack={handleBackToPipeline}
          quoteToLoadId={quoteToLoadId}
          onQuoteLoaded={handleQuoteLoaded}
        />
      ) : (
        <PipelineRegistry
          onEditQuote={handleEditQuote}
          onNewQuote={() => setSearchParams({ view: "quote-builder" })}
          onBack={() => navigate("/portal/dashboard")}
        />
      )}
    </div>
  );
};
```

### 2. **URL-Based State Management**
```tsx
const [searchParams, setSearchParams] = useSearchParams();
const currentView = searchParams.get("view") || "pipeline-registry";
const quoteToLoadId = searchParams.get("quoteId");
```

---

## CRITIC FEEDBACK — Current State

| Aspect | Assessment |
|--------|------------|
| **Visual Identity** | None — pure router, delegates all UI to children |
| **Layout** | Standard max-w-7xl container with animate-fade-in |
| **Domain Personality** | None visible at this level |
| **State Management** | Clean URL-based routing (good) |
| **Design Surface** | Minimal — delegates to PipelineRegistry & QuoteInvoiceBuilder |

**Key Insight:** This page has almost no design surface of its own. The design work belongs in:
- `PipelineRegistry` (already audited)
- `QuoteInvoiceBuilder` (already audited)

---

## EDITOR — Domain-Specific Personality Enhancements

Since this is a thin router, the "design" is really about **how the transitions and context feel**.

### 1. **Page Header: Site Office Dispatch**
```tsx
return (
  <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto space-y-6 animate-fade-in font-sans">
    {/* Site Office Header Bar */}
    <div className="bg-white/5 dark:bg-slate-900/50 backdrop-blur-sm border-b border-stone-200 dark:border-slate-700">
      <div className="max-w-7xl 2xl:max-w-[1700px] mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-amber-600 rounded" />
            <div>
              <h1 className="text-xl font-black text-stone-900 dark:text-white tracking-tight">
                DELIVERY TICKET CENTER
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                Manage delivery tickets & site pipeline
              </p>
            </div>
          </div>
          
          {/* View indicator */}
          <div className="flex items-center gap-2 shrink-0">
            {currentView === "quote-builder" && (
              <button 
                onClick={handleBackToPipeline}
                className="px-3 py-1.5 bg-stone-100 dark:bg-slate-800 border-2 border-stone-200 dark:border-slate-700 rounded-lg text-sm font-black uppercase tracking-wider text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                BACK TO DISPATCH
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    {currentView === "quote-builder" ? (
      <QuoteInvoiceBuilder ... />
    ) : (
      <PipelineRegistry ... />
    )}
  </div>
);
```

### 2. **View Transition Animation**
```tsx
{/* Wrap the conditional in AnimatePresence for smooth transitions */}
<AnimatePresence mode="wait">
  {currentView === "quote-builder" ? (
    <motion.div
      key="quote-builder"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <QuoteInvoiceBuilder ... />
    </motion.div>
  ) : (
    <motion.div
      key="pipeline-registry"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <PipelineRegistry ... />
    </motion.div>
  )}
</AnimatePresence>
```

### 3. **Empty State for Pipeline View** (if PipelineRegistry returns empty)
The PipelineRegistry handles its own empty state, but could add a page-level fallback.

---

## CRITIC FEEDBACK

| Aspect | Original | Editor | Critic Assessment |
|--------|----------|--------|-------------------|
| **Visual Identity** | None (pure router) | Site Office header + transitions | **Strong improvement** — sets domain context |
| **Layout** | Standard container | Site Office header + animated content | **Clear** — establishes domain frame |
| **Transitions** | None | AnimatePresence slide | **Polished** — feels like app, not page reload |
| **Terminology** | "Pipeline", "Quotes" | "Delivery Ticket Center", "Dispatch" | **Authentic** — matches concrete site language |
| **Color Palette** | Slate/Blue | Amber/Stone | **Authentic** — concrete industry |

**Risk Areas:**
- Adds ~30 lines to a previously minimal component
- Motion/AnimatePresence adds bundle weight (mitigated by code-splitting)
- Ensure transitions don't block user interaction

---

## APPLY — Implementation Priority

| Priority | Task | Effort |
|----------|------|--------|
| 1 | Add Site Office header bar with amber accent | 15 min |
| 2 | Wrap conditional in AnimatePresence with slide transitions | 20 min |
| 3 | Update "Back" button to "BACK TO DISPATCH" with amber styling | 5 min |
| 4 | Add domain-appropriate page title ("DELIVERY TICKET CENTER") | 5 min |

---

**Estimated Effort:** ~45 minutes  
**Dependencies:** `framer-motion` (already in deps), CSS variables for amber/stone  
**Testing:** Light/dark mode, responsive, transition performance  
**Rollout:** Feature flag for gradual deployment

---

**Total Design Pairs:** 2 major sections = ~4 ORIGINAL/EDITOR/CRITIC pairs