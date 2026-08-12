# Telegram Bot — Capability Scope Design

**Date**: 2026-08-13
**Status**: Design in review, pending implementation plan
**Scope**: What OpusForm users can do via Telegram, how work splits between the VPS bridge and this repository, and what the existing bridge must change to support it.

---

## 1. Purpose

Give OpusForm a chat surface for the work that does not belong at a desk: shift notifications, compliance chasing, document collection, job notes, and quick operational lookups. The portal remains the system of record and the only place complex work happens.

**Platform: Telegram.** Free, native inline keyboards and file uploads, and bot creation is immediate.

---

## 2. Existing Infrastructure

A working bridge already exists. It is not in this repository — it runs on an Oracle Cloud server (2 CPU, 12 GB) as a `systemd --user` unit at `/home/ubuntu/.jinn-opus-form/connectors/composio-telegram-bridge.mjs`.

```
Telegram
  → Composio long-polling (TELEGRAM_GET_UPDATES, allowed_updates: ["message"])
  → bridge (composio-telegram-bridge.mjs)
  → default-deny allowlist on message.from.id
  → Jinn session via localhost gateway (127.0.0.1:7778)
  → assistant response
  → Telegram reply (TELEGRAM_SEND_MESSAGE)
```

### 2.1 What works well

Verified by reading the source. This is careful work and the design below keeps all of it:

- Atomic `0600` state writes with a serialised write chain, so concurrent chats cannot clobber each other's sessions or offsets.
- `flock -n` in the unit file prevents a double-run.
- Per-chat FIFO queues with cross-chat concurrency capped at eight.
- Pending updates persisted **before** the Telegram offset is claimed, so a restart mid-reply resumes rather than losing the message.
- Numeric Telegram ID as the trust anchor, never the username. Owner ID cannot be revoked or cleared.
- Composio organisation verified as `opusform` immediately before every action.
- Owner commands gated on private chat **and** owner ID.

### 2.2 Findings that change the plan

| #   | Finding                                                                                                                                                                                                                           | Impact                                                                                                                                                                                                  |
| :-- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `handleAuthorizedUpdate` returns early when `text` is empty, and `extractText` falls back to `caption`. A photo **with** a caption forwards the caption and silently discards the photo; a photo without one is dropped entirely. | Silent data loss. A certificate photo today produces a normal-looking reply having stored nothing.                                                                                                      |
| 2   | `allowed_updates: ["message"]`, and `extractMessage` handles only `message` / `channel_post`.                                                                                                                                     | No `callback_query` path. Blocks every inline keyboard, confirmation, and approve/reject tap.                                                                                                           |
| 3   | The allowlist check in `pollOnce` logs and advances the offset for unknown senders.                                                                                                                                               | `/start <token>` from a new operative is discarded. Onboarding is impossible without a change.                                                                                                          |
| 4   | `runComposio` spawns `composio whoami` before **every** action, then `composio execute`.                                                                                                                                          | Two subprocess spawns per outbound message chunk. A 50-operative broadcast is ~100 spawns, each with a 75-second timeout ceiling. This — not the Telegram API — is the notification throughput blocker. |
| 5   | `runLoop` calls `pollOnce` back-to-back with no floor sleep; only Composio honouring `timeout: 30` prevents a hot loop.                                                                                                           | If Composio ever returns immediately, continuous subprocess spawning. One-line fix.                                                                                                                     |
| 6   | `observedUsers` records every unknown sender permanently, and each one triggers a full state write.                                                                                                                               | Unbounded growth and disk churn on a publicly findable bot. Needs a cap or TTL before wider rollout.                                                                                                    |
| 7   | `persistState` deep-clones and rewrites the whole file per observed user and per offset advance.                                                                                                                                  | O(state) per message. Fine at one user, a ceiling as sessions and observed users accumulate.                                                                                                            |
| 8   | Unit is `systemd --user` with `WantedBy=default.target`, and **linger is confirmed off** (`Linger=no`, checked 2026-08-13).                                                                                                       | The user systemd manager shuts down when the last login session closes, so the bridge dies on logout as well as on reboot. It is currently up only because a session is holding it. Fix before stage 1. |
| 9   | `buildJinnPrompt` fences user text in `---` and instructs the model to treat it as data.                                                                                                                                          | Delimiter-only injection defence. Adequate for a single owner, not for operatives, and not remotely for third parties. This is why section 5 exists.                                                    |

---

## 3. Design Principles

**Chat is good for**: notify, confirm, upload, look up one thing.
**Chat is bad for**: multi-field forms, tabular data, PDF review, anything requiring audit-grade scrutiny.

