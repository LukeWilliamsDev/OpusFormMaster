# Telegram Bot — Capability Scope Design

**Date**: 2026-08-13
**Status**: Design in review, pending implementation plan
**Scope**: What OpusForm users can do via Telegram, and how the existing bridge must change to support it.

---

## 1. Purpose

Give OpusForm a chat surface for the work that does not belong at a desk: shift notifications, compliance chasing, document collection, job notes, and quick operational lookups. The portal remains the system of record and the only place complex work happens.

**Platform: Telegram.** Free, native inline keyboards and file uploads, and bot creation is immediate.

---

## 2. Existing Infrastructure

A working bridge already exists. It is not in this repository — it runs on an Oracle Cloud server (2 CPU, 12 GB) under systemd.

```
Telegram
  → Composio long-polling (TELEGRAM_GET_UPDATES)
  → local Telegram bridge (composio-telegram-bridge.mjs)
  → allowlist check
  → Jinn session via localhost gateway
  → assistant response
  → Telegram reply
```

**Currently in place**

- Bot `@OpusFormBot`, long-polling rather than webhooks.
- Default-deny allowlist. One approved Telegram ID (the owner). Unknown senders are recorded and silently ignored.
- Owner-only commands: `/users`, `/approve <telegram-id>`, `/revoke <telegram-id>`.
- One persistent Jinn conversation session per chat. In-order processing per chat, up to eight chats concurrent.
- Replies wait up to three minutes, split at Telegram's message limit.
- Pending messages, polling offsets, observed users, and session mappings survive restarts.
- Composio organisation verified as `opusform` before every action.

**Not in place**

- No OpusForm identity linking, RBAC, or RLS enforcement.
- No `/myweek`, `/mycerts`, `/who`, `/job`, `/today`.
- No inline keyboards or confirmation callbacks.
- No notifications, uploads, job notes, dispatcher alerts, or broadcasts.
- No files processed — message text and captions only.

> **Unverified**: the above describes reported behaviour. Bridge source has not been read. Every integration point in sections 4, 9, and 10 must be confirmed against `composio-telegram-bridge.mjs`, its service definition, access policy, and runtime state before implementation.

---

## 3. Design Principles

**Chat is good for**: notify, confirm, upload, look up one thing.
**Chat is bad for**: multi-field forms, tabular data, PDF review, anything requiring audit-grade scrutiny.

Any interaction needing more than roughly three taps is a portal task. The bot sends a deep link instead of attempting the interaction inline.

**The bot adds no new permissions.** Every capability maps to something the user can already do in the portal under their existing role. The bot is a new surface on the existing RBAC model (section 4 of `docs/system_rundown.md`), never an expansion of it.

**The bridge stays dumb.** Transport, identity resolution, allowlist enforcement, message formatting, retries. No business logic, no data access. See section 10.

---

## 4. Routing Model

The single most important change. Today every chat maps to a persistent Jinn assistant session. That is correct for a single trusted owner and wrong for everyone else — extending it to operatives and third parties means untrusted parties conversing with an agent that has tooling behind it.

The bridge must fork **before** the session:

```
update → resolve sender against telegram_links
  ├─ owner         → Jinn session (today's behaviour, unchanged)
  ├─ linked staff  → structured handler; role read fresh from profiles on every message
  ├─ guest token   → fixed upload script; no session, no model
  └─ unknown       → record and ignore, EXCEPT /start <token>
```

**Roles are never granted by Telegram.** A link resolves to a `staff` or `profiles` row; the role is read from that row on every message. Change a role in the portal and bot behaviour changes on the next message. No parallel Telegram permission model to drift.

---

## 5. Audiences and Capabilities

Four audiences, matching the existing role matrix. Each gets a deliberately different surface.

### 5.1 Operatives

**Bot pushes to them**

| Trigger                    | Message                                                                |
| :------------------------- | :--------------------------------------------------------------------- |
| Evening before a shift     | Tomorrow's shift: site name, postcode, start time                      |
| Shift changed or cancelled | Updated details, or cancellation notice                                |
| Certificate expiring       | At 30, 14, and 7 days remaining                                        |
| Certificate expired        | Lockout warning — cannot be assigned                                   |
| Document request raised    | Replaces / supplements the current email-only `document_requests` flow |

**Operative-initiated**

