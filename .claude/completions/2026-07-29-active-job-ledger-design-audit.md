# Design Audit: ActiveJobLedger.tsx

**Component:** `src/opus/components/ActiveJobLedger.tsx`  
**Type:** Component — Job ledger with table/grid hybrid view  
**Audit Date:** 2026-07-29  
**Status:** MINIMAL DESIGN WORK NEEDED — Uses table/grid hybrid layout not standard CardGrid

---

## ORIGINAL — Current Design Patterns

### 1. **Table/Grid Hybrid Layout**

```tsx
<div className="grid grid-cols-[repeat(5,minmax(240px,1fr))] border border-border rounded-xl bg-card overflow-hidden">
  <div className="col-span-5 bg-card/50 border-b border-border px-3 py-2">
    <div className="grid grid-cols-[1.2fr_0.8fr_1fr_1fr_0.8fr] gap-2">
      <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">SITE NAME</span>
      <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">REFERENCE</span>
      <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">STATUS</span>
      <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">POURS</span>
      <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">WEATHER</span>
    </div>
  </div>

  {activeJobs.map((job) => (
    <div key={job.id} className="col-span-5 bg-card border-b border-border last:border-b-0 px-3 py-3 min-h-[80px]">
      <div className="grid grid-cols-[1.2fr_0.8fr_1fr_1fr_0.8fr] gap-2">
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-foreground truncate">{job.siteName}</div>
          <div className="text-[11px] text-muted-foreground">{job.postcode}</div>
        </div>
        <div className="text-[11px] font-bold font-mono text-muted-foreground">{job.jobRef}</div>
        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold shrink-0 uppercase tracking-wider border", ...)}>
          {job.status.toUpperCase()}
        </span>
        <span className="text-[12px] font-bold font-mono text-foreground">{job.currentPours}/{job.contractMaxPours}</span>
        <DenseWeatherChip job={job} date={...} />
      </div>
    </div>
  ))}
</div>
```

### 2. **DenseWeatherChip — Weather Integration**

```tsx
const DenseWeatherChip: React.FC<{ job: Job; date: string }> = ({ job, date }) => {
  const { forecast } = useJobForecast(job.postcode);
  const weather = getWeatherOnDate(forecast, date);
  if (!weather) return null;

  const colorClass = !weather.isImpactful
    ? "bg-success/10 border-success/30 text-success"
    : weather.riskLevel === "High"
      ? "bg-warning/10 border-warning/30 text-warning"
      : "bg-warning/10 border-warning/20 text-warning";

  return (
    <div
      className={`flex items-center justify-between gap-1 px-1.5 py-1 rounded-md border text-[9px] font-black uppercase tracking-wider ${colorClass}`}
      title={weather.advice}
    >
      <span className="flex items-center gap-1 truncate">
        {weather.condition === "Rain" ? (
          <CloudRain />
        ) : weather.condition === "Frost" ? (
          <Snowflake />
        ) : weather.condition === "Wind" ? (
          <Wind />
        ) : (
          <CloudSun />
        )}
        <span className="truncate">
          {weather.condition} · {weather.riskLevel}
        </span>
      </span>
      <span className="flex items-center gap-0.5 opacity-80 shrink-0">
        <Thermometer className="w-2.5 h-2.5" /> {weather.temperature}°
      </span>
    </div>
  );
};
```

---

## CRITIC FEEDBACK

| Aspect                  | Assessment                                                           |
| ----------------------- | -------------------------------------------------------------------- |
| **Visual Identity**     | Generic SaaS (slate/blue)                                            |
| **Layout**              | Table/grid hybrid — NOT standard card grid (CardGrid NOT applicable) |
| **Weather Integration** | Excellent — DenseWeatherChip is domain-native                        |
| **Terminology**         | "Site Name", "Reference", "Status", "Pours" — good domain language   |
| **Color Palette**       | Slate/Blue — no domain personality                                   |

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

### 1. **Header: Site Pour Board**

```tsx
<div className="col-span-5 bg-stone-100 dark:bg-slate-900/50 border-b-2 border-stone-200 dark:border-slate-700 px-3 py-2">
  <div className="grid grid-cols-[1.2fr_0.8fr_1fr_1fr_0.8fr] gap-2">
    <span className="text-[11px] font-black uppercase tracking-widest text-stone-600 dark:text-stone-400">
      SITE NAME
    </span>
    <span className="text-[11px] font-black uppercase tracking-widest text-stone-600 dark:text-stone-400">
      BATCH REF
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
```

---

### 2. **Job Row: Pour Delivery Ticket**

