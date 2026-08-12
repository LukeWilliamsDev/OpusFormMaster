# Telegram Bridge — VPS Handoff

**Date**: 2026-08-13
**Audience**: whoever maintains `composio-telegram-bridge.mjs` on the Oracle Cloud VPS.
**Companion**: `2026-08-13-telegram-bot-design.md` in this repository holds the full product design. This document is the VPS-side subset and is self-contained — you do not need the design doc to act on it.

---

## 1. What is changing and why

Today the bridge forwards every allowlisted message into a persistent Jinn session. That is correct for one trusted owner. OpusForm is about to put operatives, dispatchers, and external third parties on the same bot.

Untrusted senders must never reach a Jinn session. The bridge becomes a **dumb relay**: it authenticates the sender, forwards the update to a Supabase edge function owned by the OpusForm repository, and sends back whatever that function returns.

**Three rules that shape everything below:**

1. **The bridge holds no bot token.** File downloads and scheduled notifications are handled by Supabase directly. Do not install the BotFather token on the VPS.
2. **The bridge contains no business logic.** No queries, no message copy, no idea what a pour or a certificate is. If you find yourself writing domain logic, it belongs in the edge function.
3. **The owner path is unchanged.** Telegram ID `8724544272` keeps the existing Jinn session behaviour exactly as it is today.

---

## 2. Do this first — operations

Linger is off (`Linger=no`, confirmed 2026-08-13). The user systemd manager shuts down when the last login session closes, so the bridge currently dies on logout, not merely on reboot. It is up right now only because a session is holding it open.

```bash
loginctl enable-linger ubuntu
```

Confirm both:

```bash
loginctl show-user ubuntu --property=Linger && systemctl --user is-enabled composio-telegram-bridge.service
```

Expect `Linger=yes` and `enabled`. If the unit reports `disabled`:

```bash
systemctl --user enable composio-telegram-bridge.service
```

Then reboot and verify it returns without anyone logging in. Treat `enable-linger` as a permanent deployment step — it is silently absent on any fresh rebuild.

---

## 3. The contract

One authenticated POST per update. The bridge relays the response verbatim.

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
  "text": "…",                   // send as-is; split at 4096 using existing logic
  "keyboard": [[{ "text": "Yes", "data": "shift:confirm:abc" }]],   // optional
  "ack": {
    "link_added": "123456789",   // optional — add to local allowlist
    "link_revoked": "123456789"  // optional — remove from local allowlist
  }
}
```

An empty or absent `text` means send nothing. Do not invent a fallback message — silence is sometimes the correct response, particularly for rejected senders.

Two new environment variables in the unit file: `OPUSFORM_HANDLER_URL` and `OPUSFORM_HANDLER_SECRET`. The secret goes in an `EnvironmentFile=` at mode `0600`, not inline in the unit.

---

## 4. Routing fork

Replace the current single path in `pollOnce` / `handleAuthorizedUpdate` with this order:

```
1. Owner command (/users, /approve, /revoke) from owner private chat
      → unchanged, handled locally
2. Sender is OWNER_USER_ID
      → unchanged, Jinn session
3. Text starts with "/start "
      → forward to edge function as kind=text, REGARDLESS of allowlist
4. Sender is in local allowlist
      → forward to edge function
5. Otherwise
      → recordObservedUser, advance offset, no reply (unchanged)
