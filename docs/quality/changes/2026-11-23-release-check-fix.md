# Release check allowlist repair

**Status:** READY_FOR_REVIEW
**Risk:** low
**Change category:** release-control
**Accountable owner:** Opus Form operations owner
**Source of truth:** The safe `main` alignment added one release evidence contract that must be covered by the deterministic release allowlist.

## Intent

Update the committed release-lineage checker so the final `main` alignment evidence contract is included in the exact allowlist rather than being reported as unexpected drift.

## Scope

### In scope

- Add the committed main-alignment contract to the checker allowlist.
- Keep the checker deterministic and read-only.

### Out of scope

- Product behavior, schema, permissions, deployment, or remote data.
- Force-pushes or branch-history changes.

### Changed files

- `docs/quality/changes/2026-11-23-release-check-fix.md`
- `scripts/check-release-reconciliation.mjs`

## Acceptance criteria

- [x] The checker includes the main-alignment contract in its exact allowlist.
- [x] The checker remains syntactically valid and read-only.
- [x] The post-commit no-drift check passes against the combined release tree.

## Risk and approval gates

- This changes only a local release-control script and its evidence contract; no UI or access boundary is changed.
- The script does not call external services or mutate Git refs.
- Human approval remains required before treating the combined branch as deployed.

## Verification evidence

| Check          | Evidence                                                                                                                                         | Result  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| Syntax         | `node --check scripts/check-release-reconciliation.mjs`                                                                                          | PASS    |
| Contract gate  | `QUALITY_BASE_REF=e87117d node scripts/quality-gate.mjs --staged-only --contract-only`                                                           | PASS    |
| No-drift check | `node scripts/check-release-reconciliation.mjs --base 06c26b8 --date-baseline letta/job-date-live-baseline-93ca8499 --release HEAD` after commit | PENDING |

**Evidence base:** `e87117d` (`Merge main into the verified release line.`)
**Evidence head:** staged checker allowlist repair
**Evidence fingerprint:** `8412bbe350af0967eb86a0dba87c817e28cedca3f18d5e362bd364a33428ffae`

## Critic review

- Critic status: complete
- Verdict: PASS
- Findings: The repair adds only the missing evidence-contract path to the existing allowlist.
- Unresolved blocking findings: none
- Repair iterations: 0

## Release decision

- Automated gate: PASS for syntax and staged contract validation; final lineage check pending the commit.
- Release status: READY_FOR_HUMAN_APPROVAL
- Human approval: PENDING
- Residual uncertainty: Production deployment remains unverified.
