# Telegram Stage 4 Dispatcher Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/who <postcode>`, `/job <ref>`, `/staff <name>`, `/today` to `telegram-handler`, gated to `admin`/`director`/`logistics_coordinator` roles.

**Architecture:** Pure formatting/math helpers go in `lib.ts` (Vitest-covered, no Deno/Supabase imports). Role resolution, geocoding, and the four DB-backed handlers go in `index.ts`, wired into the existing command dispatch in `serve()`. No new tables, no migration, no `callback_query`.

**Tech Stack:** Deno edge function (`supabase/functions/telegram-handler`), Supabase JS client, Vitest for `lib.ts`, `postcodes.io` bulk geocoding API.

## Global Constraints

- Deploy with `npx supabase functions deploy telegram-handler --project-ref fgpthpxmiroyebrzjdzo --no-verify-jwt` from the repo root — never Composio (it resets `verify_jwt` to `true` and sends only a single file, breaking the `./lib.ts` import).
- Never let a Supabase query error be swallowed into an empty-result branch — log it and return a generic failure message instead (handoff §6: a missing FK or a bad enum filter both errored the query, and `?? []`/treating null as "no rows" hid it both times).
- Use `||`, not `??`, for any string that must never end up blank downstream (handoff §4) — applies here to `job.status`, staff/job names used as fallback labels.
- Role check is `role in ["admin", "director", "logistics_coordinator"]` — there is no `dispatcher` member of the `app_role` enum; never filter a query `.in("role", [...])` with a label outside that set, since Postgres rejects the whole query rather than matching nothing.
- Verify every command against real Telegram before claiming it works; clean up any test rows and links afterward.

---

## Task 1: `lib.ts` — postcode/geo helpers and `/who` formatting

**Files:**

- Modify: `supabase/functions/telegram-handler/lib.ts` (add after `renderWeek`, ~line 67)
- Test: `supabase/functions/telegram-handler/__tests__/lib.test.ts`

**Interfaces:**

- Produces: `cleanPostcode(postcode: string): string`, `type GeoPoint = { lat: number; lng: number }`, `haversineMiles(a: GeoPoint, b: GeoPoint): number`, `type NearbyStaff = { name: string; postcode: string; distanceMiles: number }`, `nearestByDistance(origin: GeoPoint, candidates: Array<{ name: string; postcode: string; coords: GeoPoint }>, limit: number): NearbyStaff[]`, `renderWho(rows: NearbyStaff[]): string`

- [ ] **Step 1: Write the failing tests**

Add to `supabase/functions/telegram-handler/__tests__/lib.test.ts`, after the `renderWeek` describe block:

```typescript
describe("cleanPostcode", () => {
  it("uppercases and strips whitespace", () => {
    expect(cleanPostcode(" sw1a 1aa ")).toBe("SW1A1AA");
  });
});

describe("haversineMiles", () => {
  it("returns zero for identical points", () => {
    expect(haversineMiles({ lat: 51.5, lng: -0.1 }, { lat: 51.5, lng: -0.1 })).toBe(0);
  });

  it("returns a positive distance for distinct points", () => {
    // Roughly London to Manchester, ~160-180 miles as the crow flies.
    const london = { lat: 51.5072, lng: -0.1276 };
    const manchester = { lat: 53.4808, lng: -2.2426 };
    const miles = haversineMiles(london, manchester);
    expect(miles).toBeGreaterThan(150);
    expect(miles).toBeLessThan(200);
  });
});

describe("nearestByDistance", () => {
  it("sorts ascending by distance and applies the limit", () => {
    const origin = { lat: 51.5, lng: -0.1 };
    const candidates = [
      { name: "Far", postcode: "EH1 1AA", coords: { lat: 55.95, lng: -3.19 } },
      { name: "Near", postcode: "SW1A 1AA", coords: { lat: 51.5012, lng: -0.1419 } },
      { name: "Mid", postcode: "B1 1AA", coords: { lat: 52.48, lng: -1.9 } },
    ];
    const result = nearestByDistance(origin, candidates, 2);
    expect(result.map((r) => r.name)).toEqual(["Near", "Mid"]);
    expect(result[0].distanceMiles).toBeLessThan(result[1].distanceMiles);
  });
});

describe("renderWho", () => {
  it("lists candidates with distance", () => {
    const out = renderWho([{ name: "Dave Smith", postcode: "SW1A 1AA", distanceMiles: 2.345 }]);
    expect(out).toContain("Dave Smith");
    expect(out).toContain("SW1A 1AA");
    expect(out).toContain("2.3");
  });

  it("says so when there are no candidates", () => {
    expect(renderWho([])).toBe("No staff records have a postcode set.");
  });
});
```

