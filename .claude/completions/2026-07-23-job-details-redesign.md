# Job Details Mobile-First Redesign — Completion

Plan: `docs/superpowers/plans/2026-07-23-job-details-redesign.md`
Spec: `docs/superpowers/specs/2026-07-23-job-details-redesign-design.md`
Branch: `worktree-job-details-redesign` (worktree at `.claude/worktrees/job-details-redesign`)

## What changed

`src/opus/components/JobDetails.tsx` (2122 lines) split into a persistent
header + 4-tab workspace:

- `PersistentJobHeader.tsx` — next scheduled pour, weather, collapsible active-staff list
- `JobOverviewTab.tsx` — status selector + supplier proximity map
- `MediaTab.tsx` — photo/document attachments, upload, share-link generator
- `FeedTab.tsx` — new: timestamped job notes with optional reminders
- `HistoryTab.tsx` — audit log (unchanged logic, relocated)

New table: `job_notes` (migration `supabase/migrations/20260723120000_add_job_notes_table.sql`),
RLS/tenant pattern mirrors `pours`. `job_notes` type added to
`src/integrations/supabase/types.ts` (hand-authored — no local Supabase CLI
available in this environment; regenerate with `supabase gen types` against
a real project before merge to confirm it matches).

## Verification done

- `npm run test`: 61 passed, 1 skipped (baseline was 56/1 before this work)
- `npm run build`: succeeds
- `npm run lint`: touched files clean; pre-existing repo-wide prettier noise confirmed unrelated (same volume on the pre-refactor commit)
- Every task reviewed by an independent subagent (spec compliance + code quality), all 7 approved

## Not verified

- Migration never applied against a live Postgres (no `supabase` CLI in this environment) — apply it and re-run `supabase gen types` before merge.
- No interactive browser QA — user prefers to verify UI changes themselves. Check on a 375px viewport: header height/scroll, all 4 tabs (upload, share-link copy, feed post + reminder, audit revert), and dark-mode contrast.

## Known deferred item

`JOB_REVERTIBLE_FIELDS`/`JOB_FIELD_LABELS` constants live in `HistoryTab.tsx`
and are imported back into `JobDetails.tsx` for the Revert dialog — a mildly
backwards dependency, flagged by task review as fine for now, candidate for
a shared `utils/jobAudit.ts` if that dialog is touched again.
