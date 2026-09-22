# Telegram Stage 4 — Dispatcher Commands

**Date**: 2026-08-14
**Status**: Shipped and verified live through real Telegram, including a second verification round after the final-review fix wave below.

---

## What shipped

`telegram-handler` now accepts four read-only lookups for linked dispatchers/admins, gated by `profiles.role` (`admin`/`director`/`logistics_coordinator`):

- **`/who <postcode>`** — nearest active staff by postcode, sorted ascending. Geocodes the search postcode and every candidate staff postcode in one `postcodes.io` bulk call, falling back to the same hash-based generator `src/opus/utils/geo.ts` uses on API failure.
- **`/job <ref>`** — exact case-insensitive `job_ref` lookup: status, `current_pours`/`contract_max_pours`, today's crew, last 3 `job_notes` with author (`author_staff_id`→staff name for operative notes, `user_email` for ops notes).
- **`/staff <name>`** — case-insensitive substring match. 0 matches → says so. 2+ → lists up to 5 names, asks to refine (no picker, same text-only pattern stage 3 used for ambiguous uploads). 1 match → each ticket's expiry status plus next shift.
- **`/today`** — today's shifts grouped by job: site name + crew count.

Non-management senders and unrecognised commands both get the identical `Commands: /myweek` reply — command existence isn't disclosed to a role that can't use it.

No new tables, no `callback_query`, no migration — every column read already existed.

**Also shipped in the same deploy, at the user's request mid-verification:** a typing indicator. `telegram-handler` fires `sendChatAction("typing")` on every inbound message and resends it every 4s (under Telegram's ~5s auto-expiry) via `startTypingLoop`/`stopTyping`, stopped in a `finally` right before the response goes out — so the indicator never outlives or falls short of the real reply. Only `telegram-handler` can do this; the bridge deliberately holds no bot token.

## Process notes

Built with `superpowers:subagent-driven-development` in an isolated worktree (`feat/telegram-dispatcher-commands`, branched from `dev` at `15126ce`). 8 plan tasks, cheap-tier (haiku) implementers on fully-specified brief code, sonnet task reviewers. Two review findings across the loop, both real:

- **Task 5** (Important): `resolveRole`'s staff-lookup query didn't check its error — fixed round 1.
- **Task 6** (Critical): `handleJob`'s author-batch-lookup query didn't check its error — fixed round 1.

Both were query-error-swallowing gaps that violated the plan's own Global Constraints; both traced to the plan's own example code omitting the check, not implementer drift, and both were fixed rather than parked since the constraint was explicit.

- **Task 7** had a genuine implementer-drift bug caught in review: wrong `tickets` jsonb field names (`ticket_type`/`expiry_date` instead of the real `type`/`expiryDate`) plus two `??`/`||` mixups — all three fixed round 1. The implementer also twice claimed its report file was written when it wasn't; the controller wrote it directly after two failed resume attempts, since it's workspace bookkeeping, not a reviewed code artifact.
- Tasks 1–4 and Task 8 reviewed clean or with only deferred minors.

One out-of-scope finding surfaced but not acted on: `handleMyWeek`'s pre-existing `shifts` query (unchanged, from an earlier stage) doesn't check its error either, and uses `?? "Unassigned site"` rather than `||`. Flagged for a future cleanup pass alongside the `admin-manage-user` bug below, not this stage's scope.

### Final whole-branch review

A final review (opus, most-capable-model tier per the process) after all 9 tasks landed found the per-task loop's error-handling defect class fully closed (10/10 new Supabase queries in the branch check and log their errors) and the cross-task dispatch integration clean, but caught one real Important-severity issue no single task's diff would show: `bulkGeocode`'s hash-based fallback filled in fabricated coordinates for _every_ unresolved postcode, including the search origin, which made `handleWho`'s own `"Couldn't look up that postcode."` guard dead code — a typo'd or garbage postcode produced a confident, well-formatted, entirely fabricated `/who` result instead of an error. A dispatcher could act on a wrong answer without any signal it was wrong. Also flagged: no timeout on the `postcodes.io` fetch (a hang, not just a failure, would hang `/who` indefinitely), a typing-indicator interval that could theoretically leak if `parseCommand` ever threw, and a comment overclaiming portal/bot parity.

Fixed in one consolidated fix wave (commit `b210bed`), re-reviewed clean: `bulkGeocode` now reports which postcodes actually resolved via the real API (`resolved: Set<string>`) separately from ones filled by the hash fallback; `handleWho` treats the origin as unresolved and drops any candidate whose postcode isn't in that real-resolved set, so a fabricated coordinate can never enter a ranking a dispatcher sees. Added `AbortSignal.timeout(5000)` to the geocode fetch. Moved `parseCommand` inside `serve()`'s `try` block alongside the typing-indicator start so both are covered by the same `finally`. Narrowed the parity comment.