Add the new names to the existing import block at the top of the file:

```typescript
import {
  buildUploadPath,
  cleanPostcode,
  DENY_TEXT,
  haversineMiles,
  isDeclaredUploadTypeAllowed,
  isValidBridgeSecret,
  nearestByDistance,
  parseCommand,
  renderWeek,
  renderWho,
  sniffFileType,
} from "../lib";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run supabase/functions/telegram-handler/__tests__/lib.test.ts`
Expected: FAIL — `cleanPostcode`, `haversineMiles`, `nearestByDistance`, `renderWho` are not exported yet.

- [ ] **Step 3: Implement in `lib.ts`**

Add after the `renderWeek` function:

```typescript
export function cleanPostcode(postcode: string): string {
  return postcode.trim().toUpperCase().replace(/\s+/g, "");
}

export type GeoPoint = { lat: number; lng: number };

// Ported from src/opus/utils/geo.ts's calculateDistance — edge functions
// cannot import from src/opus, so this is a deliberate small duplicate.
export function haversineMiles(a: GeoPoint, b: GeoPoint): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export type NearbyStaff = { name: string; postcode: string; distanceMiles: number };

export function nearestByDistance(
  origin: GeoPoint,
  candidates: Array<{ name: string; postcode: string; coords: GeoPoint }>,
  limit: number,
): NearbyStaff[] {
  return candidates
    .map((c) => ({
      name: c.name,
      postcode: c.postcode,
      distanceMiles: haversineMiles(origin, c.coords),
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, limit);
}

export function renderWho(rows: NearbyStaff[]): string {
  if (rows.length === 0) return "No staff records have a postcode set.";
  const lines = rows.map((r) => `${r.name} — ${r.postcode} (${r.distanceMiles.toFixed(1)} mi)`);
  return `Nearest staff:\n${lines.join("\n")}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run supabase/functions/telegram-handler/__tests__/lib.test.ts`
Expected: PASS, all tests including the new ones.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/telegram-handler/lib.ts supabase/functions/telegram-handler/__tests__/lib.test.ts
git commit -m "feat(telegram): geo helpers and /who formatting"
```

---

## Task 2: `lib.ts` — ticket expiry and `/staff` formatting

**Files:**

- Modify: `supabase/functions/telegram-handler/lib.ts` (add after the Task 1 additions)
- Test: `supabase/functions/telegram-handler/__tests__/lib.test.ts`

**Interfaces:**

- Consumes: nothing from Task 1.
- Produces: `daysUntil(expiryDate: string, todayIso: string): number | null`, `ticketStatusLine(what: string, days: number | null, expiryDate?: string): string`, `renderStaffStatus(name: string, ticketLines: string[], nextShift: { date: string; site_name: string } | null): string`, `renderStaffMatches(names: string[]): string`

- [ ] **Step 1: Write the failing tests**

Add to `lib.test.ts`, after the `renderWho` describe block:

```typescript
describe("daysUntil", () => {
  it("counts whole days to a future date", () => {
    expect(daysUntil("2026-08-20", "2026-08-13")).toBe(7);
  });

  it("returns a negative count for a past date", () => {
    expect(daysUntil("2026-08-01", "2026-08-13")).toBe(-12);
  });

  it("returns null for an unparseable date", () => {
    expect(daysUntil("not-a-date", "2026-08-13")).toBeNull();
  });
});

describe("ticketStatusLine", () => {
  it("phrases a future expiry", () => {
    expect(ticketStatusLine("CSCS", 7, "2026-08-20")).toBe("CSCS — expires in 7 days (2026-08-20)");
  });

  it("uses singular day phrasing for exactly one day", () => {
    expect(ticketStatusLine("CSCS", 1, "2026-08-14")).toBe("CSCS — expires in 1 day (2026-08-14)");
  });

  it("phrases expiry today", () => {
    expect(ticketStatusLine("CSCS", 0, "2026-08-13")).toBe("CSCS — expires today");
  });

  it("phrases a past expiry", () => {
    expect(ticketStatusLine("CSCS", -3, "2026-08-10")).toBe(
      "CSCS — expired 3 days ago (2026-08-10)",
    );
  });

  it("phrases a missing expiry date", () => {
    expect(ticketStatusLine("CSCS", null)).toBe("CSCS: no expiry date on file");
  });
});

describe("renderStaffStatus", () => {
  it("combines name, ticket lines, and next shift", () => {
    const out = renderStaffStatus("Dave Smith", ["CSCS — expires in 7 days (2026-08-20)"], {
      date: "2026-08-15",
      site_name: "Croydon Depot",
    });
    expect(out).toContain("Dave Smith");
    expect(out).toContain("CSCS");
    expect(out).toContain("Croydon Depot");
  });

  it("says so when there are no certificates or no upcoming shift", () => {
    const out = renderStaffStatus("Dave Smith", [], null);
    expect(out).toContain("No certificates on file.");
    expect(out).toContain("No upcoming shifts.");
  });
});

describe("renderStaffMatches", () => {
  it("lists the ambiguous names", () => {
    const out = renderStaffMatches(["Dave Smith", "Dave Jones"]);
    expect(out).toContain("Dave Smith");
    expect(out).toContain("Dave Jones");
    expect(out.toLowerCase()).toContain("specific");
  });
});
```