Any interaction needing more than roughly three taps is a portal task. The bot sends a deep link instead of attempting the interaction inline.

**The bot adds no new permissions.** Every capability maps to something the user can already do in the portal under their existing role. The bot is a new surface on the existing RBAC model (section 4 of `docs/system_rundown.md`), never an expansion of it.

**The bridge stays dumb.** Transport, allowlist, relaying. It holds no credentials worth stealing, formats no domain message, and does not know what a pour is.

---

## 4. System Split

Three components. The boundary is the point of this section.

### 4.1 Responsibilities

| Path                                   | Owner                       | Bot token needed |
| :------------------------------------- | :-------------------------- | :--------------- |
| Inbound polling                        | VPS bridge, via Composio    | No               |
| Command and callback handling          | Supabase edge function      | No               |
| Outbound replies to an inbound message | VPS bridge, via Composio    | No               |
| Scheduled outbound notifications       | Supabase scheduled function | Yes              |
| File download and storage              | Supabase edge function      | Yes              |
| Portal UI, invites, control surface    | This repository             | No               |

### 4.2 The contract

The bridge sends one authenticated POST per update and relays whatever comes back, verbatim.

```
POST /functions/v1/telegram-handler
  header: shared secret
  { telegram_user_id, chat_id, message_id, kind: "text" | "callback" | "file", payload }

→ { text, keyboard?, ack }
```

The edge function returns **rendered text plus an optional keyboard spec**. Rendering lives in this repository so message copy is version-controlled and reviewable, not edited on a box over SSH.

**Identity resolution happens in the edge function, not on the VPS.** The bridge passes the raw `telegram_user_id`; the function resolves it against `telegram_links` and reads the role fresh from `profiles` on every message. The VPS never learns what a role is.

### 4.3 Bot token architecture

The BotFather token is held in **Supabase secrets only**. It is never committed, never placed in this repository, and deliberately **not** installed on the VPS.

Consequences:

- **Notifications are independent of bridge liveness.** A scheduled edge function calls `api.telegram.org` directly. A dead systemd unit overnight no longer means a crew misses tomorrow's shift — the single worst failure mode in the design.
- **File download works.** `getFile` followed by a fetch from `api.telegram.org/file/bot<token>/<path>` requires the raw token, which Composio does not expose.
- **The VPS holds no credential that owns the bot.** The bridge reports a `file_id`; the edge function does the download. One extra hop, and the least-defended surface in the system stops being a credential store.

Inbound polling stays on Composio unchanged.

> Any bot token that has ever been pasted into a chat, ticket, or log is compromised and must be revoked in BotFather before use.

---

## 5. Routing Model

Today every chat maps to a persistent Jinn assistant session. Correct for a single trusted owner; wrong for everyone else. Extending it means untrusted parties conversing with an agent that has tooling behind it, defended only by a `---` delimiter (finding 9).

The bridge must fork **before** the session:

```
update → resolve sender against telegram_links
  ├─ owner         → Jinn session (today's behaviour, unchanged)
  ├─ linked staff  → edge function; role read fresh on every message
  ├─ guest token   → fixed upload script; no session, no model
  └─ unknown       → record and ignore, EXCEPT /start <token>
```

**Roles are never granted by Telegram.** A link resolves to a `staff` or `profiles` row; the role is read from that row on every message. Change a role in the portal and bot behaviour changes on the next message. No parallel Telegram permission model to drift.

---

## 6. Audiences and Capabilities

### 6.1 Operatives

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
- Upload a certificate photo or PDF in chat. See section 7.
- `/myweek` — next seven days of shifts.
- `/mycerts` — certificates held, with expiry dates.
- Send site photos, attached to the relevant job.
- Add a note to a job they are assigned to. Free text, attributed, scoped strictly to jobs they hold a `shifts` row for — an operative cannot note against a job they are not on.

**Explicitly excluded**: editing their own profile, viewing any other operative's data, anything financial. Matches their portal restriction to `/portal/roster?view=calendar`.

**Note visibility is one-directional.** Operatives write notes and see their own. Dispatchers and admins read every note on every job, always, with no operative control over that — a note is a site record, not private correspondence. Notes cannot be edited or deleted; corrections are a new note. The diary stays append-only and audit-safe.

### 6.2 Dispatchers and Admins

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
- `/job <ref>` — status, pours current versus max, today's crew, latest notes with authors.
- Add a note to any job, assigned or not.
- `/staff <name>` — compliance status and next shift.
- `/today` — sites active today with crew counts.
- Approve or reject an uploaded certificate — single tap.
- Request documents from an operative — single tap, sends them the upload link.
- Broadcast to a job's assigned crew.