```

Step 3 is the change that makes onboarding possible. Right now the allowlist check in `pollOnce` logs and advances the offset for unknown senders, so an invited operative's `/start <token>` is discarded and they can never link.

### Allowlist stays local, edge function stays authoritative

Keep `composio-telegram-access.json` as the cheap local gate — it stops unknown traffic before it costs a network call. But the edge function is the source of truth:

- Successful link → response carries `ack.link_added` → bridge adds the ID to the allowlist.
- Revoked in the portal → the next message from that ID gets a response carrying `ack.link_revoked` → bridge removes the ID.

Self-healing, no polling, no second source of truth. The owner ID remains permanently allowlisted and unrevocable, exactly as now.

### Rate-limit step 3

`/start` is reachable by anyone on Telegram and now costs a network call. Cap it per sender ID and in aggregate — a few attempts per minute is generous. Reject over the cap locally, without forwarding.

---

## 5. Fast path

Forwarded traffic must not go through the Jinn session machinery. `JINN_REPLY_TIMEOUT_MS` of 180 seconds is right for an agent conversation; `/myweek` is a database read and needs to answer in well under a second.

Keep the per-chat FIFO queue and the `MAX_CONCURRENT_CHATS` cap — both still apply. Skip session creation, `waitForAssistant`, and the polling loop over `sessionTail`. A forwarded update is: POST, receive, send.

---

## 6. Attachments — stop discarding files

`handleAuthorizedUpdate` currently returns early when `text` is empty, and `extractText` falls back to `caption`. Net effect today:

- Photo **with** a caption → the caption is forwarded, the photo is silently discarded, and the user gets a normal-looking reply having stored nothing.
- Photo **without** a caption → dropped entirely, no reply.

This is silent data loss and it blocks the highest-value capability in the product design (certificate and document upload).

Add `extractAttachments(message)`:

- `message.photo` is an array of sizes — take the **last** element, it is the largest.
- `message.document` covers PDFs, which is what most certificates actually arrive as.
- Forward `file_id`, `file_name`, `mime_type`, `file_size`, and the caption. **Do not download.** The edge function holds the token and does the fetching.
- Reject anything over 20 MB locally using `file_size`, without a network call. That is the Bot API download ceiling anyway.
- Ignore other media types (video, audio, sticker, voice) for now — reply via the edge function, do not store.

Albums arrive as separate updates sharing a `media_group_id`. Do not build grouping. Forward each file independently.

---

## 7. Callback queries — inline keyboards

Currently `allowed_updates: ["message"]` and `extractMessage` handles only `message` / `channel_post`, so there is no `callback_query` path at all. Every confirm/decline, approve/reject, and disambiguation tap depends on this.

- Add `"callback_query"` to `allowed_updates` in the `TELEGRAM_GET_UPDATES` call.
- Extend `extractMessage` (or add a sibling) to recognise `update.callback_query`. Sender is `callback_query.from.id`; chat is `callback_query.message.chat.id`.
- Forward as `kind: "callback"` with `callback_data` and `callback_query_id`.
- Always answer the callback query so the client stops showing a spinner, even when the response text is empty.

---

## 8. Hardening

Not blocking stage 1, but land these alongside notifications when volume rises.

**Cache the organisation check.** `runComposio` spawns `composio whoami` before _every_ action, then `composio execute`. That is two subprocess spawns per outbound message chunk — a 50-recipient broadcast is roughly 100 spawns, each with a 75-second timeout ceiling. This, not the Telegram API, is the throughput blocker. Cache the result with a short TTL, or verify once per poll cycle rather than per action. Keep the guarantee that a wrong organisation halts the operation.

**Floor sleep between empty polls.** `runLoop` calls `pollOnce` back-to-back. The only thing preventing a hot loop is Composio honouring `timeout: 30`. If it ever returns immediately you get continuous subprocess spawning. A one-line minimum sleep removes the failure mode.

**Cap or expire `observedUsers`.** Every unknown sender is recorded permanently and each one triggers a full state write. The bot is publicly findable, so this is unbounded growth and disk churn. A cap or TTL, plus dropping entries once allowlisted, is enough.

**State write cost.** `persistState` deep-clones and rewrites the entire file per observed user and per offset advance — O(state) per message. Fine at one user; worth revisiting once sessions and observed users accumulate. Not urgent, noted so it is not a surprise later.

**Heartbeat.** Once operatives depend on shift reminders, a silent overnight failure means a crew does not turn up. Scheduled notifications are deliberately routed through Supabase so they survive a dead bridge, but inbound still needs liveness alerting.

---

## 9. What stays exactly as it is

This is careful work and none of it should be disturbed:

- Atomic `0600` state writes and the serialised write chain.
- `flock -n` against double-run.
- Per-chat FIFO ordering with cross-chat concurrency.
- Pending updates persisted **before** the Telegram offset is claimed, so a restart resumes rather than loses.
- Numeric Telegram ID as the trust anchor; owner ID permanently allowlisted.
- Composio organisation guardrail (optimise how often it runs, never remove it).
- Owner commands gated on private chat **and** owner ID.
- Default-deny posture.
- Message splitting at 4096.

---

## 10. Order of work

**Stage 1 — unblocks everything else**

1. `loginctl enable-linger ubuntu` and verify across a reboot.
2. `OPUSFORM_HANDLER_URL` and `OPUSFORM_HANDLER_SECRET` via `EnvironmentFile=` at `0600`.
3. Routing fork (section 4), including `/start` admission and its rate limit.
4. Edge function POST client and verbatim relay (section 3).
5. Fast path (section 5).
6. `ack.link_added` / `ack.link_revoked` handling.

**Stage 2**

7. `callback_query` support (section 7).

**Stage 3**

8. `extractAttachments` (section 6).

**Stage 4**

9. Hardening (section 8).

The OpusForm repository builds the edge function, tables, and portal control surface in parallel. Stage 1 is done when an invited operative can scan a QR code, land in the bot, and get a real shift list back.

---

## 11. Testing

`runTests()` already covers chunking, ID normalisation, message extraction, and owner-command parsing. Extend it in the same style — plain assertions, no framework:

- Routing fork returns the correct branch for: owner, allowlisted sender, `/start` from unknown sender, plain message from unknown sender.
- `/start` rate limit rejects past the cap without forwarding.
- `extractAttachments` picks the largest photo size, reads a document, and returns nothing for a plain text message.
- Size cap rejects an oversized `file_size` without a network call.
- `ack.link_added` and `ack.link_revoked` mutate the allowlist correctly, and neither can remove the owner.

For end-to-end work, point `OPUSFORM_HANDLER_URL` at a local stub returning canned responses. The bridge should be fully testable without Supabase.

---

## 12. Questions to send back

- Does Composio expose a file-download action? It affects nothing in this design (Supabase holds the token and does the fetching) but it is worth knowing before stage 3.
- Does the existing durable pending-update state cover the polling gap while the bridge is down, or only work already in flight? The source suggests the latter.
- Any reason the organisation check must remain per-action rather than per-poll-cycle that is not visible in the source?
