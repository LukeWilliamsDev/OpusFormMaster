# Telegram Bridge — VPS Handoff

**Date**: 2026-08-13
**Audience**: whoever maintains `composio-telegram-bridge.mjs` on the Oracle Cloud VPS.
**Companion**: `2026-08-13-telegram-bot-design.md` in this repository holds the full product design. This document is the VPS-side subset and is self-contained — you do not need the design doc to act on it.

## 0. Current status — the Supabase side is already live

Verified 2026-08-13. You are not waiting on anything.

- Tables `telegram_invites` and `telegram_links` exist with RLS enabled, plus the invite and revoke RPCs and a trigger that revokes a link when a staff member is archived.
- Edge function **`telegram-handler` is deployed and ACTIVE** at
  `https://fgpthpxmiroyebrzjdzo.supabase.co/functions/v1/telegram-handler`
  with `verify_jwt: false`, so the shared secret is the only gate.
- It handles `/start <token>` (links a Telegram account to a staff row) and `/myweek` (returns the sender's next seven days). Any other command from a linked sender returns `Commands: /myweek`. Unlinked senders always get the deny text.
- Gate confirmed: a POST with no secret returns `403`, and a POST with a wrong secret returns `403`.
- The VPS already has `OPUSFORM_HANDLER_URL` and `OPUSFORM_HANDLER_SECRET` in an `EnvironmentFile`, and linger is enabled.

Your work is section 10, stage 1. Nothing blocks it.

---

## 1. What is changing and why

Today the bridge forwards every allowlisted message into a persistent Jinn session. That is correct for one trusted owner. OpusForm is about to put operatives, dispatchers, and external third parties on the same bot.

Untrusted senders must never reach a Jinn session. The bridge becomes a **dumb relay**: it authenticates the sender, forwards the update to a Supabase edge function owned by the OpusForm repository, and sends back whatever that function returns.

**Three rules that shape everything below:**

1. **The bridge holds no bot token.** File downloads and scheduled notifications are handled by Supabase directly. Do not install the BotFather token on the VPS.
2. **The bridge contains no business logic.** No queries, no message copy, no idea what a pour or a certificate is. If you find yourself writing domain logic, it belongs in the edge function.
3. **No assistant session on Telegram, for anyone.** Superseded by the amendment in section 4: the Jinn path is removed from the bridge entirely and the owner reaches Jinn over SSH instead. Telegram ID `8724544272` is an ordinary linked user, gated by `profiles.role` like everyone else.

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

### Amendment (2026-08-13) — commands must reach the handler even for the owner

The fork as originally written routes **all** owner traffic to Jinn. That was too broad: the owner is also a dispatcher, so under it they can never use `/myweek`, and in stage 4 never `/who`, `/job`, or `/today` either. Confirmed in practice — the owner's `/start` was answered conversationally by Jinn and never reached the handler.

**Jinn is removed from the Telegram path entirely.** The owner reaches Jinn over SSH on the VPS, which is where it belongs. Telegram becomes a pure OpusForm surface with no assistant session behind it, for anyone, ever.

This is the strongest form of "the bridge is a dumb relay", and it deletes the largest security surface in the design: with no agent reachable from Telegram, the prompt-injection risk that constrained the third-party and natural-language sections no longer exists on this channel.

Revised order:

```
1. Owner access command (/users, /approve, /revoke) from owner private chat
      → handled locally, unchanged (bridge-admin escape hatch)
2. Text starts with "/start"
      → forward to the edge function, regardless of allowlist
3. Sender is in local allowlist (owner included, once linked)
      → forward to the edge function
4. Otherwise
      → recordObservedUser, advance offset, no reply
```

No owner branch beyond the local access commands. The owner is an ordinary linked user, subject to the same handler and the same `profiles.role` gating as everyone else.

**Code this makes dead.** The Jinn session machinery is no longer reachable from the bridge: `jinnRequest`, `buildJinnPrompt`, `getOrCreateSession`, `sessionTail`, `waitForAssistant`, `latestAssistant`, the `sessions` map in runtime state, `gatewayToken()`, and `JINN_GATEWAY_URL` / `JINN_REPLY_TIMEOUT_MS`. Remove them rather than leaving them unwired — an unreachable path to an agent is exactly the kind of thing that gets re-wired by accident later. Existing `sessions` entries in the state file can be dropped on next write.

Keep the per-chat FIFO queues, the concurrency cap, pending-update durability, atomic state writes, message splitting, observed-user expiry, and the organisation guardrail. Those all still apply to handler traffic. The 180-second reply timeout goes with the session code — handler calls should use a short timeout measured in seconds.

**Owner protection, restated:** the handler returns `ack.link_revoked` for any sender it cannot resolve to an active link. Once owner commands reach the handler, that will name `OWNER_USER_ID` whenever the owner is not linked. The bridge must continue to ignore any allowlist removal targeting the owner — the existing owner-protection rule already covers this, but it is now reachable in normal operation rather than theoretical.

**The owner is not a special case in OpusForm terms.** They link their own account through the normal invite flow, and from then on the handler grants exactly what their `profiles.role` allows — the same rule as everyone else. An admin gets admin capabilities in Telegram because the database says so, not because of who they are on the bridge.

There is no Jinn fallback. Free text from a linked sender reaches the handler like anything else and gets the capability list back. When the natural-language layer lands in stage 5, that free text resolves against role-scoped tools instead — still inside the handler, still never an open agent session.

**Handler-side follow-up (this repository, not the bridge):** `telegram_links.target_id` points at a `staff` row, but roles live on `profiles`. Resolving capability by role needs the handler to join `staff.email` to `profiles.email` and read `role` on every message. Stage 1 does not need it — `/myweek` is self-scoped — but every dispatcher command from stage 4 does. Tracked here so it is not discovered late.

Step 3 in the original list — `/start` from unknown senders — is the change that makes onboarding possible. Right now the allowlist check in `pollOnce` logs and advances the offset for unknown senders, so an invited operative's `/start <token>` is discarded and they can never link.

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
- Forward `file_id`, `file_name`, `mime_type`, `file_size`, and the caption. **Do not download.** The edge function holds the token and does the fetching — and it is the only thing that can, see below.
- Reject anything over 20 MB locally using `file_size`, without a network call. That is the Bot API download ceiling anyway.
- Ignore other media types (video, audio, sticker, voice) for now — reply via the edge function, do not store.

Albums arrive as separate updates sharing a `media_group_id`. Do not build grouping. Forward each file independently.

**Composio cannot download files.** The Telegram toolkit exposes `GET_UPDATES`, `SEND_MESSAGE`, `SEND_DOCUMENT`, `ANSWER_CALLBACK_QUERY`, `EDIT_MESSAGE`, `DELETE_MESSAGE`, `FORWARD_MESSAGE`, `GET_CHAT`, `GET_CHAT_MEMBER`, and `GET_ME` — there is no `getFile` equivalent. Retrieval requires the raw bot token against `api.telegram.org/file/bot<token>/<path>`, which is why the token lives in Supabase and the bridge only ever forwards a `file_id`. Do not attempt a Composio-based download; it does not exist.

---

## 7. Callback queries — inline keyboards

Currently `allowed_updates: ["message"]` and `extractMessage` handles only `message` / `channel_post`, so there is no `callback_query` path at all. Every confirm/decline, approve/reject, and disambiguation tap depends on this.

Composio covers this fully — `TELEGRAM_GET_UPDATES` accepts `allowed_updates` including `callback_query`, and `TELEGRAM_ANSWER_CALLBACK_QUERY` exists. No bot token is needed on the VPS for any of it.

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

- Does the existing durable pending-update state cover the polling gap while the bridge is down, or only work already in flight? The source suggests the latter.
- Any reason the organisation check must remain per-action rather than per-poll-cycle that is not visible in the source?
