# Telegram Bridge — Current Instructions

**Date**: 2026-08-13
**Audience**: whoever maintains `composio-telegram-bridge.mjs` on the Oracle Cloud VPS.
**Supersedes**: the earlier handoff document and its amendments. This is the single current source of truth. Where anything here disagrees with an earlier document, this wins.

Stage 1 of the bridge is already implemented and running. This document describes what is verified live, the changes still to make, and how to prove it works.

---

## 1. What is already live and verified

**Supabase side — nothing is pending here.**

- Tables `telegram_invites` and `telegram_links` exist with RLS, plus invite/revoke RPCs and a trigger that revokes a link when a staff member is archived.
- Edge function `telegram-handler` is deployed, ACTIVE, version 4, `verify_jwt: false`, at
  `https://fgpthpxmiroyebrzjdzo.supabase.co/functions/v1/telegram-handler`
- The shared secret is the only gate. Requests with no secret or a wrong secret get `403`.
- The secret is named **`OPUSFORM_HANDLER_SECRET`** on both sides. An earlier document said `OPUSFORM_BRIDGE_SECRET` in one place — that name is dead, do not reintroduce it.

**Verified by live sandbox run against the deployed handler:**

| Case                                | Result                                                                                  |
| :---------------------------------- | :-------------------------------------------------------------------------------------- |
| Unknown user `/start <valid token>` | Links, returns `ack.link_added`                                                         |
| Linked user `/myweek`               | Returns shift list, updates `last_seen_at`                                              |
| Unknown user `/myweek`              | Deny text plus `ack.link_revoked`                                                       |
| Replay of a used `/start` token     | Deny text — tokens are single-use                                                       |
| Portal revoke, then next message    | Deny text plus `ack.link_revoked`                                                       |
| Audit trail                         | `telegram_invite_created`, `telegram_link_created`, `telegram_link_revoked` all written |

**Bridge side already done by you and confirmed:** relay to the handler, `/start` allowlist bypass with rate limits, fast path, `ack` allowlist healing, `callback_query` polling and acknowledgement, photo/document metadata forwarding, 20 MB rejection, observed-user expiry, empty-poll sleep, linger enabled, `EnvironmentFile` loaded by the unit.

---

## 2. The change to make: remove Jinn from Telegram entirely

**Decision: there is no assistant session on Telegram, for anyone, including the owner.** The owner reaches Jinn over SSH on the VPS, which is where it belongs.

Rationale beyond preference: `buildJinnPrompt` defends against prompt injection with a `---` delimiter and an instruction to treat the content as data. That is thin for a channel that will carry operatives and external third parties. Removing the agent from the channel eliminates the risk at its root rather than mitigating it, and it is the reason several restrictions elsewhere in the product design existed at all.

It also fixes a live problem: the owner's `/start` was answered conversationally by Jinn and never reached the handler, so the owner could not use OpusForm commands from their own account.

### 2.1 New routing

Replace the current fork with exactly this:

```
1. Owner access command (/users, /approve, /revoke) from owner private chat
      → handled locally, unchanged (bridge-admin escape hatch)
2. Text starts with "/start"
      → forward to the handler, regardless of allowlist, rate-limited as now
3. Sender is in the local allowlist (the owner included, once linked)
      → forward to the handler
4. Otherwise
      → recordObservedUser, advance offset, no reply
```

No owner branch beyond case 1. The owner is an ordinary linked user, subject to the same handler and the same role gating as everyone else. They link through the normal portal invite flow.

### 2.2 Code to delete

Remove rather than leave unwired — an unreachable path to an agent is exactly what gets accidentally re-wired later:

- `jinnRequest`
- `buildJinnPrompt`
- `getOrCreateSession`
- `sessionTail`
- `waitForAssistant`
- `latestAssistant`
- `gatewayToken()`
- the `sessions` map in runtime state (existing entries can be dropped on the next write)
- `JINN_GATEWAY_URL` and `JINN_REPLY_TIMEOUT_MS` constants, and `JINN_HOME` if nothing else uses it

The 180-second reply timeout goes with the session code. Handler calls should use a short timeout measured in seconds — a database read has no business taking longer.

### 2.3 Owner protection, now reachable in normal operation

The handler returns `ack.link_revoked` for **any** sender it cannot resolve to an active link. With the owner branch gone, that will name `OWNER_USER_ID` whenever the owner is not linked.

The bridge must continue to ignore any allowlist removal targeting the owner. Your existing owner-protection rule should already cover this, but it was previously unreachable and is now a normal-path event. Please confirm explicitly that it holds.

### 2.4 Keep all of this

Unchanged and still required: per-chat FIFO queues, the concurrency cap, pending-update persistence before the offset is claimed, atomic `0600` state writes, `flock` against double-run, 4096-character message splitting, observed-user expiry and cap, empty-poll sleep, the numeric-ID trust anchor, and the Composio `opusform` organisation guardrail.

---

## 3. The contract

One authenticated POST per update. Relay the response verbatim.

**Request**

