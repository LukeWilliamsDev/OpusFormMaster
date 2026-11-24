# Opus Form change contract — chief-of-staff staff routing

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** documentation | configuration
**Accountable owner:** Luke Williams / Opus Form owner
**Source of truth:** User decision in the 2026-11-24 Letta conversation to create a Chief of Staff and specialist staff structure for Opus Form.
**Evidence base:** `origin/promote-live` at `dd912b5688f45b3eb4c1969379277075098e5ea2`
**Evidence head:** working tree
**Evidence fingerprint:** `86401d17c07bebf207dbd3e03a599b6b7e08993accfc6f1764d4b7087063067f`

## Intent

Give Opus Form one project-aware Chief of Staff front door that filters substantive
requests through focused specialist roles and notices repository changes before
relying on stale project context.

## Scope

### In scope

- Define the Opus Form Chief of Staff and specialist routing contract.
- Add a deterministic local context-change marker driven by the repository post-commit hook.
- Document the source hierarchy, evidence labels, and human approval boundaries.
- Provide specialist subagent definitions in the local Letta user configuration.

### Out of scope

- Deploying, merging, pushing, or changing Opus Form application or Supabase production state.
- Claiming semantic project-memory updates happen without a Chief of Staff or scheduled refresh run.
- Replacing the existing Opus Form daily memory-refresh schedule without verification.
- Adding customer-facing channels or external-service integrations.

### Changed files

- `docs/ai/opus-form-staff.md`
- `scripts/sync-opusform-context.mjs`
- `.husky/post-commit`
- `docs/quality/changes/2026-11-24-opusform-chief-of-staff.md`

## Acceptance criteria

- [x] `AC-1`: The repository contains a concise Chief of Staff charter with explicit routing roles, source priority, evidence labels, and approval boundaries — evidence: `docs/ai/opus-form-staff.md` inspection.
- [x] `AC-2`: A post-commit-safe marker records the current commit, release baseline, dirty tracked/untracked files, changed files, and whether semantic review is pending without exposing secrets — evidence: `node --check scripts/sync-opusform-context.mjs`, `--commit`/`--check` lifecycle check, dirty acknowledgement refusal, and `sh -n .husky/post-commit`.
- [x] `AC-3`: The current Letta agent is described and configured as the Opus Form Chief of Staff, with specialist subagents available in the local user configuration — evidence: verified agent metadata and five `~/.letta/agents/opusform-*.md` files.
- [x] `AC-4`: Existing dirty changes in the deployment-source checkout are preserved outside this implementation worktree — evidence: `/home/ubuntu/Documents/Codex/opusform-pre-chief-of-staff-20261124` contains the tracked diff and untracked-file archive.
- [x] `AC-5`: Validation and an independent read-only critic review the actual diff; no production, provider, or external side effect is performed — evidence: verification table and critic record below.

## Risk and approval gates

- This changes local agent routing and project-context handling, not application authorization or production runtime.
- The context marker is advisory runtime state. It must not be treated as deployment, migration, security, or human approval evidence.
- The specialist roles are read-only by default. Any write, external service, production, legal, secret, or irreversible action remains a separate gate.
- Human approval required: yes for merging/publishing this repository change or changing the staff roles; no external or production action is authorized by this contract.

## Verification evidence

| Check                      | Exact command or evidence                                                                                                                             | Result                                                                                                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract                   | `QUALITY_BASE_REF= npm run quality:contract`                                                                                                          | PASS after final contract update                                                                                                                                                                    |
| Deterministic checks       | `node --check scripts/sync-opusform-context.mjs`; marker `--commit`/`--check` lifecycle and dirty acknowledgement refusal; `sh -n .husky/post-commit` | PASS                                                                                                                                                                                                |
| Formatting                 | `npx prettier --check docs/ai/opus-form-staff.md scripts/sync-opusform-context.mjs docs/quality/changes/2026-11-24-opusform-chief-of-staff.md`        | PASS                                                                                                                                                                                                |
| Lint                       | `npm run lint`                                                                                                                                        | PASS; 0 errors, 83 existing warnings                                                                                                                                                                |
| Typecheck                  | `npm run typecheck`                                                                                                                                   | PASS                                                                                                                                                                                                |
| Tests                      | `npm test`                                                                                                                                            | PASS; 21 files, 191 passed, 1 skipped                                                                                                                                                               |
| Build                      | `npm run build`                                                                                                                                       | PASS; existing chunk-size and Vite/Nitro warnings only                                                                                                                                              |
| Full quality gate          | `QUALITY_BASE_REF= npm run quality:gate`                                                                                                              | BLOCKED by two pre-existing baseline formatting failures: `docs/quality/changes/2026-11-13-opusform-master-remediation.md` and `docs/quality/changes/2026-11-19-job-media-video-and-compression.md` |
| Manual/configuration check | Inspect current agent metadata and `~/.letta/agents/opusform-*.md`                                                                                    | PASS                                                                                                                                                                                                |
| External/production check  | None performed; explicitly out of scope                                                                                                               | NOT APPLICABLE                                                                                                                                                                                      |

## Critic review

- Critic context/identity: fresh read-only review against the actual diff and this contract.
- Review input: working-tree diff from `origin/promote-live`.
- Verdict: PASS
- Findings: Initial critic found six issues (dirty-worktree blind spot, mutating check mode, silent hook failure, undefined commit mode, baseline drift handling, and sensitive commit metadata). All six were repaired in this iteration; the post-repair critic found no blocking or major findings.
- Unresolved blocking findings: None identified by the post-repair critic; human approval remains required for merge/publish.
- Repair iterations: `1`

## Release decision

- Automated gate: `BLOCKED_BY_PRE_EXISTING_BASELINE_FORMAT`
- Release status: `NOT_RELEASED`
- Human approval: `PENDING`
- Residual uncertainty or exception: semantic memory reconciliation still requires a Chief of Staff turn or the existing scheduled refresh; the repository hook only records change awareness.
