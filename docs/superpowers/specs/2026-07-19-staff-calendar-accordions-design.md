# Staff Calendar: Status Sections + Role Accordions

## Problem

The day view staff list (`StaffDayList.tsx`) shows every non-archived worker for the selected date as a single flat "Already Deployed" block followed by a flat "Available" block. On a large roster this is long to scan, and there's no way to focus on just the roles relevant to a task (e.g. "just show me Concrete Crew").

## Goals

- Keep the existing top-level split between deployed and available staff.
- Within each status group, group workers by a broad role category, collapsible per category, so irrelevant roles can be hidden.
- No changes to assignment/removal behavior, ticket warnings, or the underlying schedule data.

## Non-goals

- "Unavailable" status (leave/sick/holiday) — there is no such concept in the `Worker` data model today. Deferred until a real leave-tracking feature exists.
- Changing how roles are defined in `STAFF_ROLES` / `OFFICE_ROLES`.
- Persisting accordion open/closed state beyond the current date (see State below).

## Data model

No changes to `Worker`, `ScheduledShift`, or `useDaySchedule`. `computeDaySchedule` continues to return `assigned: DayAssignment[]` and `unassigned: Worker[]`.

New pure mapping in `opusformwebsite/src/opus/components/calendar/roleCategories.ts`:

```ts
export type RoleCategory = "Concrete Crew" | "Logistics" | "Office & Admin" | "Other";

const ROLE_CATEGORY_MAP: Record<string, RoleCategory> = {
  "Concrete Finisher": "Concrete Crew",
  "Concrete Operative": "Concrete Crew",
  "Concrete Pour Supervisor": "Concrete Crew",
  "Concrete Pump Operator": "Concrete Crew",
  "Decking Assistant": "Concrete Crew",
  "Ganger": "Concrete Crew",
  "General Construction Labourer": "Concrete Crew",
  "Telehandler Operator": "Concrete Crew",
  "Logistics and Operations Assistant": "Logistics",
  "Material Handler": "Logistics",
  "Director": "Office & Admin",
  "IT": "Office & Admin",
  "Inbound Sales Representative": "Office & Admin",
};

const CATEGORY_ORDER: RoleCategory[] = ["Concrete Crew", "Logistics", "Office & Admin", "Other"];

export const getRoleCategory = (role: string): RoleCategory =>
  ROLE_CATEGORY_MAP[role] ?? "Other";
```

`groupWorkersByCategory<T>(items: T[], getRole: (item: T) => string): { category: RoleCategory; items: T[] }[]`
- Generic over the item type so it works for both `Worker[]` (unassigned) and `DayAssignment[]` (assigned).
- Buckets items by `getRoleCategory(getRole(item))`.
- Returns groups in `CATEGORY_ORDER`, omitting any category with zero items.
- A role not present in `ROLE_CATEGORY_MAP` (including any future addition to `STAFF_ROLES` that isn't mapped yet) falls into `"Other"` rather than being dropped — nothing silently disappears.

## Components

### `RoleAccordion.tsx` (new)

```ts
interface RoleAccordionProps {
  category: RoleCategory;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}
```

- Header button: category name, count badge, chevron (rotates on open), full-width click target.
- Body: rendered only when `isOpen` (children are the existing `StaffCard` rows), no animation library — a simple conditional render, consistent with the rest of the calendar's lightweight styling.
- Styled to match the existing `border border-border rounded-xl bg-card` container language already used in `StaffDayList`.

### `StaffDayList.tsx` (modified)

- Keeps the day heading + deployed count line as-is.
- Replaces the current flat `assigned.map` / `unassigned.map` blocks with two status sections, each iterating `groupWorkersByCategory(...)` and rendering a `RoleAccordion` per non-empty category:
  1. **Already Deployed** — from `assigned`, `getRole = (a) => a.worker.role`.
  2. **Available** — from `unassigned`, `getRole = (w) => w.role`.
- A status section that has zero workers (e.g. nobody deployed yet) is omitted entirely, same as today's behavior for `unassigned.length > 0`.
- The existing "no staff match this view" empty state is unchanged.

### State

- `const [expanded, setExpanded] = useState<Set<string>>(new Set())` in `StaffDayList`, keyed by `` `${status}:${category}` `` (e.g. `"deployed:Concrete Crew"`).
- All collapsed by default (empty set).
- `useEffect` resets `expanded` to `new Set()` whenever `date` changes, so switching days always starts fully collapsed.
- Toggling calls a plain add/delete on the set (no new dependency, no external accordion library — native `useState` covers this per the "does this need to exist at all" / "stdlib" rungs).

## Error handling

- Nothing to handle beyond the `"Other"` fallback above — this is pure client-side grouping of already-validated data with no I/O.

## Testing

- `roleCategories.test.ts` (vitest, matches existing `test` script): covers `getRoleCategory` for a known role and an unknown role, and `groupWorkersByCategory` for correct bucketing, category ordering, and omission of empty categories.
- No test for `RoleAccordion`/`StaffDayList` rendering — per project rules, UI verification is done by the user in the running app, not by automated browser checks in this session.
