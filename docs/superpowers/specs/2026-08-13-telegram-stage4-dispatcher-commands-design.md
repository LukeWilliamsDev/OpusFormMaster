# Telegram Stage 4 — Dispatcher Commands Design

**Date**: 2026-08-13
**Status**: Approved, pending implementation plan
**Scope**: `/who`, `/job`, `/today`, `/staff` for linked dispatchers/admins, per design spec §6.2 / §12.2 / §15 stage 4.

---

## 1. Purpose

Give dispatchers and admins read-only operational lookups from chat, matching the capability list already committed in `docs/superpowers/specs/2026-08-13-telegram-bot-design.md` §6.2. No new write paths, no new tables, no `callback_query` — every one of these is a database read rendered to text.

---

## 2. Role gating

`telegram_links.target_id` points at a `staff` row; role lives on `profiles`, joined by email — the same pattern `notifyDispatchers` (index.ts) and `dispatcherRecipients` (telegram-notify/index.ts) already use, because there is no `dispatcher` member of the `app_role` enum and naming one in a filter rejects the whole query (handoff §6).

```
resolveRole(targetId): staff.email → profiles.role
isManagement(role): role in ["admin", "director", "logistics_coordinator"]
```

Only called when the parsed command is one of the four gated ones — `/myweek` and file uploads stay on the existing no-extra-query path.

**Non-management sender, or an unrecognised command, get the identical fallback reply.** Command existence is not disclosed to a role that cannot use it — matches how the portal nav hides items a role cannot reach.

---

## 3. Commands

### 3.1 `/who <postcode>`

Nearest active staff to a postcode, regardless of today's shift status (all staff count, not just unassigned ones — confirmed with the user, differs from a "who's free" reading).

- Geocode the input postcode **and every active staff postcode** in a single `postcodes.io` bulk POST (`https://api.postcodes.io/postcodes`, up to 100 per call) — one network round trip for the whole roster, not one per candidate. Falls back to the existing local hash-based generator (`getPostcodeCoordinates` in `src/opus/utils/geo.ts`) on API failure, mirroring the client-side behaviour so the bot never gives a different answer than the portal would for the same postcode.
- Haversine distance (ported into `lib.ts` — edge functions cannot import from `src/opus`, and this codebase's existing precedent, e.g. `isValidBridgeSecret` vs `telegram-notify`'s own `secretOk`, is small pure duplicates per function rather than cross-function imports).
- Top 5 by distance, staff with no postcode set excluded from ranking (cannot be placed).
- Zero staff have a postcode → "No staff records have a postcode set."

### 3.2 `/job <ref>`

Exact, case-insensitive `job_ref` match.

- Not found → "No job found matching `<ref>`."
- Found → site name, status, `current_pours`/`contract_max_pours`, today's crew (shifts joined to staff for that job + today's date), last 3 `job_notes` newest-first with author name:
  - `author_type = 'operative'` → `staff.name` via `author_staff_id`.
  - `author_type = 'ops'` (default) → `user_email`.

### 3.3 `/staff <name>`

Case-insensitive substring match on active staff.

- 0 matches → "No staff found matching `<name>`."
- 2+ matches → list up to 5 names, ask the dispatcher to be more specific. No picker — same text-only disambiguation stage 3 used for ambiguous uploads.
- 1 match → each ticket's expiry status, reusing the day-count/threshold wording already in `telegram-notify/index.ts` (`daysUntil`, the three-tier "expires in / expires today / expired" phrasing) so the bot never states a different compliance answer than the daily digest does — duplicated into `telegram-handler/lib.ts`, not imported cross-function, consistent with how the two functions already relate. Plus next shift: earliest `shifts` row with `date >= today`, ordered ascending, with site name.

### 3.4 `/today`

All `shifts` rows for today, joined to `jobs(site_name, postcode)`, grouped by job: site name + crew count. No shifts today → "No sites active today."

---

## 4. Non-goals (explicitly not this stage)

- No `callback_query` / inline keyboards — nothing here needs mid-flow state.
- No natural language (`/who`-shaped free text) — stage 5, gated on the six constraints in the design spec §8.2.
- No write actions (approve/reject cert, broadcast to crew, add note as dispatcher) — same read-only cut as the rest of this stage; those are separate future increments, not folded in here.
- No date argument on `/who` (e.g. `/who SW1 2026-08-20`) — today-shaped only, matching `/today` and `/myweek`'s existing "no date param" precedent. Add later if dispatchers ask for it in practice.

---

## 5. Error handling

- `postcodes.io` unreachable → local hash-based fallback (§3.1), never a hard failure.
- Any Supabase query error → generic "Something went wrong — please try again shortly." and `console.error` the detail, matching `handleFile`'s existing fail-closed pattern. Never let a query error read as "no results" (handoff §6 — the missing-FK and rejected-enum bugs both came from swallowing an error into an empty result).

---

## 6. Testing

- `lib.ts` additions (Haversine, ticket-threshold formatting, the four response formatters) get Vitest coverage alongside the existing `renderWeek` tests — pure functions, no Deno/Supabase imports, same file (`__tests__/lib.test.ts`).
- `index.ts` handlers (role gating, the actual queries) verified live against real Telegram, same as stages 1–3 — this project has no integration-test harness for edge functions against a live Supabase project, so live verification is the established substitute (handoff, stage 3 completion doc).

---

## 7. Data model

No migration. Every column this stage reads already exists: `jobs.job_ref/status/current_pours/contract_max_pours`, `staff.postcode/tickets/is_archived`, `shifts.date/worker_id/job_id`, `job_notes.author_type/author_staff_id/user_email/body`, `profiles.role`.

---

## 8. Success criteria

- A dispatcher can find the nearest operatives to a site, check a job's status, and check a worker's compliance, all without opening the portal — matching design spec §6.2 and §16.
- An operative sending any of these four commands gets the same reply as sending gibberish.
- No command in this stage produces a different compliance or distance answer than the equivalent portal view or the existing `telegram-notify` digest would.
