# Staff Calendar Role Accordions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat deployed/available staff lists in the day-view staff calendar with two status sections (Already Deployed, Available), each broken into collapsible role-category accordions (Concrete Crew, Logistics, Office & Admin, Other).

**Architecture:** A new pure grouping module (`roleCategories.ts`) buckets workers/assignments by category. A new presentational `RoleAccordion` component renders one collapsible section. `StaffDayList.tsx` is restructured to compose these instead of the current flat `.map()` blocks. No changes to data fetching, `useDaySchedule`, or `StaffCard`.

**Tech Stack:** React 18 + TypeScript, Tailwind CSS, Vitest, lucide-react icons. No new dependencies.

## Global Constraints

- No new npm dependencies — accordion state is plain `useState`/`useEffect` (per spec's "Components" and "State" sections).
- Categories and role→category mapping must exactly match the spec: Concrete Crew = Concrete Finisher, Concrete Operative, Concrete Pour Supervisor, Concrete Pump Operator, Decking Assistant, Ganger, General Construction Labourer, Telehandler Operator. Logistics = Logistics and Operations Assistant, Material Handler. Office & Admin = Director, IT, Inbound Sales Representative. Any other role string → "Other".
- Category display order is always: Concrete Crew, Logistics, Office & Admin, Other. Empty categories (zero workers for that status) are omitted from render.
- Accordions default fully collapsed and reset to fully collapsed whenever `date` changes.
- No automated browser/UI verification in this session — per project rules, the user verifies UI changes in the running app.
- Test runner: `npm run test` (vitest run). Test files live in `__tests__` sibling directories, using `describe`/`it`/`expect` from `"vitest"`.

---

### Task 1: Role category mapping module

**Files:**
- Create: `src/opus/components/calendar/roleCategories.ts`
- Test: `src/opus/components/calendar/__tests__/roleCategories.test.ts`

**Interfaces:**
- Consumes: nothing (pure module, no imports from other new files).
- Produces:
  - `export type RoleCategory = "Concrete Crew" | "Logistics" | "Office & Admin" | "Other";`
  - `export const CATEGORY_ORDER: RoleCategory[]`
  - `export const getRoleCategory: (role: string) => RoleCategory`
  - `export const groupWorkersByCategory: <T>(items: T[], getRole: (item: T) => string) => { category: RoleCategory; items: T[] }[]`

- [ ] **Step 1: Write the failing test**

Create `src/opus/components/calendar/__tests__/roleCategories.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getRoleCategory, groupWorkersByCategory, CATEGORY_ORDER } from "../roleCategories";

describe("getRoleCategory", () => {
  it("maps a known Concrete Crew role", () => {
    expect(getRoleCategory("Concrete Operative")).toBe("Concrete Crew");
  });

  it("maps a known Logistics role", () => {
    expect(getRoleCategory("Material Handler")).toBe("Logistics");
  });

  it("maps a known Office & Admin role", () => {
    expect(getRoleCategory("Director")).toBe("Office & Admin");
  });

  it("falls back to Other for an unmapped role", () => {
    expect(getRoleCategory("Some Future Role")).toBe("Other");
  });
});

describe("groupWorkersByCategory", () => {
  interface Item {
    role: string;
  }
  const getRole = (item: Item) => item.role;

  it("buckets items into their category and preserves CATEGORY_ORDER", () => {
    const items: Item[] = [
      { role: "Director" },
      { role: "Concrete Operative" },
      { role: "Material Handler" },
    ];
    const groups = groupWorkersByCategory(items, getRole);
    expect(groups.map((g) => g.category)).toEqual(["Concrete Crew", "Logistics", "Office & Admin"]);
    expect(groups[0].items).toEqual([{ role: "Concrete Operative" }]);
    expect(groups[1].items).toEqual([{ role: "Material Handler" }]);
    expect(groups[2].items).toEqual([{ role: "Director" }]);
  });

  it("omits categories with zero items", () => {
    const items: Item[] = [{ role: "Concrete Operative" }];
    const groups = groupWorkersByCategory(items, getRole);
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe("Concrete Crew");
  });

  it("routes unmapped roles into Other", () => {
    const items: Item[] = [{ role: "Mystery Role" }];
    const groups = groupWorkersByCategory(items, getRole);
    expect(groups).toEqual([{ category: "Other", items: [{ role: "Mystery Role" }] }]);
  });

  it("returns an empty array for an empty input", () => {
    expect(groupWorkersByCategory([], getRole)).toEqual([]);
  });

  it("CATEGORY_ORDER has the four categories in display order", () => {
    expect(CATEGORY_ORDER).toEqual(["Concrete Crew", "Logistics", "Office & Admin", "Other"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- roleCategories`
Expected: FAIL — `Cannot find module '../roleCategories'` (file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/opus/components/calendar/roleCategories.ts`:

```ts
export type RoleCategory = "Concrete Crew" | "Logistics" | "Office & Admin" | "Other";

const ROLE_CATEGORY_MAP: Record<string, RoleCategory> = {
  "Concrete Finisher": "Concrete Crew",
  "Concrete Operative": "Concrete Crew",
  "Concrete Pour Supervisor": "Concrete Crew",
  "Concrete Pump Operator": "Concrete Crew",
  "Decking Assistant": "Concrete Crew",
  Ganger: "Concrete Crew",
  "General Construction Labourer": "Concrete Crew",
  "Telehandler Operator": "Concrete Crew",
  "Logistics and Operations Assistant": "Logistics",
  "Material Handler": "Logistics",
  Director: "Office & Admin",
  IT: "Office & Admin",
  "Inbound Sales Representative": "Office & Admin",
};

export const CATEGORY_ORDER: RoleCategory[] = [
  "Concrete Crew",
  "Logistics",
  "Office & Admin",
  "Other",
];

export const getRoleCategory = (role: string): RoleCategory => ROLE_CATEGORY_MAP[role] ?? "Other";

export const groupWorkersByCategory = <T>(
  items: T[],
  getRole: (item: T) => string,
): { category: RoleCategory; items: T[] }[] => {
  const buckets = new Map<RoleCategory, T[]>();
  for (const item of items) {
    const category = getRoleCategory(getRole(item));
    const bucket = buckets.get(category);
    if (bucket) bucket.push(item);
    else buckets.set(category, [item]);
  }
  return CATEGORY_ORDER.filter((category) => buckets.has(category)).map((category) => ({
    category,
    items: buckets.get(category)!,
  }));
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- roleCategories`
Expected: PASS — all 9 assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/opus/components/calendar/roleCategories.ts src/opus/components/calendar/__tests__/roleCategories.test.ts
git commit -m "Add role category grouping for staff calendar accordions"
```

---

### Task 2: `RoleAccordion` component

**Files:**
- Create: `src/opus/components/calendar/RoleAccordion.tsx`

**Interfaces:**
- Consumes: `RoleCategory` type from `./roleCategories` (Task 1).
- Produces:
  ```ts
  interface RoleAccordionProps {
    category: RoleCategory;
    count: number;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }
  export const RoleAccordion: React.FC<RoleAccordionProps>;
  ```
  Task 3 renders one `RoleAccordion` per non-empty group returned by `groupWorkersByCategory`, passing `StaffCard` rows as `children`.

This is a presentational component with no branching logic worth a unit test (a single conditional render driven by a boolean prop) — per the plan's testing scope, it's covered by the app running, not a unit test. Build directly.

- [ ] **Step 1: Write the component**

Create `src/opus/components/calendar/RoleAccordion.tsx`:

```tsx
import React from "react";
import { ChevronDown } from "lucide-react";
import { RoleCategory } from "./roleCategories";

interface RoleAccordionProps {
  category: RoleCategory;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const RoleAccordion: React.FC<RoleAccordionProps> = ({
  category,
  count,
  isOpen,
  onToggle,
  children,
}) => {
  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left cursor-pointer hover:bg-secondary/30 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-black uppercase tracking-widest text-foreground truncate">
            {category}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground shrink-0">({count})</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && <div className="px-3 pb-1 border-t border-border">{children}</div>}
    </div>
  );
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run build`
Expected: succeeds with no TypeScript errors (this task adds an unused-but-exported component, which is valid).

- [ ] **Step 3: Commit**

```bash
git add src/opus/components/calendar/RoleAccordion.tsx
git commit -m "Add RoleAccordion component for staff calendar"
```

---

### Task 3: Wire accordions into `StaffDayList`

**Files:**
- Modify: `src/opus/components/calendar/StaffDayList.tsx` (full rewrite of the render body, lines 1-81)

**Interfaces:**
- Consumes:
  - `groupWorkersByCategory`, `RoleCategory` from `./roleCategories` (Task 1)
  - `RoleAccordion` from `./RoleAccordion` (Task 2)
  - Existing `DaySchedule`, `DayAssignment` from `../../hooks/useDaySchedule` (unchanged)
  - Existing `StaffCard` from `./StaffCard` (unchanged, `size="row"` prop)
- Produces: no new exports — `StaffDayListProps` is unchanged, so `CalendarBoard.tsx` (the only consumer) needs no changes.

- [ ] **Step 1: Replace the component body**

Replace the full contents of `src/opus/components/calendar/StaffDayList.tsx`:

```tsx
import React, { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Worker } from "../../types/erp";
import { formatDayHeading } from "../../utils/week";
import { DayAssignment, DaySchedule } from "../../hooks/useDaySchedule";
import { StaffCard } from "./StaffCard";
import { RoleAccordion } from "./RoleAccordion";
import { groupWorkersByCategory } from "./roleCategories";

interface StaffDayListProps {
  schedule: DaySchedule;
  date: string;
  onAssign: (worker: Worker) => void;
  onRemoveShift: (shiftId: string) => void;
}

export const StaffDayList: React.FC<StaffDayListProps> = ({
  schedule,
  date,
  onAssign,
  onRemoveShift,
}) => {
  const { assigned, unassigned, deployedCount } = schedule;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpanded(new Set());
  }, [date]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const deployedGroups = groupWorkersByCategory(assigned, (a) => a.worker.role);
  const availableGroups = groupWorkersByCategory(unassigned, (w) => w.role);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-bold text-muted-foreground">{formatDayHeading(date)}</span>
        <span className="text-muted-foreground">·</span>
        <span className="font-black text-success">{deployedCount} staff deployed</span>
      </div>

      {assigned.length === 0 && unassigned.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground border border-dashed border-border rounded-xl">
          <Users className="w-6 h-6" />
          <span className="text-xs font-bold uppercase tracking-wider">
            No staff match this view
          </span>
        </div>
      ) : (
        <>
          {deployedGroups.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 pt-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Already Deployed ({assigned.length})
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                {deployedGroups.map(({ category, items }) => {
                  const key = `deployed:${category}`;
                  return (
                    <RoleAccordion
                      key={key}
                      category={category}
                      count={items.length}
                      isOpen={expanded.has(key)}
                      onToggle={() => toggle(key)}
                    >
                      {items.map(({ worker, shift, job }: DayAssignment) => (
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
            </div>
          )}

          {availableGroups.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 pt-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Available ({unassigned.length})
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                {availableGroups.map(({ category, items }) => {
                  const key = `available:${category}`;
                  return (
                    <RoleAccordion
                      key={key}
                      category={category}
                      count={items.length}
                      isOpen={expanded.has(key)}
                      onToggle={() => toggle(key)}
                    >
                      {items.map((worker: Worker) => (
                        <StaffCard
                          key={worker.id}
                          worker={worker}
                          onAssign={() => onAssign(worker)}
                          size="row"
                        />
                      ))}
                    </RoleAccordion>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Run the full test suite**

Run: `npm run test`
Expected: PASS — existing suites (geo, weather, week, workerValidation, roleCategories) all green; no test targets `StaffDayList` directly so none break.

- [ ] **Step 3: Typecheck / build**

Run: `npm run build`
Expected: succeeds with no TypeScript errors. `CalendarBoard.tsx` passes `schedule`, `date`, `onAssign`, `onRemoveShift` — all still match `StaffDayListProps`, so no changes needed there.

- [ ] **Step 4: Commit**

```bash
git add src/opus/components/calendar/StaffDayList.tsx
git commit -m "Group staff calendar day view into deployed/available role accordions"
```

---

## Post-implementation

This session does not run the dev server or drive the Browser pane for verification (project rule in `opusformwebsite/CLAUDE.md`). After Task 3 is committed, the user checks the day-view staff calendar in their running app: role accordions appear under both "Already Deployed" and "Available", start collapsed, expand/collapse independently, and reset to collapsed when switching dates.