**Explicitly excluded**: quote and invoice builder, roster editing, audit log, policies. All deep-link to the portal.

### 6.3 Third Parties

See section 10. Default scope is upload-only, session-scoped, no persistent binding.

### 6.4 Primary Security Admin (`admin@opusform.co.uk`)

**No bot access.** The audit log stays portal-only, single-account, RLS-locked. A chat surface on the system's tightest control weakens it for no operational gain.

---

## 7. File and Document Handling

The highest-value capability in this spec, and currently the most broken (finding 1).

### 7.1 Flow

1. Bridge detects an attachment via a new `extractAttachments(message)` — `photo` (array of sizes; take the last, it is the largest) and `document` (PDFs, which is what most certificates actually are).
2. Bridge rejects anything over the size cap **without downloading**, using `file_size` from the message.
3. Bridge posts `kind: "file"` with the `file_id` and declared metadata to the edge function.
4. Edge function resolves what the file is _for_, calls `getFile`, downloads, validates, writes to the appropriate bucket, and registers the row.

Albums arrive as separate updates sharing a `media_group_id`. No grouping logic — each file is handled independently against the open request. Correct enough, far less code.

### 7.2 Resolving context

A photo with no context is ambiguous. Rules:

- Exactly one open request for that sender → attach it; the caption becomes the note.
- More than one → reply with an inline keyboard to choose. **File upload therefore depends on `callback_query` support** (finding 2); build the two together.
- None open → decline politely, store nothing.

### 7.3 Hard rules

- **Size cap enforced before download.** Around 20 MB, which is the Bot API download ceiling anyway.
- **Never use the client-supplied filename as a storage path.** Generate `requests/<token>/<uuid>.<ext>`. Client filenames are a path-traversal and overwrite risk. Keep the original name as metadata only.
- **Allowlist types**: images and PDF. Validate the declared MIME _and_ the extension, then sniff magic bytes after download. `mime_type` comes from the client and is not evidence.
- **Force `content-type` on write.** Never pass through the declared value.
- **Rate-limit per token**: N files per hour. A valid token otherwise permits dumping gigabytes into the bucket.
- **No virus scanning.** Buckets are private and only administrators retrieve from them. This is a real residual risk, stated rather than pretended away.

Third-party files land in the existing token-scoped path, so current bucket RLS covers them unchanged.

---

## 8. Natural Language Layer

Commands alone are insufficient. Operatives will not learn slash-command syntax, and dispatchers working one-handed on site will not recall it. Free text is in scope for linked staff, under strict constraints.

This layer is **not** the Jinn session. The Jinn session remains owner-only.

### 8.1 Architecture

The model performs **tool selection only**. It never queries the database, never composes SQL, and never generates factual content.

```
user message → intent classification → resolve to a fixed tool
             → tool executes under the user's own permissions
             → tool returns structured data
             → model phrases the wrapper; data rendered verbatim
```

`"who's free near SW1 tomorrow"` resolves to `findNearby(postcode, date)` — the same function `/who` calls, returning the same formatted card.

### 8.2 Constraints

These are not tuning parameters. They are the reason this layer is safe to ship.

1. **Facts come from query results verbatim.** Compliance data answered by hallucination puts an uncertified person on a site. The model selects the tool and phrases the surrounding sentence; every number, name, and date is rendered from the tool's return value.
2. **Permission checks run on the resolved tool, not on the intent.** An operative asking about another operative gets an empty result because RLS returns nothing — the model cannot route around access control, because the model is not the thing querying.
3. **Writes never auto-fire.** Natural language can only propose. `"cancel Dave's Thursday shift"` renders a confirmation button. The tap is the action, and the tap is what writes to `audit_logs`.
4. **Third parties get no natural language at all**, at any tier. Untrusted input plus a model that selects tools is a prompt-injection target.
5. **Low confidence disambiguates rather than guessing.** Two matching names prompts a choice. Unrecognised intent returns the capability list.
6. **Every natural-language-triggered action logs the original message text** alongside the resulting action in `audit_logs`.

### 8.3 Boundaries

Fuzzy lookups work well: partial names, "the Croydon job", "next week". Anything with four or more parameters does not — those deep-link to the portal. Bulk operations are excluded entirely; the failure mode outweighs the convenience.

---

## 9. Identity Linking and Onboarding

The bot is publicly findable. Deny-by-default is correct and is kept.

### 9.1 Invite flow