- Confirm or decline an upcoming shift. Decline raises a dispatcher alert.
- Upload a certificate photo directly in chat. Lands in the `compliance-documents` bucket under the existing request-scoped path.
- `/myweek` — next seven days of shifts.
- `/mycerts` — certificates held, with expiry dates.
- Send site photos, attached to the relevant `job_diary` entry.
- Add a note to a job they are assigned to. Free text, appended to that job's `job_diary` record for the date, attributed to them. Scoped strictly to jobs they hold a `shifts` row for — an operative cannot note against a job they are not on.

**Explicitly excluded**: editing their own profile, viewing any other operative's data, anything financial. Matches their portal restriction to `/portal/roster?view=calendar`.

**Note visibility is one-directional.** Operatives write notes and see their own. Dispatchers and admins read every note on every job, always, with no operative control over that — a note is a site record, not private correspondence. Operatives cannot edit or delete a note once sent; corrections are a new note. This keeps the diary append-only and audit-safe.

### 5.2 Dispatchers and Admins

**Bot pushes to them**

| Trigger                                      | Message                                                 |
| :------------------------------------------- | :------------------------------------------------------ |
| Daily digest                                 | Expiry Radar summary — count plus the most urgent cases |
| Operative declines a shift                   | Immediate alert                                         |
| Operative has not responded by a cutoff time | Chase alert                                             |
| Certificate uploaded                         | Awaiting approval                                       |
| Third party uploads job documents            | Files received for job X                                |
| Operative adds a job note                    | Note text plus job reference                            |
| Job reaches `contract_max_pours`             | Contract ceiling hit                                    |

**Dispatcher-initiated**

- `/who <postcode>` — nearest available operatives. Reuses the existing Haversine proximity logic.
- `/job <ref>` — status, pours current versus max, today's assigned crew, and the latest diary notes with their authors.
- Add a note to any job, assigned or not. Same append-only `job_diary` record operatives write to.
- `/staff <name>` — compliance status and next shift.
- `/today` — sites active today with crew counts.
- Approve or reject an uploaded certificate — single tap from the notification.
- Request documents from an operative — single tap, sends them the upload link.
- Broadcast a message to a job's assigned crew (for example, site closed due to weather).

**Explicitly excluded**: quote and invoice builder, roster editing, audit log, policies. All deep-link to the portal.

### 5.3 Third Parties

See section 8. Default scope is upload-only, session-scoped, no persistent binding.

### 5.4 Primary Security Admin (`admin@opusform.co.uk`)

**No bot access.** The audit log stays portal-only, single-account, RLS-locked. Adding a chat surface to the system's tightest control weakens it for no operational gain.

---

## 6. Natural Language Layer

Commands alone are insufficient. Operatives will not learn slash-command syntax, and dispatchers working one-handed on site will not recall it. Free text is in scope for linked staff, under strict constraints.

This layer is **not** the Jinn session. The Jinn session remains owner-only. What follows is a separate, far narrower path.

### 6.1 Architecture

The model performs **tool selection only**. It never queries the database, never composes SQL, and never generates factual content.

```
user message → intent classification → resolve to a fixed tool
             → tool executes under the user's own permissions
             → tool returns structured data
             → model phrases the wrapper; data rendered verbatim
```

`"who's free near SW1 tomorrow"` resolves to `findNearby(postcode, date)` — the same function `/who` calls, returning the same formatted card.

Commands and natural language are two front doors to one set of capabilities. Neither replaces the other.

### 6.2 Constraints

These are not tuning parameters. They are the reason the natural language layer is safe to ship.

1. **Facts come from query results verbatim.** Compliance data answered by hallucination puts an uncertified person on a site. The model selects the tool and phrases the surrounding sentence; every number, name, and date is rendered from the tool's return value.
2. **Permission checks run on the resolved tool, not on the intent.** An operative asking about another operative gets an empty result because RLS returns nothing — the model cannot route around access control, because the model is not the thing querying.
3. **Writes never auto-fire.** Natural language can only propose. `"cancel Dave's Thursday shift"` renders a confirmation button. The tap is the action, and the tap is what writes to `audit_logs`.
4. **Third parties get no natural language at all**, at any tier. Untrusted input plus a model that selects tools is a prompt-injection target. Their flow is a fixed script.
5. **Low confidence disambiguates rather than guessing.** Two matching names prompts a choice. Unrecognised intent returns the capability list.
6. **Every natural-language-triggered action logs the original message text** alongside the resulting action in `audit_logs`. The auditor needs to see what was asked, not only what happened.

### 6.3 Boundaries

Natural language handles fuzzy lookups well: partial names, "the Croydon job", "next week". It handles anything with four or more parameters badly — those deep-link to the portal. Bulk operations ("cancel all shifts this week") are excluded entirely; the failure mode is too expensive relative to the convenience.

