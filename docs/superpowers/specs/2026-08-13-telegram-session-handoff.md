# Telegram Work — Session Handoff

**Date**: 2026-08-13
**Purpose**: everything a fresh session needs to continue. Read this first, then only the files it points at.

---

## 1. Read these, in order

1. `docs/superpowers/specs/2026-08-13-telegram-bot-design.md` — product design: audiences, capabilities, third-party tiers, what is deliberately out of scope.
2. `docs/superpowers/specs/2026-08-13-telegram-bridge-instructions.md` — the VPS contract. The bridge is **not** in this repo; it runs on an Oracle Cloud server and is maintained by a separate agent (Jinn) over SSH.
3. `docs/superpowers/plans/2026-08-13-telegram-stage-1.md` — stage 1 plan, now complete.

Ignore the older `2026-08-13-telegram-bridge-handoff.md`; the instructions file supersedes it.

---

## 2. What is live and working

**Stage 1 — complete, verified end to end through real Telegram.**

- `telegram_invites` / `telegram_links` with RLS, `create_telegram_invite` and `revoke_telegram_link` RPCs, and a trigger revoking links when staff are archived.
- `telegram-handler` edge function: `/start <token>` linking, `/myweek`, `ack.link_added` / `ack.link_revoked`, shift confirm/decline callbacks, dispatcher alerts.
- Portal: `TelegramLinkControl` in the dossier action row (Edit / Request Docs / **Telegram** / Archive) with confirm dialogs for invite, cancel, and revoke.
- Bridge: relays everything to the handler. No Jinn session on Telegram for anyone.

**Stage 2 — complete except expiry warnings.**

- `shifts.confirmed_at` / `declined_at`; `telegram_notifications` dedupe ledger; `pg_net` enabled.
- `telegram-notify` sends tomorrow's shift reminders with confirm/decline buttons, claiming each send in the ledger _before_ dispatch so a double-send is structurally impossible.
- pg_cron job `telegram-shift-reminders` at `0 17 * * *` (18:00 BST), reading the secret from Vault.
- Dashboard `ShiftResponses` widget: week ahead, declines first, red "needs cover" count.

---

## 3. The only outstanding stage 2 item

**Certificate expiry warnings.** An addition to `supabase/functions/telegram-notify/index.ts` — no new plumbing.

- Operatives: warnings at 30, 14 and 7 days before expiry, plus a lockout notice on the expiry day.
- Dispatchers: one daily digest — a count plus the most urgent cases — not one message per ticket.
- Same ledger, `kind: 'cert_expiry'`, dedupe key `<staffId>:<ticketId>:<threshold>`.
- Tickets are JSONB on `staff`, keys: `type`, `expiryDate`, `ticketNumber`, `id`.

**Reuse the Dashboard's thresholds** — it computes `expiringTickets` at `src/opus/pages/Dashboard.tsx:239`. The bot and the portal must not give different answers to the same compliance question.

---

## 4. Operational facts that are easy to get wrong

- **Secret name is `OPUSFORM_HANDLER_SECRET`** on both Supabase and the VPS. `OPUSFORM_BRIDGE_SECRET` is a dead name from an earlier mistake — do not reintroduce it.
- **Deploy from the repo root**, not from a home directory:
  `npx supabase functions deploy <slug> --project-ref fgpthpxmiroyebrzjdzo --no-verify-jwt`
  The CLI is authenticated and resolves local imports, so `lib.ts` deploys alongside `index.ts`.
- **Deploying via Composio resets `verify_jwt` to `true`** and it must be set back to `false` afterwards. The CLI with `--no-verify-jwt` does not have this problem — prefer the CLI.
- **Never batch a Composio deploy and a `verify_jwt` update in one parallel call.** They race, and the update lands on the previous version.
- **Migrations are applied directly** (Composio SQL or dashboard), not via `db push`. After applying, insert a row into `supabase_migrations.schema_migrations` or the next push will collide. Repo filenames and tracked versions already diverge historically.
- **Bot token** lives only in Supabase secrets as `TELEGRAM_BOT_TOKEN`, deliberately never on the VPS. Composio has no `getFile` action, so file download is only possible from Supabase.
- **Vault** holds `telegram_handler_secret` for the cron. Separate store from Function Secrets.

---

## 5. Test data to clear

A test shift and its ledger row may still exist:

```sql
delete from public.shifts where id like 'shift-tg-test-%';
delete from public.telegram_notifications where dedupe_key like 'shift-tg-test-%';
```

Both lines matter — an orphan ledger row would suppress a genuine reminder if that shift id recurred.

---

## 6. Two bugs found late, worth remembering as patterns

**Missing foreign keys silently broke queries.** `shifts` had no FK to `jobs` or `staff`, so PostgREST could not resolve `jobs(site_name)` embeds — the request errored and returned null, indistinguishable from "no rows". This broke `/myweek` and the reminder sender. The `/myweek` test _looked_ like a pass because there genuinely were no shifts. Fixed in `20260813160000`. **Check for a declared FK before writing any embedded select.**

**Ambiguous success reporting hid it.** `{sent: 0, failed: 0}` could not distinguish "nothing to do" from "everything silently skipped". `telegram-notify` now reports `candidates`, `sent`, `failed`, `skipped` and surfaces query errors.

---

## 7. Deferred by decision, not oversight

- **Stage 3** — certificate and document uploads. The bridge already forwards file metadata; the handler currently declines with a not-available-yet message. Needs `getFile` download in the edge function, magic-byte validation, generated storage paths, and per-token rate limits. See section 7 of the design spec.
- **Stage 4** — dispatcher commands (`/who`, `/job`, `/today`, `/staff`) gated by `profiles.role`. The `staff.email` → `profiles.email` join already exists in `notifyDispatchers` and can be lifted out.
- **Stage 5** — natural language as tool-selection only. Six hard constraints in section 8 of the design spec; they are the reason it is safe, not tuning knobs.
- **Third-party access beyond upload** — Tier 0 only. Tiers 1 and 2 stay unbuilt absent a specific contractor need. Conditions in section 10 of the design spec.
- **`job_notes` already exists** with ops-only RLS and no author-type column. Stage 3 needs a policy and a column, not a new table — the design spec is wrong on this point.
