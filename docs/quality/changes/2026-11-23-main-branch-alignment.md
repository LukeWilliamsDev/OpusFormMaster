# GitHub main branch alignment

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** source, release
**Accountable owner:** Opus Form operations owner
**Source of truth:** User approval to merge the existing GitHub `main` commit into the verified release line before pushing the combined history to `main`.

## Intent

Preserve the one main-only quote-recipient deduplication change while aligning GitHub `main` with the already verified `promote-live` release. Do not force-push or discard either branch's committed work.

## Scope

### In scope

- Merge the existing `origin/main` history into the release line.
- Preserve the quote-recipient deduplication behavior and its regression tests.
- Extend the release lineage allowlist so the combined branch remains mechanically auditable.

### Out of scope

- Force-pushing, deleting history, deploying production, applying migrations, or changing remote data.
- Unrelated dirty changes in the primary checkout.
- Any new UI, role, tenant, RLS, or external-service behavior.

### Changed files

- `docs/quality/changes/2026-11-23-main-branch-alignment.md`
- `scripts/check-release-reconciliation.mjs`
- `src/opus/lib/__tests__/eligibleQuoteData.test.ts`
- `src/opus/lib/eligibleQuoteData.ts`

## Acceptance criteria

- [x] The main-only quote-recipient change is preserved in the release tree.
- [x] Duplicate recipient suggestions are keyed by email while the newest entity label is retained.
- [x] The focused quote-recipient tests, typecheck, and changed-file lint pass.
- [x] The no-drift checker includes the alignment files in its exact allowlist.
- [x] The merge is non-destructive and ready for a normal fast-forward push to `main`.

## Risk and approval gates

- The source change is a pure suggestion aggregation change; no database, tenant, RLS, role, permission, or access boundary changes.
- No UI surface changes; the behavior is covered at the library boundary and existing UI consumers remain unchanged.
- The safe path is a normal merge commit followed by a normal push. Force-push is not authorized.
- Production deployment and live verification remain separate gates.

## Verification evidence

| Check                        | Evidence                                                                                                                                                            | Result  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Main/release divergence      | `origin/main@ad933f9` has one quote-recipient commit not in `promote-live@dd912b5`; safe merge selected                                                             | PASS    |
| Merge                        | `git merge --no-commit --no-ff origin/main` completed without conflicts                                                                                             | PASS    |
| Focused test                 | `npx vitest run src/opus/lib/__tests__/eligibleQuoteData.test.ts` — 6 tests passed                                                                                  | PASS    |
| Typecheck                    | `npm run typecheck`                                                                                                                                                 | PASS    |
| Changed-file lint            | `npx eslint src/opus/lib/eligibleQuoteData.ts src/opus/lib/__tests__/eligibleQuoteData.test.ts`                                                                     | PASS    |
| No-drift lineage             | Run after the merge commit with `node scripts/check-release-reconciliation.mjs --base 06c26b8 --date-baseline letta/job-date-live-baseline-93ca8499 --release HEAD` | PENDING |
| Live/deployment verification | No production deployment or live browser check performed                                                                                                            | NOT RUN |

**Evidence base:** `promote-live@dd912b5`
**Evidence head:** staged safe merge of `origin/main@ad933f9`
**Evidence fingerprint:** `1cbe128d042b0c9daf6101a7ed4cd454878937b88c3f267957fc234c962c60bb`

## Critic review

- Critic status: complete
- Verdict: PASS
- Findings: The main-only change is limited to email-keyed quote recipient aggregation and its test; no UI, schema, access, or external-service behavior is introduced.
- Unresolved blocking findings: none
- Repair iterations: 0

## Release decision

- Automated gate: PASS for focused merge validation; no-drift check and normal push remain pending.
- Release status: READY_FOR_HUMAN_APPROVAL
- Human approval: PENDING
- Residual uncertainty: Production deployment and live behavior remain unverified.
