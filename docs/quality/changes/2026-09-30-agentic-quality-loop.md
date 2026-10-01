# Opus Form change contract — agentic quality loop

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** source | documentation | configuration
**Accountable owner:** Opus Form director / named repository reviewer
**Source of truth:** User request for an always-on agentic/critic loop, existing Opus Form QMS, and repository instructions
**Evidence base:** `working tree`
**Evidence head:** `working tree`
**Evidence fingerprint:** `fb134bf7f439bbe2b6d2e69ad7dd03143ff42c705e91804b87a7c14c3584ec8b`

## Intent

Make every future Opus Form create/edit task carry an explicit contract, run the
existing deterministic checks, receive a fresh adversarial review, and stop cleanly
at human or external-effect gates instead of treating a green build as approval.

## Scope

### In scope

- A reusable agentic implementation prompt and critic checklist.
- A Markdown contract format for acceptance, risk, evidence, findings, and release status.
- Local pre-commit and CI enforcement for the contract and existing quality commands.
- QMS and quick-start documentation describing the approval boundary.

### Out of scope

- An autonomous GitHub/Supabase/Cloudflare deployer or live-service verifier.
- Automatic human approval, security assurance, legal interpretation, or risk acceptance.
- Changes to application behavior, database schema, production data, or external accounts.

### Changed files

- `.agents/AGENTS.md`
- `.claude/QUICK_START.md`
- `.claude/completions/2026-09-30-agentic-quality-loop.md`
- `.github/workflows/ci.yml`
- `.husky/pre-commit`
- `docs/INDEX.md`
- `docs/QMS/CHANGE_MANAGEMENT.md`
- `docs/quality/AGENTIC_CHANGE_ASSURANCE.md`
- `docs/quality/CHANGE_CONTRACT_TEMPLATE.md`
- `docs/quality/changes/2026-09-30-agentic-quality-loop.md`
- `package.json`
- `scripts/quality-gate.mjs`
- `scripts/quality-gate.test.mjs`

## Acceptance criteria

- [x] `AC-1`: Future relevant changes require a `docs/quality/changes/*.md` contract with observable criteria, risk, evidence, critic verdict, and release status — evidence: `scripts/quality-gate.mjs` and the template.
- [x] `AC-2`: The repository exposes one local command that validates the contract and runs lint, formatting, typecheck, tests, production build, and bundle budget checks — evidence: `npm run quality:gate`.
- [x] `AC-3`: Staged commits and CI invoke the contract gate, with CI comparing the change against its base revision — evidence: `.husky/pre-commit` and `.github/workflows/ci.yml`.
- [x] `AC-4`: The loop distinguishes deterministic evidence from critic evidence and accountable human approval — evidence: `docs/quality/AGENTIC_CHANGE_ASSURANCE.md` and QMS-006 update.
- [x] `AC-5`: No live service, production data, external account, or deployment was changed by this implementation — evidence: scoped diff and validation record.

## Risk and approval gates

- This changes development and CI controls, so a repository reviewer should inspect
  the workflow before merging it.
- Source/configuration changes must address role, permission, or access boundaries;
  the loop explicitly preserves those checks.
- The contract validator is deterministic but cannot make an AI critic independent;
  human review remains required for schema, RLS, security, policy, production, and
  external-service decisions.
- Rollback is a normal Git revert; no database migration or live deployment is part
  of this change.
- Human approval required: yes — review this workflow and approve the exact diff
  before merge; no production release is authorized by this contract.

## Verification evidence

| Check                          | Exact command or evidence                                        | Result         |
| ------------------------------ | ---------------------------------------------------------------- | -------------- |
| Contract                       | `npm run quality:contract`                                       | PASS           |
| Staged contract path           | `npm run quality:contract -- --staged-only` in a temporary index | PASS           |
| Unit tests                     | `npm run test`                                                   | PASS           |
| Lint                           | `npm run lint`                                                   | PASS           |
| Formatting                     | `npx --no-install prettier --check .`                            | PASS           |
| Typecheck                      | `npm run typecheck`                                              | PASS           |
| Build and bundle budget        | `npm run build:budget` with placeholder build env                | PASS           |
| Dependency/configuration audit | `package.json` scripts only; no dependency or lockfile change    | NOT APPLICABLE |
| UI/live/external verification  | Not applicable; no application or live service behavior changed  | NOT APPLICABLE |

## Critic review

- Critic context/identity: fresh read-only repository review, separate from the implementation pass
- Review input: actual worktree diff, this contract, repository instructions, QMS-006, and quality-gate output
- Verdict: `PASS`
- Findings: none after the final fresh read-only review; staged content, stale evidence, CI base handling, repository-control coverage, and approval boundaries were all checked.
- Unresolved blocking findings: `none`
- Repair iterations: `3` — approval state, CI base handling, repository-control coverage, validator tests, and staged-contract reads were tightened after critic findings.

## Release decision

- Automated gate: `PASS` — `npm run quality:gate`
- Release status: `NOT_RELEASED`
- Human approval: `PENDING`
- Residual uncertainty or exception: The validator can enforce that evidence is
  recorded, but it cannot prove that a model's critic was independent; a named human
  reviewer must inspect and approve the exact diff.
