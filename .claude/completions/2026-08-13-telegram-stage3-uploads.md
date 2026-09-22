# Telegram Stage 3 — Certificate and Job-File Uploads

**Date**: 2026-08-13
**Status**: Shipped and verified live through real Telegram. `telegram-handler` v9.

---

## What shipped

`telegram-handler` now accepts `kind: "file"` instead of declining it. A photo or
PDF sent by a linked operative resolves to one of two destinations, in this
order:

1. **An open `document_requests` row** for that worker → downloaded, magic-byte
   validated, stored at `requests/<request-id>/<uuid>.<ext>` in the existing
   `compliance-documents` bucket, and appended to a new
   `document_requests.telegram_uploads` jsonb queue (path, caption, sender,
   timestamp). **Not** written to `staff.tickets` — a bare Telegram photo has no
   cert type or expiry date, and `submit_worker_documents` requires both. An
   admin finishes these from the portal, same as today's email-link flow.
2. **Today's shift**, if no document request is open → stored at
   `jobs/<job-id>/<uuid>.<ext>` in the existing `job-attachments` bucket, a
   `job_attachments` row with `type: 'document'`, and — if the message had a
   caption — a `job_notes` row with the new `author_type: 'operative'` /
   `author_staff_id` columns.
3. Neither open, or more than one candidate in either category → declined with
   a plain-text explanation (no keyboard picker — see Deferred below).

Hard rules from the design spec, all enforced: 20MB cap (checked on the
declared size and again on the downloaded bytes), MIME/extension pre-filter
plus magic-byte sniffing as the real gate (JPEG/PNG/PDF signatures — client
`mime_type` is never trusted), server-generated storage paths (never the
client filename), forced `content-type` on write, and a 10-uploads/hour rate
limit per document request or per (staff, job).

## Why not a new table

- `document_requests` already models "things a worker needs to submit" — a
  jsonb queue column plus one atomic-append RPC was enough.
- `job_attachments` already models "a file against a job" (type, file_name,
  file_url, uploaded_by) — reused as-is via the same path/`getPublicUrl`
  convention `JobDetails.tsx` uses for portal uploads. No schema change.
- `job_notes` got two new columns (`author_type`, `author_staff_id`) rather
  than a new table, per the handoff's explicit correction to the original
  design spec.

## Deliberate scope cuts

- **No structured cert capture.** The web `SubmitCredentials` flow requires a
  cert type and expiry date before it'll touch `staff.tickets`
  (`SubmitCredentials.tsx:527`). Building that as a multi-turn Telegram
  conversation (ask type → ask expiry → accept photo) needs mid-flow state
  that survives across separate bridge requests, which doesn't exist yet.
  Decided with the user: capture-only for now, admin finishes it in the
  portal. `document_requests.telegram_uploads` exists so nothing is lost —
  just not auto-applied.
- **No multi-request/multi-shift keyboard picker.** Design spec §7.2 wants a
  `callback_query` picker when more than one target is open. That also needs
  the file to survive between the photo message and the button tap. Declined
  gracefully instead ("use the link you were sent" / "add this from the
  portal"), on the basis that a worker having 2+ simultaneously open document
  requests, or 2+ jobs the same day, is rare. If this starts happening in
  practice, revisit.
- **No image_before/image_after/document classification.** Discussed with the
  user; same pending-state problem as above. All Telegram job uploads land as
  `type: 'document'`. Portal-side re-tagging exists already if needed.
- **No admin-facing UI for `telegram_uploads`.** It's queryable jsonb on
  `document_requests` but nothing in the portal surfaces it yet. Natural next
  step if this gets used.

## Bugs hit during live verification (all fixed before shipping)

1. **`storage.objects` isn't exposed to PostgREST on this project.**
   `.schema("storage").from("objects")` returned 406, and the rate-limit
   check's fail-closed behavior correctly declined the upload rather than
   silently allowing it through — but that meant nothing worked. Switched to
   the Storage API's own `.list()`, which needs no schema exposure.
2. **`job_attachments` has no `tenant_id` column live**, despite its original
   migration (`20260716100000_job_ledger_features.sql`) declaring one — the
   live schema has drifted from the repo, consistent with the handoff's
   existing warning about migration/reality divergence. Insert fixed to omit
   it.
3. **Telegram photos carry `file_name: ""`, not a missing field.** The `??`
   fallback for a generated name only catches `null`/`undefined`, so the
   stored name was blank — which made the portal's document-list button
   collapse to a zero-width, unclickable target (`MediaTab.tsx:347`, a
   `min-w-0` flex button whose only content is that name). Fixed by using
   `||` instead of `??` for both `file_name` and `caption`.

## Migration

`supabase/migrations/20260813180000_telegram_stage3_uploads.sql` — applied
directly (Composio SQL, not `db push`) and recorded in
`supabase_migrations.schema_migrations`, per this project's established
convention.

## Test data

All live-test rows and storage objects were created against the real
`worker-1783854687613` (Luke Williams, the only currently-linked account) and
real job `g8na57afp`, then fully removed: `document_requests`,
`shifts` (`shift-tg-test-stage3`), `job_attachments`, `job_notes`, and the
storage objects in both `compliance-documents` and `job-attachments` (removed
via `supabase storage rm --experimental`, since direct `DELETE` on
`storage.objects` is blocked by `storage.protect_delete()`). Verified zero
rows remaining post-cleanup.
