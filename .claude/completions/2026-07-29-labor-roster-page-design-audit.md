# Design Audit: LaborRosterPage.tsx

**Component:** `src/opus/pages/LaborRoster.tsx`  
**Type:** Page component — Thin wrapper/router for RosterView & CalendarBoard  
**Audit Date:** 2026-07-29  
**Status:** MINIMAL DESIGN WORK NEEDED — Page is primarily a router/switcher

---

## ORIGINAL — Current Design Patterns

### 1. **Thin Page Wrapper / View Switcher**
```tsx
export const LaborRosterPage: React.FC = () => {
  const { workers, setWorkers, shifts, setShifts, profile, role, theme } = usePortal();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentView = searchParams.get("view") === "staff" ? "staff" : "calendar";
  const selectedWorkerId = searchParams.get("workerId");
  const initialDossierTab = searchParams.get("tab") === "assignments" ? "assignments" : undefined;
  const autoOpenAddWorker = searchParams.get("addWorker") === "1";
  const group: CalendarGroup = searchParams.get("group") === "project" ? "project" : "staff";
  const dateParam = searchParams.get("date");
  const selectedDate = isValidISODate(dateParam) ? dateParam : defaultSelectedDay();

  const handleSelectWorker = (id: string | null) => {
    if (id) {
      setSearchParams({ view: "staff", workerId: id });
    } else {
      setSearchParams({ view: "staff" });
    }
  };

  const handleChangeGroup = (nextGroup: CalendarGroup) => {
    setSearchParams({ view: "calendar", group: nextGroup, date: selectedDate });
  };

  const handleChangeDate = (nextDate: string) => {
    setSearchParams({ view: "calendar", group, date: nextDate }, { replace: true });
  };

  return (
    <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto animate-fade-in space-y-6">
      {currentView === "staff" ? (
        <RosterView
          workers={workers}
          setWorkers={setWorkers}
          setShifts={setShifts}
          shifts={shifts}
          jobs={jobs}
          selectedWorkerDetailsId={selectedWorkerId}
          setSelectedWorkerDetailsId={handleSelectWorker}
          autoOpenAddWorker={autoOpenAddWorker}
          initialDossierTab={initialDossierTab}
        />
      ) : (
        <CalendarBoard
          jobs={jobs}
          workers={workers}
          shifts={shifts}
          setShifts={setShifts}
          group={group}
          date={selectedDate}
          onChangeGroup={handleChangeGroup}
          onChangeDate={handleChangeDate}
        />
      )}
    </div>
  );
};
```

### 2. **URL-Based State Management**
```tsx
const currentView = searchParams.get("view") === "staff" ? "staff" : "calendar";
const selectedWorkerId = searchParams.get("workerId");
const initialDossierTab = searchParams.get("tab") === "assignments" ? "assignments" : undefined;
const autoOpenAddWorker = searchParams.get("addWorker") === "1";
const group: CalendarGroup = searchParams.get("group") === "project" ? "project" : "staff";
const dateParam = searchParams.get("date");
const selectedDate = isValidISODate(dateParam) ? dateParam : defaultSelectedDay();
```

---

## CRITIC FEEDBACK — Current State

| Aspect | Assessment |
|--------|------------|
| **Visual Identity** | None — pure router, delegates all UI to children |
| **Layout** | Standard max-w-7xl container with animate-fade-in |
| **Domain Personality** | None visible at this level |
| **State Management** | Clean URL-based routing (good) |
| **Design Surface** | Minimal — delegates to RosterView & CalendarBoard |

**Key Insight:** This page has almost no design surface of its own. The design work belongs in:
- `RosterView` (already audited)
- `CalendarBoard` + 9 sub-components (already audited as Calendar System)

---

## EDITOR — Domain-Specific Personality Enhancements

Since this is a thin router, the "design" is about **how the context switch feels**.