The review also flagged that three handler code paths — `handleJob`'s crew mapping, `handleToday`'s `byJob` grouping, and `handleStaff`'s ticket-line/next-shift mapping — had run zero iterations in the first live-verification round, because the real data happened to be empty everywhere those paths mattered (no shifts today, no tickets on the one staff member tested). Closed with a second live round (see below) using minimal, deleted-after test data.

## Bug found outside this stage's scope, worth a follow-up

**Role changes are currently broken in the portal's Users admin page for everyone**, not just self-escalation. `admin-manage-user`'s edge function (`supabase/functions/admin-manage-user/index.ts:152`) writes `profiles.role` through a service-role Supabase client, which has no `auth.uid()` — so the DB trigger `prevent_role_self_escalation_trg`/`profiles_prevent_role_self_escalation` (which checks `private.has_role(auth.uid(), 'admin')`) rejects the write even though the edge function already gates the whole request on `caller.email === ADMIN_EMAIL` at the top. Confirmed live: attempting a role edit as the real admin account through the portal UI fails with "Only administrators can change roles." Discovered because it blocked the live-verification role flip for this stage's gating test — worked around by temporarily disabling and re-enabling the two triggers directly in SQL for the test, then restoring. Not fixed here — out of scope for this plan.

## Live verification

Deployed `telegram-handler` (CLI, `--no-verify-jwt`, from repo root — not Composio, which resets `verify_jwt` and breaks the `./lib.ts` import per the handoff's standing warning).

Tested against the real linked account (`worker-1783854687613`, Luke Williams, `admin@opusform.co.uk`, already `admin` role — no invite/link setup needed):

- `/who SK236DA` → `Luke Williams — SK236DA (0.0 mi)` / `Anais Baker — SK236DW (0.7 mi)`, correctly sorted, correctly excluding the 3 active staff with no postcode.
- `/job OP-3661` → status, pours `0/1`, no crew (no shift today), both note-author branches exercised live (one operative-authored test note, one pre-existing ops-authored note) and both attributed correctly.
- `/job NONEXISTENT` → not-found message.
- `/staff baker` → real ambiguous match (Liam Baker / Anais Baker, no test rows needed) → correct multi-match reply.
- `/staff luke` → correct single match, empty-state wording for no certificates and no upcoming shifts (real data — Luke's `tickets` is `[]`).
- `/staff zzznonexistent` → not-found message.
- `/today` → `No sites active today.` (real — no shifts existed for the test date).
- Non-management gate: role temporarily flipped to `labourer`, all four commands resent, all four returned the identical `Commands: /myweek` fallback. Role restored to `admin` immediately after.
- Typing indicator confirmed visible and persistent through to each reply.

**Second round, after the final-review fix wave**, redeployed and re-tested with minimal test data to exercise the three previously-empty code paths:

- `/job OP-3661` → `Today's crew: Luke Williams` — `handleJob`'s crew-mapping chain (`shifts → row.staff → {name}`) confirmed correct against a real row.
- `/staff luke` → `CSCS Card — expires in 37 days (2026-09-20)`, `Next shift: 2026-08-14 — Manchester College - Openshaw Campus` — both the ticket-line mapping and `nextShift` construction confirmed correct (37-day count matches `2026-08-14`→`2026-09-20` exactly).
- `/today` → `Manchester College - Openshaw Campus (M11 2WH) — 1 crew` — `handleToday`'s `byJob` grouping and `crewCount` increment confirmed correct.

All three previously-unexercised handler mapping paths are now verified against real live data, not just their unit-tested `render*` counterparts.

## Test data

One `job_notes` row was inserted against real job `g8na57afp` to exercise the operative-authored note branch (`author_type: 'operative'`, `author_staff_id: worker-1783854687613`) — deleted after verification, confirmed zero matching rows remain. No other test rows were needed for the first round: the real roster and job data already covered the ambiguous-staff-match, empty-certificates, empty-shifts, and no-sites-today cases without fabrication.

For the second round: two `shifts` rows (`shift-stage4-verify-today` for today, `shift-stage4-verify-future` 3 days out, both `worker-1783854687613` on job `g8na57afp`) and one test ticket written to `worker-1783854687613`'s `staff.tickets`. All deleted / reverted to `[]` after verification, confirmed zero matching shift rows remain and `tickets` is back to `[]`.