Update the import block to add: `daysUntil`, `renderStaffMatches`, `renderStaffStatus`, `ticketStatusLine`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run supabase/functions/telegram-handler/__tests__/lib.test.ts`
Expected: FAIL — the four new names are not exported yet.

- [ ] **Step 3: Implement in `lib.ts`**

```typescript
// Same whole-day-count logic as supabase/functions/telegram-notify/index.ts's
// daysUntil — duplicated rather than shared across functions (this codebase's
// existing pattern; see isValidBridgeSecret vs telegram-notify's secretOk).
// Kept in sync deliberately: the bot must never give a different compliance
// answer here than the daily digest gives.
export function daysUntil(expiryDate: string, todayIso: string): number | null {
  const expiry = Date.parse(`${expiryDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(expiry)) return null;
  return Math.round((expiry - Date.parse(`${todayIso}T00:00:00Z`)) / 86_400_000);
}

export function ticketStatusLine(what: string, days: number | null, expiryDate?: string): string {
  if (days === null) return `${what}: no expiry date on file`;
  if (days > 0) return `${what} — expires in ${days} day${days === 1 ? "" : "s"} (${expiryDate})`;
  if (days === 0) return `${what} — expires today`;
  return `${what} — expired ${-days} day${days === -1 ? "" : "s"} ago (${expiryDate})`;
}

export function renderStaffStatus(
  name: string,
  ticketLines: string[],
  nextShift: { date: string; site_name: string } | null,
): string {
  const parts = [
    name,
    ticketLines.length ? ticketLines.join("\n") : "No certificates on file.",
    nextShift ? `Next shift: ${nextShift.date} — ${nextShift.site_name}` : "No upcoming shifts.",
  ];
  return parts.join("\n\n");
}

export function renderStaffMatches(names: string[]): string {
  return `Multiple matches — be more specific:\n${names.join("\n")}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run supabase/functions/telegram-handler/__tests__/lib.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/telegram-handler/lib.ts supabase/functions/telegram-handler/__tests__/lib.test.ts
git commit -m "feat(telegram): ticket expiry and /staff formatting"
```

---

## Task 3: `lib.ts` — `/job` formatting

**Files:**

- Modify: `supabase/functions/telegram-handler/lib.ts`
- Test: `supabase/functions/telegram-handler/__tests__/lib.test.ts`

**Interfaces:**

- Produces: `type JobNoteView = { author: string; body: string }`, `type CrewMember = { name: string }`, `renderJobStatus(job: { job_ref: string; site_name: string; status: string; current_pours: number; contract_max_pours: number }, crew: CrewMember[], notes: JobNoteView[]): string`

- [ ] **Step 1: Write the failing tests**

Add to `lib.test.ts`:

```typescript
describe("renderJobStatus", () => {
  const job = {
    job_ref: "JOB-100",
    site_name: "Croydon Depot",
    status: "active",
    current_pours: 3,
    contract_max_pours: 10,
  };

  it("includes ref, status, pours, crew, and notes", () => {
    const out = renderJobStatus(
      job,
      [{ name: "Dave Smith" }, { name: "Jo Lee" }],
      [{ author: "Dave Smith", body: "Delivery arrived late" }],
    );
    expect(out).toContain("JOB-100");
    expect(out).toContain("Croydon Depot");
    expect(out).toContain("active");
    expect(out).toContain("3/10");
    expect(out).toContain("Dave Smith, Jo Lee");
    expect(out).toContain("Delivery arrived late");
  });

  it("says so when there is no crew booked today", () => {
    const out = renderJobStatus(job, [], []);
    expect(out).toContain("No crew booked today.");
  });

  it("omits the notes section when there are none", () => {
    const out = renderJobStatus(job, [], []);
    expect(out).not.toContain("Latest notes");
  });
});
```

Update the import block to add `renderJobStatus`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run supabase/functions/telegram-handler/__tests__/lib.test.ts`
Expected: FAIL — `renderJobStatus` is not exported yet.

- [ ] **Step 3: Implement in `lib.ts`**

```typescript
export type JobNoteView = { author: string; body: string };
export type CrewMember = { name: string };

export function renderJobStatus(
  job: {
    job_ref: string;
    site_name: string;
    status: string;
    current_pours: number;
    contract_max_pours: number;
  },
  crew: CrewMember[],
  notes: JobNoteView[],
): string {
  const lines = [
    `${job.job_ref} — ${job.site_name}`,
    `Status: ${job.status}`,
    `Pours: ${job.current_pours}/${job.contract_max_pours}`,
    crew.length ? `Today's crew: ${crew.map((c) => c.name).join(", ")}` : "No crew booked today.",
  ];
  if (notes.length) {
    lines.push("Latest notes:");
    for (const note of notes) lines.push(`• ${note.author}: ${note.body}`);
  }
  return lines.join("\n");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run supabase/functions/telegram-handler/__tests__/lib.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/telegram-handler/lib.ts supabase/functions/telegram-handler/__tests__/lib.test.ts
git commit -m "feat(telegram): /job status formatting"
```

---

## Task 4: `lib.ts` — `/today` formatting and role-gating helper

**Files:**

- Modify: `supabase/functions/telegram-handler/lib.ts`
- Test: `supabase/functions/telegram-handler/__tests__/lib.test.ts`

**Interfaces:**

- Produces: `type TodayJob = { site_name: string; postcode: string | null; crewCount: number }`, `renderToday(jobs: TodayJob[]): string`, `MANAGEMENT_ROLES: string[]`, `isManagementRole(role: string | null | undefined): boolean`

- [ ] **Step 1: Write the failing tests**

Add to `lib.test.ts`:

```typescript
describe("renderToday", () => {
  it("lists each site with its crew count", () => {
    const out = renderToday([
      { site_name: "Croydon Depot", postcode: "CR0 1AA", crewCount: 3 },
      { site_name: "Unassigned site", postcode: null, crewCount: 1 },
    ]);
    expect(out).toContain("Croydon Depot (CR0 1AA) — 3 crew");
    expect(out).toContain("Unassigned site — 1 crew");
  });

  it("says so when nothing is active today", () => {
    expect(renderToday([])).toBe("No sites active today.");
  });
});

describe("isManagementRole", () => {
  it("accepts each management role", () => {
    expect(isManagementRole("admin")).toBe(true);
    expect(isManagementRole("director")).toBe(true);
    expect(isManagementRole("logistics_coordinator")).toBe(true);
  });

  it("rejects a field role", () => {
    expect(isManagementRole("labourer")).toBe(false);
  });

  it("rejects null or undefined", () => {
    expect(isManagementRole(null)).toBe(false);
    expect(isManagementRole(undefined)).toBe(false);
  });
});
```

Update the import block to add `isManagementRole` and `renderToday`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run supabase/functions/telegram-handler/__tests__/lib.test.ts`
Expected: FAIL — `renderToday` and `isManagementRole` are not exported yet.

- [ ] **Step 3: Implement in `lib.ts`**

```typescript
export type TodayJob = { site_name: string; postcode: string | null; crewCount: number };

export function renderToday(jobs: TodayJob[]): string {
  if (jobs.length === 0) return "No sites active today.";
  const lines = jobs.map((j) => {
    const where = j.postcode ? `${j.site_name} (${j.postcode})` : j.site_name;
    return `${where} — ${j.crewCount} crew`;
  });
  return `Today's sites:\n${lines.join("\n")}`;
}

