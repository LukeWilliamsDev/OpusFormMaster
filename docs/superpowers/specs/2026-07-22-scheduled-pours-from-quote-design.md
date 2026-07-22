# Scheduled Pours from Quote Conversion — Design

**Date:** 2026-07-22
**Status:** Approved for planning

## Problem

Today, converting a quote to a job (`PipelineRegistry.tsx` `handleConvertToJob`) hardcodes `contractMaxPours: 10` regardless of what the quote actually contains, and creates zero pour records. Separately, `JobDetails.tsx` doesn't persist pours to Supabase at all — it seeds a mock list from `job.currentPours` on mount and tracks everything else in local component state, only visible via a manually-written audit-log trail (`logPourAudit`). A page reload wipes any scheduled-but-not-yet-completed pour that wasn't the mock seed.

This work does two things:

1. Gives pours a real table so scheduled/completed pour data survives reloads and is queryable.
2. On quote conversion, auto-derives scheduled pour rows from the quote's Bill of Quantities (BoQ) instead of a flat guess of 10.

## Data model

New table `public.pours`:

| column        | type                                           | notes                                                      |
| ------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| `id`          | uuid, PK, default `gen_random_uuid()`          |                                                            |
| `job_id`      | uuid, FK → `public.jobs(id)` on delete cascade |                                                            |
| `pour_number` | int                                            | sequential per job, starting at 1                          |
| `date`        | date, nullable                                 | null = not yet scheduled to a specific day                 |
| `mix_type`    | text                                           | e.g. `"C32/40"`, `"TBC"` if ungraded                       |
| `volume_m3`   | numeric                                        |                                                            |
| `status`      | text                                           | `"scheduled" \| "completed"`                               |
| `notes`       | text, nullable                                 |                                                            |
| `created_at`  | timestamptz, default `now()`                   |                                                            |
| `tenant_id`   | uuid                                           | matches `jobs.tenant_id`, set the same way `jobToRow` does |

RLS: same shape as `job_attachments` — `pours_select_ops` / `pours_insert_ops` / `pours_update_ops` / `pours_delete_ops`, all `TO authenticated` gated on `private.can_write_ops(auth.uid())`.

Realtime: subscribe the same way `JobDetails.tsx` already subscribes to `job-audit-${job.id}` — add a `pours` channel filtered on `job_id=eq.${job.id}`.

## BoQ → pour derivation

In `handleConvertToJob` (`PipelineRegistry.tsx`), before building `newJob`:

1. Filter `convertingQuote.items` (`MeasuredItem[]`) to lines whose `description` (case-insensitive) contains any of: `pour`, `slab`, `concrete`, `screed`.
2. Each matched line → exactly one pour row (no splitting by volume — one BoQ line is one pour, per user direction):
   - `volume_m3` = the line's `quantity`
   - `mix_type` = first match of `/C\d{2}\/\d{2}/i` in the description, else `"TBC"`
   - `date` = `null`
   - `status` = `"scheduled"`
   - `notes` = the BoQ line's `description`
3. `contractMaxPours` on `newJob` = matched line count, or `10` (existing fallback) if zero lines matched — so quotes with no recognizable pour lines behave exactly as today.
4. After the existing `jobs` upsert succeeds, bulk-insert the derived pour rows into `public.pours` (same try/catch tier as the PDF attach — pour insert failure logs and toasts but does not roll back the job, mirroring the existing "nice to have, don't block conversion" pattern for the PDF).

## JobDetails.tsx changes

Replace the mock-seeding `useEffect` (currently regenerating `pourLogs` from `job.currentPours` on `job.id` change) with:

- Initial fetch: `supabase.from("pours").select("*").eq("job_id", job.id).order("pour_number")`
- Realtime subscription on `pours` filtered by `job_id`, mirroring the existing `job-audit-${job.id}` channel setup
- `handleAddPourSubmit`, `executeTogglePourComplete`, `executeRemovePour` switch from local `setPourLogs` mutation to real `insert` / `update` / `delete` calls against `public.pours`, keeping the existing `logPourAudit` calls as-is (audit trail stays independent of the pours table, same as today)
- `currentPours` stays derived the same way (count of `status === "completed"` rows), still written back onto `job.currentPours` via `onUpdateJob` for the ledger/dashboard views that read it

## Out of scope

- No date auto-scheduling — pours insert with `date = null`; dispatcher fills in the actual date from the existing "Add Pour" / edit flow in JobDetails.
- No change to `QuoteInvoiceBuilder.tsx` — BoQ authoring is unchanged, detection is purely a conversion-time heuristic.
- No UI for correcting a misclassified pour line beyond the existing pour edit/delete affordances already in JobDetails.

## Testing

- Unit test the BoQ-matching function in isolation (keyword match, grade regex extraction, zero-match fallback to `contractMaxPours: 10`).
- Existing JobDetails pour-log tests (if any) updated to mock Supabase `pours` calls instead of asserting on local-state seeding.