```
POST ${OPUSFORM_HANDLER_URL}
Headers:
  content-type: application/json
  x-opusform-bridge-secret: ${OPUSFORM_HANDLER_SECRET}

{
  "telegram_user_id": "123456789",
  "chat_id": "123456789",
  "message_id": 4412,
  "kind": "text" | "callback" | "file",
  "payload": {
    "text": "…",                 // kind=text
    "callback_data": "…",        // kind=callback
    "callback_query_id": "…",    // kind=callback
    "file": {                    // kind=file
      "file_id": "…",
      "file_name": "…",
      "mime_type": "…",
      "file_size": 1234567,
      "caption": "…"
    }
  },
  "sender": { "username": "…", "first_name": "…" }
}
```

**Response**

```
{
  "text": "…",                   // send as-is; split at 4096
  "keyboard": [[{ "text": "Yes", "data": "shift:confirm:abc" }]],   // optional
  "ack": {
    "link_added": "123456789",   // add to local allowlist
    "link_revoked": "123456789"  // remove from local allowlist (never the owner)
  }
}
```

An empty or absent `text` means **send nothing**. Do not substitute a fallback message — silence is correct for rejected senders and for acknowledged callbacks.

---

## 4. What the handler returns today

So you can predict behaviour without reading its source.

| Request                                                                       | Response                                                                 |
| :---------------------------------------------------------------------------- | :----------------------------------------------------------------------- |
| `/start <valid unused token>`                                                 | `Linked as <name>. Send /myweek to see your shifts.` + `ack.link_added`  |
| `/start` with a bad, used, or expired token                                   | Deny text, no ack                                                        |
| `/start <token>` when that Telegram account is already linked to someone else | `This Telegram account is already linked to a different Opus Form user.` |
| Any message from a sender with no active link                                 | Deny text + `ack.link_revoked`                                           |
| `/myweek` from a linked sender                                                | Shift list, or `No shifts booked in the next 7 days.`                    |
| Any other command from a linked sender                                        | `Commands: /myweek`                                                      |
| `kind: "callback"` from a linked sender                                       | `{"text":""}` — acknowledge the query, send nothing                      |
| `kind: "file"` from a linked sender                                           | Not-available-yet message. Uploads are stage 3                           |

Deny text is exactly: `This bot is invite only. Please contact your dispatcher.` It is deliberately uninformative — it must not reveal whether a token was wrong, expired, or already used.

---

## 5. Verification

Run on the VPS. The secret comes from the env file and is never printed.

```bash
set -a; . /home/ubuntu/.jinn-opus-form/connectors/composio-telegram.env; set +a; H="https://fgpthpxmiroyebrzjdzo.supabase.co/functions/v1/telegram-handler"; c(){ curl -s -X POST "$H" -H "content-type: application/json" -H "x-opusform-bridge-secret: $OPUSFORM_HANDLER_SECRET" -d "$1"; echo; }
```

Then confirm, after the routing change:

1. Owner sends `/users` in private chat → still handled locally, no network call.
2. Owner sends `/myweek` while unlinked → deny text reaches Telegram, and the owner is **still in the allowlist** afterwards. This is the owner-protection check.
3. Owner opens a portal invite link → links successfully, `/myweek` then answers from their staff record.
4. Owner sends free text such as "hello" → gets `Commands: /myweek`, **not** an assistant reply. If an assistant answers, the Jinn path is still wired.
5. A non-owner unknown sender sends plain text → no reply at all, no forward.
6. Confirm the running process has both variables, names only:

```bash
tr '\0' '\n' < /proc/$(systemctl --user show composio-telegram-bridge.service -p MainPID --value)/environ | grep -o '^OPUSFORM_[A-Z_]*'
```

---

## 6. Standing rules

- **No BotFather token on the VPS.** File downloads and scheduled notifications are done by Supabase, which holds the token. You forward a `file_id` and never fetch it. Composio has no `getFile` action, so do not attempt a download path through it — it does not exist.
- **No business logic in the bridge.** No queries, no message copy, no knowledge of what a pour or a certificate is. If you find yourself writing domain logic, it belongs in the edge function.
- **Do not expose or request the shared secret value.**
- **Never remove the owner from the allowlist**, whatever an ack says.

---

## 7. Coming next, for context only — do not build yet

- **Stage 2**: shift reminders and expiry warnings sent by a scheduled Supabase function directly to Telegram, independent of the bridge being alive. Inline keyboards for confirm/decline — your `callback_query` support is already in place and the handler will start returning `keyboard` payloads.
- **Stage 3**: certificate and document uploads. Your metadata forwarding is already correct; the handler will start accepting `kind: "file"` properly instead of declining.
- **Stage 4**: dispatcher commands (`/who`, `/job`, `/today`, `/staff`), gated by `profiles.role`. No bridge change expected.

---

## 8. Known issue on the Supabase side

Every `deploy` of `telegram-handler` resets `verify_jwt` to `true`, and it must be set back to `false` afterwards. If the bridge suddenly receives **401** rather than reaching the secret check, that is the cause and it is not a bridge fault — report it rather than debugging your own code.
