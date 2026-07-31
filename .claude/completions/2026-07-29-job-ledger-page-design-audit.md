# Design Audit: JobLedger.tsx (Page Component)

**Component:** `src/opus/pages/JobLedger.tsx`  
**Type:** Page component — Thin wrapper around ActiveJobLedger + JobDetails  
**Audit Date:** 2026-07-29  
**Status:** MINIMAL DESIGN WORK NEEDED — Page is primarily a router/wrapper

---

## ORIGINAL — Current Design Patterns

### 1. **Page Structure — Thin Wrapper**

```tsx
export const JobLedgerPage: React.FC = () => {
  const { jobs, setJobs, workers, shifts, setShifts } = usePortal();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState<Job["status"] | "all" | "archived">("all");
  const navigate = useNavigate();

  const selectedJobId = searchParams.get("jobId");
  const fromStaff = searchParams.get("from") === "staff";
  const originWorkerId = searchParams.get("workerId");

  // If job selected → render JobDetails (full page)
  if (selectedJobId && jobs.find((j) => j.id === selectedJobId)) {
    return (
      <JobDetails
        job={jobs.find((j) => j.id === selectedJobId)!}
        workers={workers}
        allJobs={jobs}
        shifts={shifts}
        setShifts={setShifts}
        onBack={() =>
          fromStaff && originWorkerId
            ? navigate(`/portal/roster?view=staff&workerId=${originWorkerId}&tab=assignments`)
            : handleSelectJob(null)
        }
        backLabel={fromStaff && originWorkerId ? "Return to Staff Record" : "Job Ledger"}
        onUpdateJob={handleUpdateJob}
      />
    );
  }

  // Otherwise → render ActiveJobLedger
  return (
    <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto space-y-8 animate-fade-in">
      <ActiveJobLedger
        filteredJobs={filteredJobs}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        onSelectJob={handleSelectJob}
        getJobFollowup={getJobFollowup}
      />
    </div>
  );
};
```

### 2. **ActiveJobLedger — Table/Grid Hybrid**

```tsx
// Uses table-like columns with expandable rows
<div className="grid grid-cols-[repeat(5,minmax(240px,1fr))] border border-border rounded-xl bg-card overflow-hidden">
  {activeJobs.map((job) => (
    <div key={job.id} className="min-w-0 p-3 space-y-3 border-r border-border last:border-r-0">
      {/* Job header with status pill, pour count, weather risk */}
    </div>
  ))}
</div>
```

### 3. **Filter Status — Standard Select**

```tsx
<select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
  <option value="all">All Active</option>
  <option value="in-progress">In Progress</option>
  <option value="pending">Pending</option>
  <option value="completed">Completed (Recent)</option>
  <option value="archived">Archived</option>
</select>
```

---

## CRITIC FEEDBACK — Current State

| Aspect                 | Assessment                                 |
| ---------------------- | ------------------------------------------ |
| **Visual Identity**    | Generic SaaS — slate/blue                  |
| **Terminology**        | "Job Ledger", "Active Job Sites" — generic |
| **Layout**             | Standard table/grid hybrid                 |
| **Domain Personality** | None — pure generic SaaS                   |

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

### 1. **Page Header: Site Office Pour Board**

```tsx
return (
  <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto space-y-6 animate-fade-in">
    {/* Site Office Header */}
    <div className="bg-white/5 dark:bg-slate-900/50 backdrop-blur-sm border-b-2 border-stone-200 dark:border-slate-700">
      <div className="max-w-7xl 2xl:max-w-[1700px] mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-amber-600 rounded" />
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">POUR BOARD</h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                {activeJobsFiltered.length} active pours · {jobs.filter(isArchived).length} archived
              </p>
            </div>
          </div>

          {/* Pour Status Filter — Amber Active Pills */}
          <div className="flex flex-wrap gap-2">
            {["all", "in-progress", "pending", "completed", "archived"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status as any)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
                  filterStatus === status
                    ? "bg-amber-600 text-white shadow-amber-600/20"
                    : "bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-slate-700"
                )}
              >
                {status === "all" ? "ALL POURS" : status.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* ActiveJobLedger */}
    <ActiveJobLedger ... />
  </div>
);
```

---

### 2. **ActiveJobLedger: Site Pour Grid**

