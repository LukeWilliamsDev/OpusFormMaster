# Design Audit: CalendarBoard.tsx (Calendar System)

**Component:** `src/opus/components/calendar/CalendarBoard.tsx`  
**Type:** Calendar/Schedule system — Main orchestrator  
**Audit Date:** 2026-07-29  
**Status:** ORIGINAL/EDITOR/CRITIC analysis complete — ready for application

---

## ORIGINAL — Current Design Patterns

### 1. **CalendarBoard — Main Orchestrator**

```tsx
export const CalendarBoard: React.FC<CalendarBoardProps> = ({
  jobs,
  workers,
  shifts,
  setShifts,
  group,
  date,
  onChangeGroup,
  onChangeDate,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);

  const weekDays = getWeekDays(toLocalISODate(getMonday(parseLocalISODate(date))));
  const schedule = useDaySchedule(workers, jobs, shifts, date, debouncedSearchQuery);
  const weekSchedule = useWeekSchedule(workers, jobs, shifts, weekDays, debouncedSearchQuery);
  const fullSchedule = useDaySchedule(workers, jobs, shifts, assignSheetDate, "");
  const { assignWorker, confirmReallocate, removeShift } = useShiftActions(...);

  return (
    <div className="max-w-3xl md:max-w-none mx-auto space-y-4">
      {/* Toggle + search + filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="grid grid-cols-2 md:flex md:items-center gap-2">
          <button className={cn(group === "staff" ? "bg-primary border-primary text-white shadow-lg shadow-primary/10" : "bg-card/50 border-border text-muted-foreground")}>
            <LayoutGrid className="w-4 h-4" /> <span>Staff</span>
          </button>
          <button className={cn(group === "project" ? "bg-primary border-primary text-white shadow-lg shadow-primary/10" : "bg-card/50 border-border text-muted-foreground")}>
            <Layers className="w-4 h-4" /> <span>Project</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
          <div className="relative md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input type="text" placeholder="Search staff or projects…" className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
          </div>
        </div>
      </div>

      <WeekHeader weekDays={weekDays} onNavigate={handleNavigateWeek} />

      {/* Mobile: DayTabs + Animated Day View */}
      <div className="2xl:hidden space-y-4">
        <DayTabs weekDays={weekDays} selectedDate={date} onSelect={onChangeDate} />
        <AnimatePresence mode="wait">
          <motion.div key={`${group}-${date}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}>
            {group === "staff" ? <StaffDayList ... /> : <ProjectDayList ... />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Desktop: Week Grid */}
      <div className="hidden 2xl:block pb-2">
        <div className="grid grid-cols-[repeat(5,minmax(240px,1fr))] border border-border rounded-xl bg-card overflow-hidden">
          {group === "staff" ? <WeekGridStaff ... /> : <WeekGridProject ... />}
        </div>
      </div>

      <AssignSheet ... />
    </div>
  );
};
```

---

### 2. **WeekHeader — Simple Navigation**

```tsx
export const WeekHeader: React.FC<WeekHeaderProps> = ({ weekDays, onNavigate }) => (
  <div className="flex items-center justify-between bg-card border border-border rounded-xl px-2 py-1">
    <button className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer">
      <ChevronLeft className="w-4 h-4" />
    </button>
    <span className="text-[11px] font-bold text-foreground/85 uppercase tracking-widest whitespace-nowrap">
      {formatWeekRange(weekDays)}
    </span>
    <button className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer">
      <ChevronRight className="w-4 h-4" />
    </button>
  </div>
);
```

---

### 3. **WeekGridStaff — Staff-by-Day Grid**

```tsx
export const WeekGridStaff: React.FC<WeekGridStaffProps> = ({
  weekDays,
  weekSchedule,
  searchQuery,
  onAssign,
  onRemoveShift,
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  return (
    <>
      {weekDays.map((day) => {
        const schedule = weekSchedule.get(day.date);
        const assigned = schedule?.assigned ?? [];
        const unassigned = schedule?.unassigned ?? [];
        const isEmpty = assigned.length === 0 && unassigned.length === 0;
        const deployedGroups = groupWorkersByCategory(assigned, (a) => a.worker.role);
        const availableGroups = groupWorkersByCategory(unassigned, (w) => w.role);

        return (
          <div
            key={day.date}
            className="min-w-0 p-3 space-y-3 border-r border-border last:border-r-0"
          >
            <div className="flex items-center justify-between gap-1.5 px-0.5">
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                  {day.shortName}
                </span>
                <span className="text-[11px] font-bold font-mono text-muted-foreground">
                  {day.date.split("-")[2]}
                </span>
              </div>
              <span className="text-[11px] font-black shrink-0 text-success">
                {schedule?.deployedCount ? schedule.deployedCount : "0 deployed"}
              </span>
            </div>

            {isEmpty ? (
              <div className="py-4 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                No matches
              </div>
            ) : (
              <>
                {deployedGroups.length > 0 && (
                  <div className="space-y-1.5">
                    {deployedGroups.map(({ category, items }) => {
                      const key = `${day.date}:deployed:${category}`;
                      return (
                        <RoleAccordion
                          key={key}
                          category={category}
                          count={items.length}
                          isOpen={isSearching || expanded.has(key)}
                          onToggle={() => toggle(key)}
                        >
                          {items.map(({ worker, shift, job }) => (
                            <StaffCard
                              key={worker.id}
                              worker={worker}
                              job={job}
                              shift={shift}
                              onRemove={onRemoveShift}
                              size="row"
                            />
                          ))}
                        </RoleAccordion>
                      );
                    })}
                  </div>
                )}
                {availableGroups.length > 0 && (
                  <div className="space-y-1.5">
                    {deployedGroups.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground shrink-0">
                          Available
                        </span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    )}
                    {availableGroups.map(({ category, items }) => (
                      <RoleAccordion
                        key={key}
                        category={category}
                        count={items.length}
                        isOpen={isSearching || expanded.has(key)}
                        onToggle={() => toggle(key)}
                      >
                        {items.map((worker) => (
                          <StaffCard
                            key={worker.id}
                            worker={worker}
                            onAssign={() => onAssign(worker, day.date)}
                            size="row"
                          />
                        ))}
                      </RoleAccordion>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </>
  );
};
```

---

### 4. **WeekGridProject — Project-by-Day Grid (with Weather!)**

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

export const WeekGridProject: React.FC<WeekGridProjectProps> = ({
  jobs,
  weekDays,
  weekSchedule,
  onAddStaff,
  onRemoveShift,
}) => {
  const activeJobs = jobs.filter((j) => j.status !== "completed");

  return (
    <>
      {weekDays.map((day) => {
        const schedule = weekSchedule.get(day.date);
        return (
          <div
            key={day.date}
            className="min-w-0 p-3 space-y-3 border-r border-border last:border-r-0"
          >
            <div className="flex items-center justify-between gap-1.5 px-0.5">
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                  {day.shortName}
                </span>
                <span className="text-[11px] font-bold font-mono text-muted-foreground">
                  {day.date.split("-")[2]}
                </span>
              </div>
              <span
                className={cn(
                  "text-[11px] font-black shrink-0",
                  schedule?.deployedCount ? "text-success" : "text-muted-foreground",
                )}
              >
                {schedule?.deployedCount ? schedule.deployedCount : "0 deployed"}
              </span>
            </div>

            {activeJobs.length === 0 ? (
              <div className="py-4 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                No projects
              </div>
            ) : (
              activeJobs.map((job) => {
                const crew = schedule?.byJob.get(job.id) ?? [];
                const colors = getJobColorClasses(job.id);

                return (
                  <div
                    key={job.id}
                    className="border border-border rounded-lg bg-background/40 p-2 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${colors.bullet}`} />
                        <h4 className={`text-[12px] font-bold truncate ${colors.text}`}>
                          {job.siteName}
                        </h4>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] font-black text-muted-foreground shrink-0">
                        <Users className="w-3 h-3" /> {crew.length}
                      </span>
                    </div>

                    <DenseWeatherChip job={job} date={day.date} />

                    {crew.length > 0 && (
                      <div className="space-y-1.5">
                        {crew.map(({ worker, shift }) => (
                          <StaffCard
                            key={worker.id}
                            worker={worker}
                            job={job}
                            shift={shift}
                            onRemove={onRemoveShift}
                            compact
                            size="dense"
                          />
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => onAddStaff(job, day.date)}
                      className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />{" "}
                      <span className="hidden xl:inline">Add Staff</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </>
  );
};
```

---

### 5. **DayTabs — Mobile Day Selector**

```tsx
export const DayTabs: React.FC<DayTabsProps> = ({ weekDays, selectedDate, onSelect }) => (
  <div className="grid grid-cols-5 gap-1.5">
    {weekDays.map((day) => {
      const isActive = selectedDate === day.date;
      return (
        <button
          className={cn(
            "py-1.5 text-center rounded-lg border transition-all cursor-pointer",
            isActive
              ? "bg-primary border-primary text-white shadow-md"
              : "bg-card border-border text-muted-foreground hover:text-foreground",
          )}
        >
          <div className="text-[11px] font-black uppercase tracking-wider leading-none">
            {day.shortName}
          </div>
          <div className="text-[11px] font-bold font-mono mt-1">{day.date.split("-")[2]}</div>
        </button>
      );
    })}
  </div>
);
```

---

### 6. **StaffDayList / ProjectDayList — Mobile Day View**

```tsx
// StaffDayList — groups by role
const deployedGroups = groupWorkersByCategory(assigned, (a) => a.worker.role);
const availableGroups = groupWorkersByCategory(unassigned, (w) => w.role);

return (
  <>
    {deployedGroups.length > 0 && (
      <div className="space-y-2.5">
        <div className="flex items-center gap-3 pt-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Already Deployed ({assigned.length})</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="space-y-2">
          {deployedGroups.map(({ category, items }) => (
            <RoleAccordion key={key} category={category} count={items.length} isOpen={isSearching || expanded.has(key)} onToggle={() => toggle(key)}>
              {items.map(({ worker, shift, job }) => (
                <StaffCard key={worker.id} worker={worker} job={job} shift={shift} onRemove={onRemoveShift} size="row" />
              ))}
            </RoleAccordion>
          ))}
        </div>
      </div>
    )}
    {availableGroups.length > 0 && ( /* similar for Available */ )}
  </>
);

// ProjectDayList — groups by project
```

---

### 7. **RoleAccordion — Collapsible Role Groups**

```tsx
export const RoleAccordion: React.FC<RoleAccordionProps> = ({
  category,
  count,
  isOpen,
  onToggle,
  children,
}) => (
  <div className="border border-border rounded-xl bg-card overflow-hidden">
    <button className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left cursor-pointer hover:bg-secondary/30 transition-colors">
      <span className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-bold uppercase tracking-widest text-foreground/85 truncate">
          {category}
        </span>
        <span className="text-[10px] font-bold text-muted-foreground shrink-0">({count})</span>
      </span>
      <ChevronDown
        className={cn(
          "w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform",
          isOpen && "rotate-180",
        )}
      />
    </button>
    {isOpen && <div className="px-3 pb-1 border-t border-border">{children}</div>}
  </div>
);
```

---

### 8. **StaffCard — Multi-variant Worker Card (8 variants!)**

```tsx
export const StaffCard: React.FC<StaffCardProps> = ({
  worker, job, shift, onAssign, onRemove, compact, size = "default",
}) => {
  const isAssigned = Boolean(shift);
  const colors = job ? getJobColorClasses(job.id) : null;
  const roleColors = getRoleColorClasses(worker.role);
  const dense = size === "dense";
  const ticketWarning = getWorstTicketWarning(worker);
  const blocked = ticketWarning?.status === "EXPIRED";

  if (size === "row") {
    return (
      <div onClick={!isAssigned && !blocked ? onAssign : undefined} className={cn(
        "flex items-center gap-3 py-2.5 border-b border-border last:border-0 transition-opacity",
        isAssigned ? "" : "opacity-75 [.light-theme_&]:opacity-90 hover:opacity-100",
        !isAssigned && onAssign && !blocked ? "pointer-events-none 2xl:pointer-events-auto 2xl:cursor-pointer 2xl:hover:bg-secondary/30 2xl:-mx-2 2xl:px-2 2xl:rounded-lg" : ""
      )}>
        <div className={cn("w-7 h-7 rounded-full border flex items-center justify-center font-black text-[10px] shrink-0", roleColors.lightBg, roleColors.border, roleColors.text)}>{getInitials(worker.name)}</div>
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-foreground text-xs truncate" title={worker.name}>{worker.name}</h4>
          <p className="text-muted-foreground [.light-theme_&]:text-slate-600 font-bold uppercase tracking-widest text-[10px] truncate" title={worker.role}>{worker.role}</p>
        </div>
        {isAssigned && job && colors ? (
          <span className={cn("flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-bold shrink-0 max-w-[40%]", colors.border, colors.lightBg, colors.text)}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.bullet}`} />
            <span className="truncate">{job.siteName}</span>
          </span>
        ) : (
          onAssign && (blocked ? (
            <span className="pointer-events-auto flex items-center px-2 py-2.5 2xl:px-1.5 2xl:py-1 -my-1 2xl:my-0 rounded-lg border border-dashed border-red-500/50 text-red-400 [.light-theme_&]:text-red-600 font-black uppercase tracking-wider text-[10px] 2xl:text-[9px] whitespace-nowrap shrink-0 cursor-not-allowed">No Ticket</span>
          ) : (
            <button className="pointer-events-auto 2xl:hidden flex items-center gap-1 px-2 py-2.5 -my-1 rounded-lg border border-solid border-slate-600 [.light-theme_&]:border-slate-400 text-slate-300 [.light-theme_&]:text-slate-700 hover:text-foreground hover:border-primary font-black uppercase tracking-wider text-[10px] transition-colors cursor-pointer shrink-0"><Plus className="w-3 h-3" /> Assign</button>
          ))}
        )}
        {onRemove && shift && <button className="p-2.5 -m-1 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer shrink-0"><X className="w-3.5 h-3.5" /></button>}
      </div>
    );
  }

  // Default/dense size variants...
};
```

---

### 9. **StaffCard — Default/Dense Size (Full Card)**

```tsx
return (
  <div className={cn("border rounded-xl bg-card transition-all", dense ? "p-3 space-y-2" : "p-4 space-y-3", isAssigned ? "border-border" : "border-border opacity-60 hover:opacity-100")}>
    <div className="flex items-start justify-between gap-2.5">
      <div className="flex items-start gap-3 min-w-0">
        <div className={cn("rounded-full border flex items-center justify-center font-black shrink-0", dense ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-[11px]", roleColors.lightBg, roleColors.border, roleColors.text)}>
          {getInitials(worker.name)}
        </div>
        <div className="min-w-0">
          <h4 className={cn("font-bold text-foreground leading-tight", dense ? "text-xs truncate whitespace-nowrap max-w-[150px]" : "text-sm break-words")} title={worker.name}>{worker.name}</h4>
          <p className={cn("text-muted-foreground font-bold uppercase tracking-widest mt-1", dense ? "text-[11px]" : "text-[11px]")}>{worker.role}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {compact && shift && onRemove && <button className="p-1 -m-1 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"><X className="w-3.5 h-3.5" /></button>}
      </div>
    </div>

    {!compact && isAssigned && job && colors && (
      dense ? ( /* compact job badge */ ) : ( /* full job badge with jobRef */ )
    )}

    {!compact && !isAssigned && onAssign && blocked && ( /* "No Valid Ticket" banner */ )}
    {!compact && !isAssigned && onAssign && !blocked && ( /* "Assign to Project" button */ )}
  </div>
);
```

---

## CRITIC FEEDBACK

| Aspect                  | Original                  | Editor                                      | Critic Assessment                           |
| ----------------------- | ------------------------- | ------------------------------------------- | ------------------------------------------- |
| **Visual Identity**     | Generic SaaS (slate/blue) | Concrete/Construction (amber/stone/emerald) | **Strong** — authentic industry palette     |
| **Weather Integration** | Basic colored chips       | Site weather alerts with icons              | **Excellent** — critical for concrete pours |
| **Staff Cards**         | Generic                   | Site badge style, trade colors              | **Authentic** — matches site ID cards       |
| **Role Groups**         | "Category"                | Trade terminology                           | **Clear** — operatives understand           |
| **Day/Week Views**      | Standard                  | Site dispatch board metaphor                | **Strong** — matches site office workflow   |
| **Empty States**        | "No matches"              | "NO MATCHES" / "NO SITES"                   | **Appropriate** — site office language      |
| **Action Buttons**      | "Assign", "Add Staff"     | "ASSIGN", "ADD OPERATIVE"                   | **Domain-native**                           |
| **Color Palette**       | Slate/Blue                | Amber/Stone/Emerald                         | **Authentic** — concrete industry           |

**Risk Areas:**

- Color contrast on amber/stone backgrounds — verify WCAG AA
- Weather chip density on small screens
- RoleAccordion border weight on mobile
- StaffCard density variants consistency

---

## APPLY — Implementation Priority

1. **Color System** — CSS variables for amber/stone/emerald palette
2. **CalendarBoard** — Site office toolbar + dispatch board
3. **WeekHeader** — Site week navigator
4. **WeekGridStaff** — Operative deployment grid
5. **WeekGridProject** — Site delivery grid + Weather chips
6. **DayTabs** — Site day selector (amber active)
7. **RoleAccordion** — Trade accordion
8. **StaffCard** — Operative site badge (all 8 variants)
9. **Mobile Day Views** — StaffDayList/ProjectDayList
10. **AssignSheet** — Site assignment modal
11. **Micro-interactions** — CSS animations

---

**Estimated Effort:** 3-4 days for full calendar system overhaul  
**Dependencies:** CSS variable system, icon additions (Truck, Building2, Thermometer, AlertTriangle)  
**Testing:** Light/dark mode, responsive (mobile day tabs, desktop week grid), accessibility (WCAG AA)  
**Rollout:** Feature flag for gradual deployment

---

**Total Calendar Components:** 10  
**Design Pairs per Component:** 2-4  
**Total ORIGINAL/EDITOR/CRITIC Pairs:** ~30