---

## 7. Identity Linking and Onboarding

The bot is publicly findable. The whole design is deny-by-default — the existing allowlist posture is correct and is kept.

### 7.1 Invite flow

1. Dispatcher opens a staff dossier and presses **Invite to Telegram**.
2. Portal mints a single-use token, seven-day TTL, bound to that staff id.
3. Portal renders `t.me/OpusFormBot?start=<token>` as a link **and a QR code**.
4. Operative taps the link or scans the QR. Telegram opens; `/start` carries the token.
5. Bot binds their `telegram_user_id` to the row, burns the token, replies "Linked as Dave Smith".
6. Dispatcher receives a notification naming the linked Telegram handle. Cheap eyeball check that catches a forwarded invite.

Anyone hitting `/start` without a valid token gets "Invite only — contact your dispatcher." No enumeration, no hints.

**Required allowlist change**: unknown senders are currently ignored outright, which would silently drop a valid invite and make onboarding impossible. Unknown senders must be admitted for token validation only, then bound or rejected.

`/approve <telegram-id>` is retained as the owner's escape hatch. It is not the onboarding path — it does not scale to a crew and grants no role.

### 7.2 Bulk onboarding

Roster page multi-select → **Invite selected** → one printable page of named QR codes. Site induction, phones out, a crew linked in minutes. The same generator emails links to anyone not physically present.

### 7.3 Control surface

On the roster and dossier:

- **Telegram status** pill: Not invited / Invited (expires 20 Aug) / Linked @handle since 3 Aug.
- **Revoke** — one tap; the binding dies immediately and the next message gets the deny script.
- **Auto-revoke** on staff archive, role removal, or profile deletion. Nobody has to remember.

Every invite, link, and revoke writes to `audit_logs`.

### 7.4 Guard rails

- One Telegram account binds to exactly one OpusForm identity. An already-linked account presenting a second token is refused and the owner alerted.
- Only dispatchers and admins issue invites. Invite generation is rate-limited.
- Re-linking requires a fresh token.

### 7.5 Storage

Two small tables mirroring the existing `document_requests` pattern:

- `telegram_invites` — token, target id, created_by, expires_at, used_at.
- `telegram_links` — telegram_user_id, target id, class, linked_at, revoked_at.

`telegram_links` lists every binding regardless of class and is the single source for the control panel.

---

## 8. Third-Party Access

Third parties are untrusted and hold no OpusForm account. Three tiers exist; **Tier 0 is the committed scope**.

### Tier 0 — upload only (committed)

- Receive a document request and upload files in chat, as an alternative to the existing tokenised web page (`/job-upload/:token`).
- Receive an upload confirmation receipt.

The existing `job_document_requests` token doubles as the `/start` payload. Session-scoped, dies with the token, never becomes a persistent binding. No new tables, no lookups, no job data beyond the reference they were already given.

### Tier 1 — job-scoped guest (not committed)

Only if a specific contractor need is identified. Binding is `(telegram_user_id, job_id, expires_at)` in a separate `contacts` table — never in `staff`, never a `profiles` row, never a role.

Non-negotiable conditions if built:

- **No lookup by reference.** Guests reach their bound job only. `/job <ref>` must not exist for them, or reference-guessing enumerates the ledger.
- **Explicit column whitelist, default deny.** Site name, status, next pour date, outstanding documents. Adding a column to `jobs` must not silently expose it.
- **No staff PII.** Crew count, never crew names, postcodes, phone numbers, or certificates.
- **Separate RLS path**, keyed on the guest binding table, sharing no helper with `can_write_ops`. A bug in staff policy cannot then leak sideways, or the reverse.
- **Guests cannot see guests.** Two contractors on one job never learn of each other.
- **Access dies with the job.** Job status set to Complete auto-revokes. Access cannot outlive the work.
- Guest actions are tagged as guest class in `audit_logs`, filterable in one query.

### Tier 2 — multi-job client contact

Same as Tier 1, bound to a set of jobs. Deferred until a repeat contractor asks.

### Why third parties are not `staff` rows

`staff` is the labour roster. Crew-size metrics, Expiry Radar, proximity matching, and shift assignment all read it and all assume "person we can send to a site". A contractor row corrupts each of them, and the operative RLS policy would need a discriminator threaded through every dependent policy — each omission a leak. Merging tables centralises blast radius, not control.

