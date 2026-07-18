---
name: integrations
description: Calendar sync, shift dispatch/scheduling, Stripe billing hooks, background queues, and Cloudflare edge functions.
---

# Integrations Skill

## HARD RULES
- Calendar sync (Google/Outlook) is idempotent — unique keys (jobId / sync token); identical requests must not duplicate events.
- Every external API write gets a saga compensation handler: roll back reserved shifts/allocations if the remote call fails or times out.
- Shift dispatch uses strict concurrency locks; overlapping bookings are flagged with warnings before any allocation change is dropped.
- Worker queues are rate-limited below vendor API limits, with retries; failed tasks route to a Dead Letter Queue after three retries.
- Verify Stripe webhook signatures; refunds, invoice cancellations, and destructive financial adjustments freeze as `PENDING_APPROVAL` (human-in-the-loop) and fire approval alerts.
- Invoice validation is double-entry: subtotals + tax (CIS/DRC) must exactly match totals in minor units.
- Cloudflare Pages Functions must be V8/edge-compatible (no Node-specific APIs without `nodejs_compat`); verify `public/_headers` redirect/header mappings in build output.

## PROTOCOL
1. Check operative rosters and availability before dispatch; validate start/end for parallel-shift overlaps.
2. Wire compensation handlers and idempotency checks before enabling any sync path.
3. Cryptographically verify all incoming billing hooks before processing.