// Matches private.can_write_ops and MANAGEMENT_ROLES in
// src/opus/context/PortalContext.tsx:100 — there is no 'dispatcher' member of
// the app_role enum, so this list, not that word, is the gate.
export const MANAGEMENT_ROLES = ["admin", "director", "logistics_coordinator"];

export function isManagementRole(role: string | null | undefined): boolean {
  return !!role && MANAGEMENT_ROLES.includes(role);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run supabase/functions/telegram-handler/__tests__/lib.test.ts`
Expected: PASS — full file green, all `describe` blocks.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/telegram-handler/lib.ts supabase/functions/telegram-handler/__tests__/lib.test.ts
git commit -m "feat(telegram): /today formatting and role-gating helper"
```

---

## Task 5: `index.ts` — role resolution, geocoding, and `/who`

**Files:**

- Modify: `supabase/functions/telegram-handler/index.ts`

**Interfaces:**

- Consumes: `isManagementRole`, `cleanPostcode`, `GeoPoint`, `nearestByDistance`, `renderWho` from `lib.ts` (Tasks 1 and 4).
- Produces: `resolveRole(targetId: string): Promise<string | null>`, `handleWho(argument: string): Promise<HandlerResponse>`. `/who` wired into the `serve()` dispatch.

This task has no standalone unit test — `resolveRole` and `handleWho` both call Supabase and `postcodes.io`, so they are exercised by live verification in Task 9, matching how `handleMyWeek`, `handleCallback`, and `handleFile` were verified in stages 1–3 (this project has no integration harness for edge functions against a live project).

- [ ] **Step 1: Add the new imports**

In `supabase/functions/telegram-handler/index.ts`, extend the import from `./lib.ts` (currently lines 3–14):

```typescript
import {
  BridgeRequest,
  buildUploadPath,
  cleanPostcode,
  DENY_TEXT,
  GeoPoint,
  HandlerResponse,
  isDeclaredUploadTypeAllowed,
  isManagementRole,
  isValidBridgeSecret,
  MAX_UPLOAD_BYTES,
  nearestByDistance,
  parseCommand,
  renderWeek,
  renderWho,
  sniffFileType,
} from "./lib.ts";
```

- [ ] **Step 2: Add `resolveRole`**

Add after the existing `resolveLink` function:

```typescript
// staff.email → profiles.role, the same join notifyDispatchers uses below.
// Roles are read fresh on every call, never cached — a role change in the
// portal must take effect on the sender's very next message (design spec §5).
async function resolveRole(targetId: string): Promise<string | null> {
  const { data: staff } = await supabase
    .from("staff")
    .select("email")
    .eq("id", targetId)
    .maybeSingle();
  const email = staff?.email?.toLowerCase();
  if (!email) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("email", email)
    .maybeSingle();
  if (error) {
    console.error("resolveRole: profiles query failed", error.message);
    return null;
  }
  return profile?.role ?? null;
}
```

- [ ] **Step 3: Add geocoding helpers**

Add after `resolveRole`:

```typescript
function hashFallbackCoords(postcode: string): GeoPoint {
  let hash = 0;
  for (let i = 0; i < postcode.length; i += 1) hash = postcode.charCodeAt(i) + ((hash << 5) - hash);
  const lat = 52.5 + (Math.abs(hash % 100) / 100) * 1.5;
  const lng = -1.5 - (Math.abs((hash >> 2) % 100) / 100) * 1.5;
  return { lat, lng };
}

// One postcodes.io bulk POST for the whole candidate set rather than one
// fetch per staff member — a 30-strong roster would otherwise mean 30
// sequential HTTP round trips per /who. Falls back to the same hash-based
// generator src/opus/utils/geo.ts uses on API failure, so the bot never
// disagrees with the portal for the same postcode.
async function bulkGeocode(postcodes: string[]): Promise<Map<string, GeoPoint>> {
  const unique = [...new Set(postcodes.map(cleanPostcode))].filter(Boolean);
  const coords = new Map<string, GeoPoint>();
  if (unique.length === 0) return coords;

  try {
    const res = await fetch("https://api.postcodes.io/postcodes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ postcodes: unique.slice(0, 100) }),
    });
    if (res.ok) {
      const body = await res.json();
      for (const entry of body.result ?? []) {
        if (entry?.result) {
          coords.set(cleanPostcode(entry.query), {
            lat: entry.result.latitude,
            lng: entry.result.longitude,
          });
        }
      }
    }
  } catch (err) {
    console.error("bulkGeocode: postcodes.io request failed", err);
  }

  for (const code of unique) {
    if (!coords.has(code)) coords.set(code, hashFallbackCoords(code));
  }
  return coords;
}
```

- [ ] **Step 4: Add `handleWho`**

Add after `bulkGeocode`:

```typescript
async function handleWho(argument: string): Promise<HandlerResponse> {
  const postcode = argument.trim();
  if (!postcode) return { text: "Usage: /who <postcode>" };

  const { data: staff, error } = await supabase
    .from("staff")
    .select("name, postcode")
    .eq("is_archived", false)
    .not("postcode", "is", null);

  if (error) {
    console.error("handleWho: staff query failed", error.message);
    return { text: "Something went wrong — please try again shortly." };
  }
  if (!staff || staff.length === 0) {
    return { text: "No staff records have a postcode set." };
  }

  const coords = await bulkGeocode([postcode, ...staff.map((s) => s.postcode as string)]);
  const origin = coords.get(cleanPostcode(postcode));
  if (!origin) return { text: "Couldn't look up that postcode." };

  const candidates = staff
    .map((s) => {
      const point = coords.get(cleanPostcode(s.postcode as string));
      return point
        ? { name: s.name as string, postcode: s.postcode as string, coords: point }
        : null;
    })
    .filter((c): c is { name: string; postcode: string; coords: GeoPoint } => c !== null);

  return { text: renderWho(nearestByDistance(origin, candidates, 5)) };
}
```

- [ ] **Step 5: Wire `/who` into the dispatch**

In the `serve()` handler, the current non-callback/non-file branch ends with:

```typescript
result =
  command?.command === "myweek" ? await handleMyWeek(targetId) : { text: "Commands: /myweek" };
```

Replace it with:

```typescript
const cmd = command?.command;
if (cmd === "myweek") {
  result = await handleMyWeek(targetId);
} else if (cmd === "who") {
  result = isManagementRole(await resolveRole(targetId))
    ? await handleWho(command?.argument ?? "")
    : { text: "Commands: /myweek" };
} else {
  result = { text: "Commands: /myweek" };
}
```

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/telegram-handler/index.ts
git commit -m "feat(telegram): role resolution, geocoding, and /who"
```

---

## Task 6: `index.ts` — `/job`

**Files:**

- Modify: `supabase/functions/telegram-handler/index.ts`

**Interfaces:**

- Consumes: `renderJobStatus`, `JobNoteView`, `CrewMember` from `lib.ts` (Task 3); `isManagementRole`, `resolveRole` from Task 5.
- Produces: `handleJob(argument: string): Promise<HandlerResponse>`, wired as `/job` in dispatch.

No standalone unit test — same reasoning as Task 5; verified live in Task 9.

- [ ] **Step 1: Extend the `lib.ts` import**

Add `renderJobStatus` to the import block from Task 5, Step 1.

- [ ] **Step 2: Add `handleJob`**

Add after `handleWho`:

```typescript
async function handleJob(argument: string): Promise<HandlerResponse> {
  const ref = argument.trim();
  if (!ref) return { text: "Usage: /job <ref>" };

  const { data: job, error } = await supabase
    .from("jobs")
    .select("id, job_ref, site_name, status, current_pours, contract_max_pours")
    .ilike("job_ref", ref)
    .maybeSingle();

  if (error) {
    console.error("handleJob: jobs query failed", error.message);
    return { text: "Something went wrong — please try again shortly." };
  }
  if (!job) return { text: `No job found matching ${ref}.` };

  const today = new Date().toISOString().slice(0, 10);

  const { data: shifts, error: shiftsError } = await supabase
    .from("shifts")
    .select("staff(name)")
    .eq("job_id", job.id)
    .eq("date", today);
  if (shiftsError) {
    console.error("handleJob: shifts query failed", shiftsError.message);
    return { text: "Something went wrong — please try again shortly." };
  }
  const crew = (shifts ?? [])
    .map((row) => (row as Record<string, unknown>).staff as { name?: string } | null)
    .filter((s): s is { name: string } => Boolean(s?.name))
    .map((s) => ({ name: s.name }));

  const { data: notes, error: notesError } = await supabase
    .from("job_notes")
    .select("body, author_type, author_staff_id, user_email")
    .eq("job_id", job.id)
    .order("created_at", { ascending: false })
    .limit(3);
  if (notesError) {
    console.error("handleJob: job_notes query failed", notesError.message);
    return { text: "Something went wrong — please try again shortly." };
  }

  const authorIds = (notes ?? [])
    .filter((n) => n.author_type === "operative" && n.author_staff_id)
    .map((n) => n.author_staff_id as string);

  const authorNames = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: authors } = await supabase.from("staff").select("id, name").in("id", authorIds);
    for (const a of authors ?? []) authorNames.set(a.id as string, a.name as string);
  }

  const noteViews = (notes ?? []).map((n) => ({
    author:
      n.author_type === "operative"
        ? authorNames.get(n.author_staff_id as string) || "Operative"
        : (n.user_email as string) || "Dispatcher",
    body: n.body as string,
  }));

  return { text: renderJobStatus(job, crew, noteViews) };
}
```

- [ ] **Step 3: Wire `/job` into the dispatch**

Extend the dispatch block from Task 5, Step 5:

```typescript
const cmd = command?.command;
if (cmd === "myweek") {
  result = await handleMyWeek(targetId);
} else if (cmd === "who" || cmd === "job") {
  const role = await resolveRole(targetId);
  if (!isManagementRole(role)) {
    result = { text: "Commands: /myweek" };
  } else if (cmd === "who") {
    result = await handleWho(command?.argument ?? "");
  } else {
    result = await handleJob(command?.argument ?? "");
  }
} else {
  result = { text: "Commands: /myweek" };
}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/telegram-handler/index.ts
git commit -m "feat(telegram): /job status lookup"
```

---

## Task 7: `index.ts` — `/staff`

**Files:**

- Modify: `supabase/functions/telegram-handler/index.ts`

**Interfaces:**

- Consumes: `daysUntil`, `ticketStatusLine`, `renderStaffStatus`, `renderStaffMatches` from `lib.ts` (Task 2).
- Produces: `handleStaff(argument: string): Promise<HandlerResponse>`, wired as `/staff` in dispatch.

No standalone unit test — verified live in Task 9.

- [ ] **Step 1: Extend the `lib.ts` import**

Add `daysUntil`, `renderStaffMatches`, `renderStaffStatus`, `ticketStatusLine` to the import block.

- [ ] **Step 2: Add `handleStaff`**

Add after `handleJob`:

```typescript
async function handleStaff(argument: string): Promise<HandlerResponse> {
  const name = argument.trim();
  if (!name) return { text: "Usage: /staff <name>" };

  const { data: matches, error } = await supabase
    .from("staff")
    .select("id, name, tickets")
    .eq("is_archived", false)
    .ilike("name", `%${name}%`);

  if (error) {
    console.error("handleStaff: staff query failed", error.message);
    return { text: "Something went wrong — please try again shortly." };
  }
  if (!matches || matches.length === 0) {
    return { text: `No staff found matching ${name}.` };
  }
  if (matches.length > 1) {
    return { text: renderStaffMatches(matches.slice(0, 5).map((m) => m.name as string)) };
  }

  const person = matches[0];
  const todayIso = new Date().toISOString().slice(0, 10);
  const tickets = (person.tickets as Array<{ type?: string; expiryDate?: string }> | null) ?? [];
  const ticketLines = tickets.map((t) => {
    const days = t.expiryDate ? daysUntil(t.expiryDate, todayIso) : null;
    return ticketStatusLine(t.type || "Certificate", days, t.expiryDate);
  });

  const { data: nextShift, error: shiftError } = await supabase
    .from("shifts")
    .select("date, jobs(site_name)")
    .eq("worker_id", person.id)
    .gte("date", todayIso)
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (shiftError) {
    console.error("handleStaff: shifts query failed", shiftError.message);
    return { text: "Something went wrong — please try again shortly." };
  }

  const shiftRow = nextShift as Record<string, unknown> | null;
  const shiftJob = shiftRow?.jobs as { site_name?: string } | null;
  const nextShiftView = shiftRow
    ? { date: shiftRow.date as string, site_name: shiftJob?.site_name || "Unassigned site" }
    : null;

  return { text: renderStaffStatus(person.name as string, ticketLines, nextShiftView) };
}
```

- [ ] **Step 3: Wire `/staff` into the dispatch**

Extend the dispatch block from Task 6, Step 3 — add `cmd === "staff"` alongside `"who"`/`"job"`:

```typescript
const cmd = command?.command;
if (cmd === "myweek") {
  result = await handleMyWeek(targetId);
} else if (cmd === "who" || cmd === "job" || cmd === "staff") {
  const role = await resolveRole(targetId);
  if (!isManagementRole(role)) {
    result = { text: "Commands: /myweek" };
  } else if (cmd === "who") {
    result = await handleWho(command?.argument ?? "");
  } else if (cmd === "job") {
    result = await handleJob(command?.argument ?? "");
  } else {
    result = await handleStaff(command?.argument ?? "");
  }
} else {
  result = { text: "Commands: /myweek" };
}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/telegram-handler/index.ts
git commit -m "feat(telegram): /staff compliance lookup"
```

---

## Task 8: `index.ts` — `/today`

**Files:**

- Modify: `supabase/functions/telegram-handler/index.ts`

**Interfaces:**

- Consumes: `renderToday`, `TodayJob` from `lib.ts` (Task 4).
- Produces: `handleToday(): Promise<HandlerResponse>`, wired as `/today` in dispatch. This finalizes the dispatch block for all four commands.

No standalone unit test — verified live in Task 9.

- [ ] **Step 1: Extend the `lib.ts` import**

Add `renderToday` to the import block.

- [ ] **Step 2: Add `handleToday`**

Add after `handleStaff`:

```typescript
async function handleToday(): Promise<HandlerResponse> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: shifts, error } = await supabase
    .from("shifts")
    .select("job_id, jobs(site_name, postcode)")
    .eq("date", today);

  if (error) {
    console.error("handleToday: shifts query failed", error.message);
    return { text: "Something went wrong — please try again shortly." };
  }

  const byJob = new Map<
    string,
    { site_name: string; postcode: string | null; crewCount: number }
  >();
  for (const row of shifts ?? []) {
    const jobId = row.job_id as string;
    const job = (row as Record<string, unknown>).jobs as {
      site_name?: string;
      postcode?: string;
    } | null;
    const existing = byJob.get(jobId);
    if (existing) {
      existing.crewCount += 1;
    } else {
      byJob.set(jobId, {
        site_name: job?.site_name || "Unassigned site",
        postcode: job?.postcode ?? null,
        crewCount: 1,
      });
    }
  }

  return { text: renderToday([...byJob.values()]) };
}
```

- [ ] **Step 3: Wire `/today` into the dispatch, finalizing the block**

Replace the dispatch block from Task 7, Step 3 with its final form:

```typescript
const cmd = command?.command;
if (cmd === "myweek") {
  result = await handleMyWeek(targetId);
} else if (cmd === "who" || cmd === "job" || cmd === "staff" || cmd === "today") {
  const role = await resolveRole(targetId);
  if (!isManagementRole(role)) {
    result = { text: "Commands: /myweek" };
  } else if (cmd === "who") {
    result = await handleWho(command?.argument ?? "");
  } else if (cmd === "job") {
    result = await handleJob(command?.argument ?? "");
  } else if (cmd === "staff") {
    result = await handleStaff(command?.argument ?? "");
  } else {
    result = await handleToday();
  }
} else {
  result = { text: "Commands: /myweek" };
}
```

- [ ] **Step 4: Run the full `lib.ts` test suite once more**

Run: `npx vitest run supabase/functions/telegram-handler/__tests__/lib.test.ts`
Expected: PASS — confirms nothing in Tasks 5–8 touched `lib.ts` in a way that broke the pure-function tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/telegram-handler/index.ts
git commit -m "feat(telegram): /today site summary, finalize dispatcher command dispatch"
```