Unification belongs in the **UI**: the roster page gains an **Operatives | External contacts** tab reading a different source, with the same list layout, search, and drawer. Two tabs, not one blended list — the roster list is what dispatchers scan when picking crew, and an external contact appearing mid-scroll is a mis-assignment waiting to happen. The tab arrives with Tier 1 or not at all.

---

## 9. Required Bridge Changes

Ordered by whether they block the stage that needs them.

1. **Admit `/start <token>` from unknown senders** for token validation only. Blocks all onboarding.
2. **Fork routing before the session** (section 4). Blocks every non-owner audience.
3. **Fast path for structured handlers.** The three-minute reply wait suits an agent conversation; `/myweek` is a database read and must answer in well under a second without touching a model.
4. **File handling.** Telegram file download into the Supabase buckets. Blocks certificate and document upload — the highest-value capability in this spec.
5. **Inline keyboards and callback handling.** Blocks confirm/decline, approve/reject, and every one-tap action.
6. **Outbound send path.** Everything today is reactive. Shift reminders, expiry warnings, and dispatcher alerts are scheduled bot-initiated sends with no inbound message to reply to.

---

## 10. Where Logic Lives

**Bridge**: transport, identity resolution, allowlist, formatting, retries, Telegram file transfer.

**Supabase edge functions**: all OpusForm logic and data access.

Rationale: RLS is enforced where the data is rather than reimplemented in the bridge; edge functions are already in this project's stack; the logic stays version-controlled in this repository rather than on a server; and scheduled notifications can fire from an edge function without the bridge participating in the outbound path.

---

## 11. Operational Requirements

The bridge is a single systemd process and is the entire channel. That is acceptable while the owner is the only user and notices an outage. It is not acceptable once operatives depend on it for tomorrow's shift — a silent overnight failure means a crew does not turn up.

Before onboarding real users:

- Heartbeat and alerting on bridge liveness and poll-loop health.
- Outbound notifications that do not depend on the poller being alive.
- A defined behaviour for messages that arrive while the bridge is down (the existing durable pending-message state may already cover this — confirm against source).

---

## 12. Out of Scope

Cut deliberately, not by oversight:

- Quote and invoice generation, and PDF delivery — needs real forms and document review.
- Timesheet entry — multi-field, high error cost.
- Payroll or any financial data — wrong channel for it.
- Audit log access — see 5.4.
- Roster editing and staff record editing — portal tasks.
- Bulk operations of any kind.
- Natural language for any third party, at any tier.

---

## 13. Build Order

Each stage is independently useful and shippable.

0. **Verify against bridge source.** Read `composio-telegram-bridge.mjs`, the service definition, access policy, and runtime state. Confirm or correct sections 4, 9, and 10.
1. **Linking plus operative read-only.** `telegram_invites` / `telegram_links`, `/start <token>` admission, routing fork, `/myweek`, `/mycerts`. Proves identity resolution end to end with no write path.
2. **Operative notifications and confirmations.** Outbound path, inline keyboards, shift reminders, expiry warnings, confirm/decline.
3. **Uploads and job notes.** Telegram file handling; certificate photos from operatives; document uploads from third parties (Tier 0); free-text job notes from operatives and dispatchers.
4. **Dispatcher lookups and alerts.** Commands, digests, approve/reject taps, crew broadcast.
5. **Natural language layer.** Added last, as a fallback branch for messages matching no command.

Stages 1–4 involve zero model calls for non-owner users and work entirely without the natural language layer. Stage 5 is a branch on unmatched input: if disabled or failing, the bot replies with the command list. Nothing breaks, cost stays bounded, and the logged messages from stages 1–4 reveal what people actually ask before we pay to interpret it.

---

## 14. Success Criteria

- An operative can see their week and confirm a shift without opening the portal.
- Certificate expiry chasing stops depending on someone remembering to check the Expiry Radar.
- Third-party document collection completes without the recipient needing to open a browser.
- An operative can log a site note from the job without waiting to reach a desk, and a dispatcher sees it immediately.
- No capability exists in the bot that the same user could not perform in the portal.
- Every bot-initiated write appears in `audit_logs`, attributed to the linked OpusForm identity.
- No non-owner user reaches a Jinn assistant session.

---

## 15. Open Items

- Bridge source not yet read; section 2 describes reported behaviour only.
- `job_diary` currently holds one row per (job_id, date) with a single `notes` text field and no author column. Multiple attributed notes per day require either a `job_notes` child table or JSONB entries. Decision belongs to the implementation plan.
- Tier 1 third-party access is unstarted and stays that way absent a specific contractor requirement.