### 1. **Page Header: Site Office Operative Register**
```tsx
return (
  <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto space-y-6 animate-fade-in font-sans">
    {/* Site Office Header Bar */}
    <div className="bg-white/5 dark:bg-slate-900/50 backdrop-blur-sm border-b border-stone-200 dark:border-slate-700">
      <div className="max-w-7xl 2xl:max-w-[1700px] mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-amber-600 rounded" />
            <div>
              <h1 className="text-xl font-black text-stone-900 dark:text-white tracking-tight">
                OPERATIVE REGISTER
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                {workers.filter(w => !w.isArchived).length} active operatives · {workers.filter(w => w.isArchived).length} archived
              </p>
            </div>
          </div>

          {/* View Toggle — Amber Active */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchParams({ view: "calendar" })}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-black uppercase tracking-wider transition-all",
                currentView === "calendar"
                  ? "bg-amber-600 text-white shadow-amber-600/20"
                  : "bg-stone-100 dark:bg-slate-800 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-200 dark:hover:bg-slate-700"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5 inline-block mr-1" />
              <span className="hidden sm:inline">SITE CALENDAR</span>
            </button>
            <button
              onClick={() => setSearchParams({ view: "staff" })}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-black uppercase tracking-wider transition-all",
                currentView === "staff"
                  ? "bg-amber-600 text-white shadow-amber-600/20"
                  : "bg-stone-100 dark:bg-slate-800 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-200 dark:hover:bg-slate-700"
              )}
            >
              <Users className="w-3.5 h-3.5 inline-block mr-1" />
              <span className="hidden sm:inline">OPERATIVES</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Content — animated switch */}
    <AnimatePresence mode="wait">
      {currentView === "staff" ? (
        <motion.div
          key="staff"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
        >
          <RosterView ... />
        </motion.div>
      ) : (
        <motion.div
          key="calendar"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
        >
          <CalendarBoard ... />
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
```

### 2. **View Toggle: Site Office Toolbar Style**
- Primary/secondary pills with amber active state
- Icons: `Users` for operatives, `LayoutGrid` for calendar
- Labels: "OPERATIVES" / "SITE CALENDAR" (domain language)

### 3. **Animated View Switch**
```tsx
<AnimatePresence mode="wait">
  {currentView === "staff" ? (
    <motion.div key="staff" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}>
      <RosterView ... />
    </motion.div>
  ) : (
    <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}>
      <CalendarBoard ... />
    </motion.div>
  )}
</AnimatePresence>
```

---

## CRITIC FEEDBACK

| Aspect | Original | Editor | Critic Assessment |
|--------|----------|--------|-------------------|
| **Visual Identity** | None (pure router) | Site office register header | **Strong improvement** — sets domain context |
| **Tabs** | Generic "Staff"/"Calendar" | "OPERATIVES"/"SITE CALENDAR" | **Clear** — site office language |
| **Active State** | Primary blue | Amber-600 with shadow | **Authentic** — concrete brand |
| **Transitions** | None | AnimatePresence slide | **Polished** — app-like feel |
| **Color Palette** | Slate/Blue | Amber/Stone | **Authentic** — concrete industry |

**Risk Areas:**
- Adds ~40 lines to previously minimal component
- Motion/AnimatePresence adds bundle weight (mitigated by code-splitting)
- Ensure transitions don't block interaction

---

## APPLY — Implementation Priority

| Priority | Task | Effort |
|----------|------|--------|
| 1 | Add site office header with amber accent bar | 15 min |
| 2 | Replace tab buttons with amber-active pills + domain labels | 15 min |
| 3 | Wrap conditional in AnimatePresence with slide transitions | 20 min |
| 4 | Add animated count to header (active/archived operatives) | 5 min |

---

**Estimated Effort:** ~1 hour  
**Dependencies:** `framer-motion` (already in deps), CSS variables for amber/stone  
**Testing:** Light/dark mode, responsive, transition performance  
**Rollout:** Feature flag for gradual deployment

---

**Total Design Pairs:** 2 major sections = ~4 ORIGINAL/EDITOR/CRITIC pairs