---

## Task 9: Deploy and verify live

**Files:** none (operational task)

- [ ] **Step 1: Deploy**

Run from the repo root:

```bash
npx supabase functions deploy telegram-handler --project-ref fgpthpxmiroyebrzjdzo --no-verify-jwt
```

Confirm the CLI reports a successful deploy and note the new version number.

- [ ] **Step 2: Verify `/who` as a management-role sender**

Using the real linked Telegram test account (`worker-1783854687613`, Luke Williams — per the handoff, currently the only linked account), temporarily set that account's `profiles.role` to `admin` if it is not already management, then send `/who <a real staff postcode>` in Telegram. Confirm the reply lists staff sorted nearest-first with distances, or the correct "no postcode" message if none are set.

- [ ] **Step 3: Verify `/job`**

Send `/job <a real job_ref>` in Telegram. Confirm status, pours, today's crew, and up to 3 notes render correctly. Send `/job doesnotexist` and confirm the "No job found" reply.

- [ ] **Step 4: Verify `/staff`**

Send `/staff <a real first or last name substring>` that matches exactly one person — confirm ticket lines and next shift render. Send a substring matching 2+ people (or temporarily add a second test staff row with a similar name) — confirm the multi-match reply lists names and asks to refine. Send `/staff nonexistentname` — confirm the "No staff found" reply.