1. Dispatcher opens a staff dossier and presses **Invite to Telegram**.
2. Portal mints a single-use token, seven-day TTL, bound to that staff id.
3. Portal renders `t.me/OpusFormBot?start=<token>` as a link **and a QR code**.
4. Operative taps or scans. `/start` carries the token.
5. Bot binds their `telegram_user_id`, burns the token, replies "Linked as Dave Smith".
6. Dispatcher receives a notification naming the linked Telegram handle. Cheap eyeball check that catches a forwarded invite.

Anyone hitting `/start` without a valid token gets "Invite only — contact your dispatcher." No enumeration, no hints.

**Required allowlist change** (finding 3): unknown senders must be admitted for token validation only, then bound or rejected.

`/approve <telegram-id>` is retained as the owner's escape hatch. It is not the onboarding path — it does not scale to a crew and grants no role.

### 9.2 Bulk onboarding

Roster multi-select → **Invite selected** → one printable page of named QR codes. Site induction, phones out, a crew linked in minutes. The same generator emails links to anyone not present.

### 9.3 Control surface

On the roster and dossier:

- **Telegram status** pill: Not invited / Invited (expires 20 Aug) / Linked @handle since 3 Aug.
- **Revoke** — one tap; binding dies immediately, next message gets the deny script.
- **Auto-revoke** on staff archive, role removal, or profile deletion, enforced by database trigger so nobody has to remember.

Every invite, link, and revoke writes to `audit_logs`.

### 9.4 Guard rails

- One Telegram account binds to exactly one OpusForm identity. An already-linked account presenting a second token is refused and the owner alerted.
- Only dispatchers and admins issue invites. Generation is rate-limited.
- Re-linking requires a fresh token.

---

## 10. Third-Party Access

Third parties are untrusted and hold no OpusForm account. **Tier 0 is the committed scope.**

### Tier 0 — upload only (committed)

Receive a document request, upload files in chat, receive a receipt. The existing `job_document_requests` token doubles as the `/start` payload. Session-scoped, dies with the token, never a persistent binding. No new tables, no lookups.

### Tier 1 — job-scoped guest (not committed)

Only if a specific contractor need is identified. Binding is `(telegram_user_id, job_id, expires_at)` in a separate `contacts` table — never `staff`, never `profiles`, never a role.

Non-negotiable if built:

- **No lookup by reference.** Guests reach their bound job only, or reference-guessing enumerates the ledger.
- **Explicit column whitelist, default deny.** Adding a column to `jobs` must not silently expose it.
- **No staff PII.** Crew count, never names, postcodes, phone numbers, or certificates.
- **Separate RLS path** keyed on the guest binding, sharing no helper with `can_write_ops`.
- **Guests cannot see guests.**
- **Access dies with the job.** Status set to Complete auto-revokes.
- Guest actions tagged as guest class in `audit_logs`, filterable in one query.

### Tier 2 — multi-job client contact

Deferred until a repeat contractor asks.

### Why third parties are not `staff` rows

`staff` is the labour roster. Crew-size metrics, Expiry Radar, proximity matching, and shift assignment all read it and all assume "person we can send to a site". A contractor row corrupts each, and the operative RLS policy would need a discriminator threaded through every dependent policy — each omission a leak. Merging tables centralises blast radius, not control.

Unification belongs in the **UI**: the roster page gains an **Operatives | External contacts** tab reading a different source, same list layout and drawer. Two tabs, not one blended list — the roster list is what dispatchers scan when picking crew, and an external contact appearing mid-scroll is a mis-assignment waiting to happen. Arrives with Tier 1 or not at all.

---

## 11. Required Bridge Changes

Ordered by the stage each blocks.

1. **Admit `/start <token>` from unknown senders**, for token validation only. Blocks all onboarding.
2. **Fork routing before the session** (section 5). Blocks every non-owner audience.
3. **Call the edge function instead of Jinn** for non-owner traffic, and relay its rendered response.
4. **Fast path for structured handlers.** The 180-second reply wait suits an agent conversation; `/myweek` is a database read and must answer well under a second.
5. **Add `callback_query` to `allowed_updates` and to `extractMessage`.** Blocks every inline keyboard.
6. **`extractAttachments`** for photos and documents, with the size cap. Blocks uploads and stops the silent discard in finding 1.
7. **Cache the `composio whoami` org check** with a short TTL, or verify once per poll cycle. Removes the two-spawn-per-chunk cost.
8. **Floor sleep between empty polls.**
9. **Cap or TTL `observedUsers`.**

Outbound notifications do **not** appear here — they leave the bridge entirely (section 4.3).

---

## 12. Repository-Side Data Model

What this repository must add.

### 12.1 Migrations