```tsx
{
  /* Header Row */
}
<div className="grid grid-cols-[repeat(5,minmax(240px,1fr))] border-2 border-stone-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 overflow-hidden">
  <div className="col-span-5 bg-stone-100 dark:bg-slate-900/50 border-b-2 border-stone-200 dark:border-slate-700 px-3 py-2">
    <div className="grid grid-cols-[1.2fr_0.8fr_1fr_1fr_0.8fr] gap-2">
      <span className="text-[11px] font-black uppercase tracking-widest text-stone-600 dark:text-stone-400">
        SITE NAME
      </span>
      <span className="text-[11px] font-black uppercase tracking-widest text-stone-600 dark:text-stone-400">
        REFERENCE
      </span>
      <span className="text-[11px] font-black uppercase tracking-widest text-stone-600 dark:text-stone-400">
        STATUS
      </span>
      <span className="text-[11px] font-black uppercase tracking-widest text-stone-600 dark:text-stone-400">
        POURS
      </span>
      <span className="text-[11px] font-black uppercase tracking-widest text-stone-600 dark:text-stone-400">
        WEATHER
      </span>
    </div>
  </div>

  {/* Job Rows — Pour Cards */}
  {filteredJobs.map((job) => (
    <div
      key={job.id}
      className="col-span-5 bg-white dark:bg-slate-800 border-b border-stone-200 dark:border-slate-700 last:border-b-0"
    >
      <div className="grid grid-cols-[1.2fr_0.8fr_1fr_1fr_0.8fr] gap-2 p-3 min-h-[80px]">
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-stone-900 dark:text-white truncate">
            {job.siteName}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400">{job.postcode}</div>
        </div>
        <div className="text-[11px] font-bold font-mono text-stone-700 dark:text-stone-300">
          {job.jobRef}
        </div>
        <span
          className={cn(
            "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border shrink-0",
            job.status === "in-progress" &&
              "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-300",
            job.status === "pending" &&
              "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-300",
            job.status === "completed" &&
              "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-300",
          )}
        >
          {job.status.toUpperCase()}
        </span>
        <span className="text-[12px] font-bold font-mono text-stone-900 dark:text-white">
          {job.currentPours}/{job.maxPours}
        </span>
        <WeatherChip job={job} />
      </div>
    </div>
  ))}
</div>;
```

---

### 3. **WeatherChip — Site Weather Risk**

```tsx
const WeatherChip: React.FC<{ job: Job }> = ({ job }) => {
  const { forecast } = useJobForecast(job.postcode);
  const today = new Date().toISOString().split("T")[0];
  const weather = getWeatherOnDate(forecast, today);

  if (!weather) return <span className="text-[10px] text-stone-400">—</span>;

  const configs = {
    clear: {
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-700 dark:text-emerald-300",
      icon: <CloudSun className="w-3 h-3" />,
      label: "CLEAR",
    },
    rain: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-700 dark:text-blue-300",
      icon: <CloudRain className="w-3 h-3" />,
      label: "RAIN",
    },
    frost: {
      bg: "bg-sky-50 dark:bg-sky-900/20",
      border: "border-sky-200 dark:border-sky-800",
      text: "text-sky-700 dark:text-sky-300",
      icon: <Snowflake className="w-3 h-3" />,
      label: "FROST",
    },
    wind: {
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-300",
      icon: <Wind className="w-3 h-3" />,
      label: "WIND",
    },
    high: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-700 dark:text-red-300",
      icon: <AlertTriangle className="w-3 h-3" />,
      label: "HIGH RISK",
    },
  };

  const cfg = weather.isImpactful
    ? weather.riskLevel === "High"
      ? configs.high
      : configs[weather.condition.toLowerCase()] || configs.rain
    : configs.clear;

  return (
    <span
      className={cn(
        "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shrink-0",
        cfg.bg,
        cfg.border,
        cfg.text,
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
};
```

---

## CRITIC FEEDBACK

| Aspect              | Original                         | Editor                            | Critic Assessment                     |
| ------------------- | -------------------------------- | --------------------------------- | ------------------------------------- |
| **Visual Identity** | Generic SaaS                     | Concrete/Pour Board (amber/stone) | **Strong** — domain personality       |
| **Terminology**     | "Job Ledger", "Active Job Sites" | "POUR BOARD", "Active Pours"      | **Clear** — site office language      |
| **Layout**          | Table/grid hybrid                | Pour card grid with weather       | **Authentic** — matches site board    |
| **Weather**         | None                             | Integrated weather chips          | **Excellent** — critical for concrete |
| **Color Palette**   | Slate/Blue                       | Amber/Stone/Emerald               | **Authentic** — concrete industry     |

**Risk Areas:**

- Color contrast on amber/stone — verify WCAG AA
- Grid density on mobile — may need responsive stack

---

## APPLY — Implementation Priority

1. **Color System** — CSS variables for amber/stone/emerald
2. **Page Header** — "POUR BOARD" with pour counts
3. **Filter Pills** — Amber active, stone inactive
4. **ActiveJobLedger** — Pour card grid with weather chips
5. **Status Badges** — Amber/Stone/Emerald industry-mapped
6. **Micro-interactions** — CSS animations

---

**Estimated Effort:** 1-2 days for full page overhaul  
**Dependencies:** CSS variable system, Weather icons, ActiveJobLedger component changes  
**Testing:** Light/dark mode, responsive, accessibility (WCAG AA)  
**Rollout:** Feature flag for gradual deployment

---

**Total Design Pairs:** 3 major sections = ~6 ORIGINAL/EDITOR/CRITIC pairs
