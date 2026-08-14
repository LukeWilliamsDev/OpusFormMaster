# Telegram Pending-Upload Picker — Design

**Purpose**: replace the "ambiguous — use the portal instead" bail-out in `resolveUploadContext` with a real disambiguation flow, using an inline keyboard, when an operative sends a photo/PDF and has 2+ open document requests or 2+ same-day shifts. This is the mid-flow state that `2026-08-14-telegram-session-handoff.md` §3 flags as unlocking three further cuts (structured cert capture, before/after classification, admin UI) — this design covers the picker only; the other three are separate follow-on changes once this state exists.

## Current behavior (being replaced)

`resolveUploadContext` in `telegram-handler/index.ts` (`supabase/functions/telegram-handler/index.ts:563`) returns `{ kind: "ambiguous", message }` when it finds 2+ open `document_requests` rows or 2+ same-day `shifts` rows for the sender, and `handleFile` just relays that message back — the file is never stored, the operative has to go elsewhere.

## New flow

1. `handleFile` receives the photo/PDF as today (size/type checks unchanged).
2. `resolveUploadContext` returns a new variant, `{ kind: "pending", candidates: Candidate[] }`, instead of `ambiguous`, where `Candidate = { kind: "document_request" | "job"; id: string; label: string }`.
   - `document_request` label: `requested_certs.join(", ")` (falls back to `"Document request"` if empty).
   - `job` label: the shift's `jobs.site_name` (falls back to `"Unassigned site"`, matching `handleMyWeek`'s `||` fallback).
3. On `pending`, `handleFile` runs the same size/type-checked download it already does (`fetchTelegramFile`), uploads the bytes to `compliance-documents` under a `pending/<uuid>` path, inserts one `telegram_pending_uploads` row, and sends a Telegram message with an inline keyboard — one button per candidate, `callback_data: pending:pick:<rowId>:<idx>` — then returns immediately (no further storage move yet).
4. When the operative taps a button, the bridge forwards it as `kind: "callback"` (already supported — same path stage 1's shift confirm/decline uses). `handleCallback` gets a new `scope === "pending"` branch:
   - Load the `telegram_pending_uploads` row by `rowId`.
   - Reject (edit message: `"That picker expired — please resend the file."`, delete row + storage object) if `created_at` is older than 10 minutes, the row doesn't exist, or `target_id` doesn't match the tapper's own `targetId` (same ownership guard `handleCallback`'s shift branch already applies).
   - Otherwise, look up the picked `candidates[idx]`, move the storage object from `pending/<uuid>` to its real destination (same path scheme `handleFile`'s existing single-candidate path already uses for `document_request` / `job` uploads), run the same finalize steps (insert `job_attachments` row, or append to `document_requests.telegram_uploads`), delete the pending row, and reply with the same confirmation text the single-candidate path sends today.
5. Rate limiting (`isUploadRateLimited`) runs at picker-resolution time (step 4), against the picked context — not at upload time (step 3) — since the context, and therefore which counter applies, isn't known until the tap.

## New table

```sql
CREATE TABLE telegram_pending_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text NOT NULL,
  target_id text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  candidates jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

No RLS — service-role only, same posture as `telegram_links`.

## Expiry

10 minutes, silent (no proactive reminder — matches Telegram UX where a stale inline keyboard just stops working). Expiry is checked lazily, on tap, per step 4 — no scheduled cleanup job for this change. A `pending/` storage object whose row expired and is never tapped is orphaned; cleanup of stale `pending/` objects (e.g. a nightly sweep) is out of scope here and can be added later without touching this design's data flow.

## Error handling

- `resolveUploadContext`'s existing fail-closed behavior (query error → `{ kind: "error" }` → `"Something went wrong — please try again shortly."`) is unchanged; it now also covers the new pending-row insert and storage upload — a failure at step 3 returns the same error text rather than silently dropping the file.
- Callback branch: unknown/expired/foreign `rowId` all resolve to the same "expired" message — no distinct wording that would let a caller probe for the existence of another operative's pending upload.

## Out of scope (separate follow-on changes)

- Admin UI for `document_requests.telegram_uploads`.
- Structured cert capture (parsing cert type/expiry from the upload).
- Before/after image classification.
- Scheduled cleanup of orphaned `pending/` storage objects.

## Testing

- Unit-test-shape coverage (matching existing `resolveUploadContext`/`handleCallback` tests): 2 open document requests → pending with 2 candidates; 2 same-day shifts → pending with 2 candidates; tap within TTL finalizes correctly for both `document_request` and `job` kinds; tap past TTL → expired message, row and storage object gone; tap on someone else's `rowId` → same expired message, no data leaked.
- Live verification: manufacture two open `document_requests` rows (or two same-day `shifts` rows) for the test worker, send a photo, confirm the keyboard renders with correct labels, tap one, confirm the file lands in the right place and the request/shift's upload state updates. Delete all test rows and storage objects afterward, per the handoff's standing rule.