- **`telegram_invites`** — token, target_id, target_type, created_by, expires_at, used_at.
- **`telegram_links`** — telegram_user_id (primary key), target_id, class (`staff` / `guest`), linked_at, revoked_at, last_seen_at. Single source for the control panel across all classes.
- **`job_notes`** — job_id, author_type, author_id, body, created_at. A new child table: `job_diary` holds one row per (job_id, date) with a single `notes` text field and no author column, so it cannot carry attributed multi-author notes.
- **RLS** on all three. Invites readable and writable by dispatchers and admins only; links readable by the service role and the owning identity; notes readable by dispatchers and admins unconditionally, and by the authoring operative for their own.
- **Triggers**: staff archived or role removed → revoke link. Job status Complete → revoke guest bindings.

### 12.2 Edge functions

- **`telegram-handler`** — single action-routed entry point. Shared-secret header checked against Supabase secrets. Actions: `link`, `myweek`, `mycerts`, `job`, `who`, `staff`, `today`, `note`, `file`, `callback`.
- **`telegram-notify`** — scheduled. Computes due reminders and calls `api.telegram.org` directly. Independent of bridge liveness.

### 12.3 Portal UI

- Telegram status pill, **Invite**, and **Revoke** on the existing dossier drawer. One component, no new route.
- Notes feed on job details, showing author and source.
- Roster multi-select → QR invite sheet (stage 2).
- External contacts tab (Tier 1 only).

### 12.4 Audit

New action types on the existing `audit_logs`. No schema change.

---

## 13. Operational Requirements

The bridge is a single `systemd --user` process and is the entire inbound channel.

Before onboarding real users:

- **Enable linger.** Confirmed off as of 2026-08-13, so the bridge currently dies when the last SSH session closes. `loginctl enable-linger ubuntu`, then confirm `Linger=yes` and that the unit reports `enabled`, then reboot and verify it returns unaided. This is an explicit deployment step, not a note — it is silently absent on any fresh rebuild.
- Heartbeat and alerting on bridge liveness and poll-loop health.
- Confirm the existing durable pending-update state covers messages arriving during downtime — the source suggests it does for in-flight work, not for the polling gap.

Outbound notifications are deliberately not dependent on any of the above.

---

## 14. Out of Scope

Cut deliberately, not by oversight:

- Quote and invoice generation, and PDF delivery.
- Timesheet entry.
- Payroll or any financial data.
- Audit log access — see 6.4.
- Roster editing and staff record editing.
- Bulk operations of any kind.
- Natural language for any third party, at any tier.
- Virus scanning of uploads — see 7.3.

---

## 15. Build Order

1. **Linking plus operative read-only.** `telegram_invites` / `telegram_links` with RLS, `telegram-handler` with `link` and `myweek`, `/start <token>` admission, routing fork, Invite and Revoke on the dossier drawer. Proves identity resolution end to end with no write path.
2. **Notifications and confirmations.** Bot token into Supabase secrets, `telegram-notify` scheduled function, `callback_query` support, shift reminders, expiry warnings, confirm/decline.
3. **Uploads and job notes.** `extractAttachments`, `getFile` download in the edge function, validation and storage, `job_notes` table and feed.
4. **Dispatcher lookups and alerts.** Remaining commands, digests, approve/reject taps, crew broadcast.
5. **Natural language layer.** Last, as a fallback branch for messages matching no command.

Bridge hardening items 7–9 in section 11 land alongside stage 2, when message volume first justifies them.

Stages 1–4 involve zero model calls for non-owner users. Stage 5 is a branch on unmatched input: if disabled or failing, the bot replies with the command list. Nothing breaks, cost stays bounded, and the logged messages from stages 1–4 reveal what people actually ask before we pay to interpret it.

---

## 16. Success Criteria

- An operative can see their week and confirm a shift without opening the portal.
- Certificate expiry chasing stops depending on someone remembering to check the Expiry Radar.
- Third-party document collection completes without the recipient opening a browser.
- An operative can log a site note from the job, and a dispatcher sees it immediately.
- A photo sent to the bot is either stored or explicitly refused — never silently discarded.
- Shift reminders arrive even when the bridge is down.
- No capability exists in the bot that the same user could not perform in the portal.
- Every bot-initiated write appears in `audit_logs`, attributed to the linked OpusForm identity.
- No non-owner user reaches a Jinn assistant session.

---

## 17. Open Items

- Bot token must be revoked and reissued in BotFather before use, then stored in Supabase secrets only — never in this repository, never on the VPS.
- Linger confirmed off on the VPS; must be enabled before stage 1 (see 13).
- Tier 1 third-party access stays unstarted absent a specific contractor requirement.
- Whether the bridge's durable pending-update state covers the polling gap during downtime, or only in-flight work.