```tsx
{activeJobs.map((job) => (
  <motion.div
    key={job.id}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    layout
    onClick={() => onSelectJob(job.id)}
    className={cn(
      "col-span-5 bg-white dark:bg-slate-800 border-b border-stone-200 dark:border-slate-700 last:border-b-0 px-3 py-3 min-h-[80px]",
      "group flex flex-col md:grid md:grid-cols-[1.2fr_0.8fr_1fr_1fr_0.8fr] gap-4 px-5 py-5 md:py-0 md:min-h-[64px] items-center hover:bg-amber-50 dark:hover:bg-amber-900/20 active:bg-amber-100 dark:active:bg-amber-900/20 transition-all duration-150 cursor-pointer border border-stone-200 dark:border-slate-700 md:border-0 md:border-b rounded-xl md:rounded-none shadow-lg md:shadow-none border-l-[3px] border-l-amber-200 hover:border-l-amber-500 active:border-l-amber-500 bg-white dark:bg-slate-800 relative overflow-hidden"
    )}
  >
    {/* Site Name / Postcode */}
    <div className="flex justify-between items-center w-full md:w-auto md:contents">
      <div className="text-[13px] font-bold text-stone-900 dark:text-white truncate">{job.siteName}</div>
      <div className="text-[11px] text-stone-500 dark:text-stone-400">{job.postcode}</div>
    </div>

    {/* Batch Reference */}
    <div className="text-[11px] font-bold font-mono text-stone-700 dark:text-stone-300">{job.jobRef}</div>

    {/* Status Badge — Pour Status */}
    <span className={cn(
      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0",
      job.status === "in-progress" && "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      job.status === "pending" && "bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-600",
      job.status === "completed" && "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
    )}>
      {job.status === "in-progress" ? "ACTIVE POUR" : job.status === "pending" ? "SCHEDULED" : "COMPLETED"}
    </span>

    {/* Pours Progress */}
    <span className="text-[12px] font-bold font-mono text-stone-900 dark:text-white">{job.currentPours}/{job.contractMaxPours}</span>

    {/* DenseWeatherChip — Site Weather Risk */}
    <DenseWeatherChip job={job} date={...} />
  </motion.div>
))}
```

---

### 3. **DenseWeatherChip — Site Weather Alert**

```tsx
const DenseWeatherChip: React.FC<{ job: Job; date: string }> = ({ job, date }) => {
  const { forecast } = useJobForecast(job.postcode);
  const weather = getWeatherOnDate(forecast, date);
  if (!weather) return <span className="text-[10px] text-stone-400">—</span>;

  const configs = {
    clear: {
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-700 dark:text-emerald-300",
      icon: <CloudSun className="w-2.5 h-2.5" />,
      label: "CLEAR",
    },
    rain: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-700 dark:text-blue-300",
      icon: <CloudRain className="w-2.5 h-2.5" />,
      label: "RAIN",
    },
    frost: {
      bg: "bg-sky-50 dark:bg-sky-900/20",
      border: "border-sky-200 dark:border-sky-800",
      text: "text-sky-700 dark:text-sky-300",
      icon: <Snowflake className="w-2.5 h-2.5" />,
      label: "FROST",
    },
    wind: {
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-300",
      icon: <Wind className="w-2.5 h-2.5" />,
      label: "WIND",
    },
    high: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-700 dark:text-red-300",
      icon: <AlertTriangle className="w-2.5 h-2.5" />,
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
      className={`flex items-center justify-between gap-1 px-1.5 py-1 rounded-md border text-[9px] font-black uppercase tracking-wider ${cfg.bg} ${cfg.border} ${cfg.text}`}
      title={weather.advice}
    >
      <span className="flex items-center gap-1 truncate">
        {cfg.icon}
        <span className="truncate">
          {cfg.label} · {weather.riskLevel}
        </span>
      </span>
      <span className="flex items-center gap-0.5 opacity-80 shrink-0">
        <Thermometer className="w-2.5 h-2.5" /> {weather.temperature}°
      </span>
    </span>
  );
};
```

---

### 4. **Status Badges: Pour Status Tags**

```tsx
// Active pour (in-progress)
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border-white/20 bg-amber-600 text-white">
  <Truck className="w-3 h-3" />
  ACTIVE — {currentPours}/{maxPours} POURS
</span>

// Pending
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border-white/20 bg-stone-500 text-white">
  <Clock className="w-3 h-3" />
  PENDING — {maxPours} POURS PLANNED
</span>

// Completed
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border-white/20 bg-emerald-600 text-white">
  <CheckCircle className="w-3 h-3" />
  COMPLETE — {currentPours}/{maxPours} POURS DELIVERED
</span>
```

---

## CRITIC FEEDBACK

| Aspect                  | Original                  | Editor                                  | Critic Assessment                                      |
| ----------------------- | ------------------------- | --------------------------------------- | ------------------------------------------------------ |
| **Visual Identity**     | Generic SaaS (slate/blue) | Concrete/Flooring (amber/stone/emerald) | **Strong improvement** — domain personality throughout |
| **Layout**              | Table/grid hybrid         | Pour delivery ticket grid               | **Authentic** — matches site paperwork                 |
| **Weather Integration** | DenseWeatherChip (good)   | Enhanced with condition-specific icons  | **Excellent** — critical for concrete pours            |
| **Status Badges**       | Generic semantic colors   | Pour status tags (Amber/Stone/Emerald)  | **Clear** — instant recognition                        |
| **Color Palette**       | Slate/Blue                | Amber/Stone/Emerald                     | **Authentic** — concrete industry                      |

**Risk Areas:**

- Color contrast on amber backgrounds — verify WCAG AA
- Amber focus rings — ensure visible in light/dark
- Truck icon for scheduled — ensure recognizable at small sizes
- Grid density on mobile — may need responsive stack

---

## APPLY — Implementation Priority

1. **Color System** — CSS variables for amber/stone/emerald palette
2. **Header** — "POUR BOARD" with amber accent
3. **Job Rows** — Pour delivery ticket styling
4. **Status Badges** — Pour status tags
5. **Weather Chips** — Condition-specific icons
6. **Micro-interactions** — CSS animations

---

**Estimated Effort:** 1-2 days for full component overhaul  
**Dependencies:** CSS variable system, Truck/Building2 icons  
**Testing:** Light/dark mode, responsive, accessibility (WCAG AA)  
**Rollout:** Feature flag for gradual deployment

---

**Total Design Pairs:** 4 major sections = ~8 ORIGINAL/EDITOR/CRITIC pairs