- [ ] **Step 5: Verify `/today`**

Send `/today`. Confirm it lists sites with today's shifts, or "No sites active today." if none.

- [ ] **Step 6: Verify non-management gating**

Set the test account's `profiles.role` back to a field role (e.g. `labourer`) and resend each of `/who`, `/job`, `/staff`, `/today`. Confirm every one returns the same `Commands: /myweek` reply as an unrecognised command — no different wording, no indication the command exists.

- [ ] **Step 7: Restore role and clean up**

Set `profiles.role` back to whatever it was before Step 2. If any test staff rows, jobs, or job_notes were created for Steps 3–4, delete them and confirm zero rows remain, per the project's established test-data cleanup convention (handoff §5).

- [ ] **Step 8: Write the completion doc**

Create `.claude/completions/2026-08-13-telegram-stage4-dispatcher-commands.md` summarizing what shipped (the four commands, the role gate, the bulk-geocode approach), any bugs hit during live verification and their fixes, and confirmation that test data was cleaned up — matching the structure of `.claude/completions/2026-08-13-telegram-stage3-uploads.md`.

- [ ] **Step 9: Commit the completion doc**

```bash
git add .claude/completions/2026-08-13-telegram-stage4-dispatcher-commands.md
git commit -m "docs(completion): telegram stage 4 dispatcher commands"
```
