# Telegram Bot — Capability Scope Design

**Date**: 2026-08-13
**Status**: Design approved, pending implementation plan
**Scope**: What OpusForm users can do via Telegram. Platform mechanics kept deliberately shallow — this document defines the capability surface, not the wire protocol.

---

## 1. Purpose

Give OpusForm a chat surface for the work that does not belong at a desk: shift notifications, compliance chasing, document collection, and quick operational lookups. The portal remains the system of record and the only place complex work happens.

**Platform: Telegram.** Free, native inline keyboards and file uploads, and bot creation is immediate.

---

## 2. Design Principles

**Chat is good for**: notify, confirm, upload, look up one thing.
**Chat is bad for**: multi-field forms, tabular data, PDF review, anything requiring audit-grade scrutiny.

Any interaction needing more than roughly three taps is a portal task. The bot sends a deep link instead of attempting the interaction inline.

**The bot adds no new permissions.** Every capability below maps to something the user can already do in the portal under their existing role. The bot is a new surface on the existing RBAC model (section 4 of `docs/system_rundown.md`), never an expansion of it.

---

## 3. Audiences and Capabilities

Four audiences, matching the existing role matrix. Each gets a deliberately different surface.

### 3.1 Operatives

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

### 3.2 Dispatchers and Admins

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

### 3.3 Third Parties

Deliberately minimal. Third parties are untrusted and hold no OpusForm account.

- Receive a document request and upload files in chat, as an alternative to the existing tokenised web page (`/job-upload/:token`).
- Receive an upload confirmation receipt.

Nothing else. No lookups, no job data beyond the job reference they were already given, no natural language.

### 3.4 Primary Security Admin (`admin@opusform.co.uk`)

**No bot access.** The audit log stays portal-only, single-account, RLS-locked. Adding a chat surface to the system's tightest control weakens it for no operational gain.

---

## 4. Natural Language Layer

Commands alone are insufficient. Operatives will not learn slash-command syntax, and dispatchers working one-handed on site will not recall it. Free text is in scope, under strict constraints.

### 4.1 Architecture

The model performs **tool selection only**. It never queries the database, never composes SQL, and never generates factual content.

```
user message → intent classification → resolve to a fixed tool
             → tool executes under the user's own permissions
             → tool returns structured data
             → model phrases the wrapper; data rendered verbatim
```

`"who's free near SW1 tomorrow"` resolves to `findNearby(postcode, date)` — the same function `/who` calls, returning the same formatted card.

Commands and natural language are two front doors to one set of capabilities. Neither replaces the other.

### 4.2 Constraints

These are not tuning parameters. They are the reason the natural language layer is safe to ship.

1. **Facts come from query results verbatim.** Compliance data answered by hallucination puts an uncertified person on a site. The model selects the tool and phrases the surrounding sentence; every number, name, and date is rendered from the tool's return value.
2. **Permission checks run on the resolved tool, not on the intent.** An operative asking about another operative gets an empty result because RLS returns nothing — the model cannot route around access control, because the model is not the thing querying.
3. **Writes never auto-fire.** Natural language can only propose. `"cancel Dave's Thursday shift"` renders a confirmation button. The tap is the action, and the tap is what writes to `audit_logs`.
4. **Third parties get no natural language at all.** Untrusted input plus a model that selects tools is a prompt-injection target. Their flow is a fixed script: receive request, upload, receive receipt.
5. **Low confidence disambiguates rather than guessing.** Two matching names prompts a choice. Unrecognised intent returns the capability list.
6. **Every natural-language-triggered action logs the original message text** alongside the resulting action in `audit_logs`. The auditor needs to see what was asked, not only what happened.

### 4.3 Boundaries

Natural language handles fuzzy lookups well: partial names, "the Croydon job", "next week". It handles anything with four or more parameters badly — those deep-link to the portal. Bulk operations ("cancel all shifts this week") are excluded entirely; the failure mode is too expensive relative to the convenience.

---

## 5. Identity Linking

**Decision: deep-link tokens for all audiences.**

The portal generates a `t.me/<bot>?start=<token>` link. The bot resolves the token to either a staff/profile row (persistent link) or a job upload session (expiring, session-scoped). Staff links persist until revoked; third-party links inherit the existing token expiry.

Rationale: reuses the token pattern already present in `document_requests` and `job_document_requests`, requires no new columns on `staff`, and keeps credentials out of the chat transcript entirely.

A Telegram account is bound to exactly one OpusForm identity. Re-linking requires a fresh token, and both link and unlink events write to `audit_logs`.

---

## 6. Out of Scope

Cut deliberately, not by oversight:

- Quote and invoice generation, and PDF delivery — needs real forms and document review.
- Timesheet entry — multi-field, high error cost.
- Payroll or any financial data — wrong channel for it.
- Audit log access — see 3.4.
- Roster editing and staff record editing — portal tasks.
- Bulk operations of any kind.

---

## 7. Build Order

Each stage is independently useful and shippable.

1. **Linking plus operative read-only.** Deep-link binding, `/myweek`, `/mycerts`. Proves identity resolution end to end with no write path.
2. **Operative notifications and confirmations.** Shift reminders, expiry warnings, confirm/decline buttons.
3. **Uploads and job notes.** Certificate photos from operatives; document uploads from third parties; free-text job notes from operatives and dispatchers. Uploads reuse existing bucket policies and token scoping; notes append to `job_diary`.
4. **Dispatcher lookups and alerts.** Commands, digests, approve/reject taps, crew broadcast.
5. **Natural language layer.** Added last, as a fallback branch for messages that match no command.

Stages 1–4 involve zero model calls and work entirely without the natural language layer. Stage 5 is a branch on unmatched input: if it is disabled or fails, the bot replies with the command list. Nothing breaks, cost stays bounded, and the observed message log from stages 1–4 tells us what people actually ask before we pay to interpret it.

---

## 8. Success Criteria

- An operative can see their week and confirm a shift without opening the portal.
- Certificate expiry chasing stops depending on someone remembering to check the Expiry Radar.
- Third-party document collection completes without the recipient needing to open a browser.
- An operative can log a site note from the job without waiting to reach a desk, and a dispatcher sees it immediately.
- No capability exists in the bot that the same user could not perform in the portal.
- Every bot-initiated write appears in `audit_logs`, attributed to the linked OpusForm identity.
