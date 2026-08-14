# Telegram Work — Session Handoff (2026-08-14)

**Purpose**: everything a fresh session needs to continue. Read this first, then only the files it points at. Supersedes `2026-08-13-telegram-session-handoff.md`.

---

## 1. Read these, in order

1. `docs/superpowers/specs/2026-08-13-telegram-bot-design.md` — product design: audiences, capabilities, third-party tiers, build order, what is deliberately out of scope.
2. `docs/superpowers/specs/2026-08-13-telegram-bridge-instructions.md` — the VPS bridge contract (not in this repo; Oracle Cloud server, maintained by Jinn over SSH).
3. `docs/superpowers/specs/2026-08-13-telegram-stage4-dispatcher-commands-design.md` and `.claude/completions/2026-08-14-telegram-stage4-dispatcher-commands.md` — what stage 4 actually built, the bugs found in its own final review, and the bug found outside its scope (section 5 below).

Ignore `2026-08-13-telegram-bridge-handoff.md` (superseded) and `2026-08-13-telegram-session-handoff.md` (this doc replaces it, but its stage 1–3 history is still accurate — see §2).

---

## 2. What is live and working

**Stage 1 — complete, verified live.** Linking, `/myweek`, shift confirm/decline.

**Stage 2 — complete, verified live.** Shift reminders, certificate expiry warnings, dispatcher digests.

**Stage 3 — complete, verified live.** Certificate/job-file uploads via Telegram photo/PDF.

**Stage 4 — complete, verified live (twice).** `/who <postcode>`, `/job <ref>`, `/staff <name>`, `/today`, gated to `admin`/`director`/`logistics_coordinator`. Plus a typing indicator (`sendChatAction`, refreshed every 4s until the reply is ready), added mid-branch at the user's request. Merged to `dev` at `e7d512d` and pushed to `origin/dev`.

All four stages are on `dev`. No unmerged branches remain.

---

## 3. What's next — decide before starting

Per the design spec's Build Order (§15), the only remaining committed-scope item is:

- **Stage 5 — natural language layer.** Free text resolves to the same fixed tools `/who`/`/job`/`/staff`/`/today`/`/myweek` already call, tool selection only, six hard safety constraints in design spec §8.2 (facts come from query results verbatim, permission checks run on the resolved tool not the intent, writes never auto-fire, third parties get none of it, low confidence disambiguates, every action logs the original message text). These are not tuning parameters — they're why the layer is safe to ship at all. Read §8 in full before designing this.

Also still open, not yet decided or scheduled:

- **Stage-3 cuts** (from the original handoff, still true): no admin UI for `document_requests.telegram_uploads`; no `callback_query` picker for 2+ open document requests or 2+ same-day shifts; no structured cert capture; no image before/after classification. All four need mid-flow pending-upload state that doesn't exist yet — building that state unlocks three of the four at once.
- **Two bugs found during stage 4's own work, not fixed (out of scope for that branch):**
  1. **Role changes are broken in the portal's Users admin page for everyone.** `admin-manage-user`'s edge function writes `profiles.role` through a service-role Supabase client with no `auth.uid()`, so the DB trigger `prevent_role_self_escalation_trg`/`profiles_prevent_role_self_escalation` rejects the write even for the real, already-gated admin caller. Confirmed live. Fix is presumably either (a) have the edge function set the session's role/uid context before the write, or (b) have the trigger also accept a service-role write from a caller the edge function has already vetted — needs a design decision, not just a patch.
  2. `handleMyWeek` (in `telegram-handler/index.ts`, unchanged since stage 1) doesn't check its `shifts` query's error, and uses `?? "Unassigned site"` instead of `||`. Small, mechanical, same fix shape as three findings in stage 4's own review — good first task for whoever picks this up, or fold into whatever branch next touches this file.

Decide: stage 5, the stage-3 pending-upload state, or the two bugs above, before writing a design/plan.

---

## 4. Operational facts that are easy to get wrong

Everything from the previous handoff still applies — re-read carefully, especially:

- **Secret name is `OPUSFORM_HANDLER_SECRET`** on both Supabase and the VPS. `OPUSFORM_BRIDGE_SECRET` is a dead name.
- **Deploy edge functions from the repo root with the CLI**, never Composio:
  `npx supabase functions deploy <slug> --project-ref fgpthpxmiroyebrzjdzo --no-verify-jwt`
  Composio resets `verify_jwt` to `true` and only sends a single file, breaking `telegram-handler`'s `./lib.ts` import.
- **Migrations are applied directly** (Composio `SUPABASE_BETA_RUN_SQL_QUERY`, not `db push`), then a row inserted into `supabase_migrations.schema_migrations`.
- **Live schema drift is real and ongoing** — check `information_schema.columns` (or a Composio `SUPABASE_GET_TABLE_SCHEMAS` call) against the live project before trusting a migration file's column list.
- **`storage.objects` is not exposed to PostgREST.** Use the Storage API's own `.list()`/`.upload()`/`.remove()`.
- **Cannot `DELETE FROM storage.objects` directly** — `storage.protect_delete()` blocks it. Use `npx supabase storage rm --experimental --linked ss:///bucket/path`.
- **Bot token** lives only in Supabase secrets as `TELEGRAM_BOT_TOKEN`, never on the VPS.
- **The `??` vs `||` trap**: Telegram sends empty strings, not missing fields. Use `||` for anything that must never end up blank downstream. Stage 4's own final review caught three more instances of this exact mistake in new code — it is still the single most common bug shape in this codebase.
- **New this session — DB triggers can silently fight a service-role write.** `prevent_role_self_escalation_trg` checks `auth.uid()`, which is null under a service-role client with no user session — any future edge function writing to a trigger-guarded column via service role should check for this class of failure before assuming the write "just didn't happen for no reason." (See §3's open bug.)
- **New this session — Composio's `SUPABASE_BETA_RUN_SQL_QUERY` runs multi-statement SQL as one transaction but only returns the first statement's result.** Verify multi-statement writes (e.g. `DISABLE TRIGGER; UPDATE; ENABLE TRIGGER;`) with a follow-up `SUPABASE_RUN_READ_ONLY_QUERY`, don't trust the write call's own response.
- **Composio's bulk `postcodes.io`-style third-party APIs need an explicit timeout** (`AbortSignal.timeout(...)` on `fetch`) — a hung third-party call with only a `try/catch` around it does not fail, it hangs the whole handler. Stage 4's final review caught this once already; check for it in any new outbound `fetch`.

---

## 5. Test data to clear

Nothing outstanding as of 2026-08-14 — stage 4's two live-verification rounds (one `job_notes` row, two `shifts` rows, one test `tickets` entry) were all created against real rows (`worker-1783854687613` / `g8na57afp`) and fully removed, confirmed zero remaining. If you add more live-test rows, same rule as always: delete the DB row _and_ any ledger/queue entry that references it.

---

## 6. Two bugs found in earlier stages, still worth remembering as patterns

**Missing foreign keys silently broke queries.** No declared FK means PostgREST can't resolve an embedded select — check for a declared FK before writing any embedded select.

**A role or enum label that doesn't exist errors the whole query, not just that filter.** `.in("role", ["dispatcher", ...])` against an enum with no `dispatcher` member rejects the entire statement, and `?? []` swallows it silently. Check enum labels before filtering on them, and never discard the error from a query whose empty result is meaningful. (Stage 4 reinforced this: `MANAGEMENT_ROLES = ["admin", "director", "logistics_coordinator"]`, never `dispatcher`.)
