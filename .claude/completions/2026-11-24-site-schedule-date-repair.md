# Site Schedule date visibility repair

## Outcome

Restored the Site Schedule's date invariant: only jobs with a valid inclusive
`start_date`/`end_date` period appear for a selected day. Jobs without dates are
now identified in the Sites view instead of disappearing without explanation.

## Changes

- Added deterministic periods to demo and local Foreman fixtures.
- Required valid dates when converting a quote into a job or activating/editing an active job.
- Guarded staff assignment and reallocation at the mutation layer against undated or out-of-period jobs.
- Guarded history reverts from restoring an undated job to an active status.
- Kept existing production rows untouched; no dates were invented or backfilled.

## Verification

- `npm test`: 191 passed, 1 skipped.
- `npm run typecheck`: passed.
- `npm run lint -- --quiet`: passed.
- `npm run build`: passed.
- Focused job-period tests: 4 passed.
- Fresh read-only critic: PASS.
- Full quality gate remains blocked only by two pre-existing formatting failures documented in the change contract.

## Release state

Prepared on branch `letta/site-schedule-date-repair`. Not merged, pushed, deployed,
or applied to production data. Existing dirty changes in the deployment-source
checkout were preserved in `/home/ubuntu/Documents/Codex/opusform-pre-site-schedule-repair-20261124`.
