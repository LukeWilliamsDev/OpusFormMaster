---
title: Agentic quality and critic loop
date: 2026-09-30
---

# Agentic quality and critic loop

## Implemented

- Added the reusable Opus Form change-assurance prompt and critic-loop protocol.
- Added a machine-checkable change contract template and a contract for this change.
- Added `npm run quality:contract` and `npm run quality:gate`.
- Added staged-contract validation to pre-commit and the full gate to CI.
- Updated QMS change management and quick-start guidance.

## Assurance boundary

The deterministic gate can prove only the checks it actually runs. A fresh critic
pass remains advisory evidence, and human approval is still required for schema,
RLS, security, policy, production, and external-service decisions. No live service
or production verification was performed for this change.

## Validation

- Contract validation: passed, with human approval correctly left pending.
- Staged-only contract path: passed against a temporary Git index.
- Full quality gate: passed — lint (pre-existing warnings only), Prettier, TypeScript, 10 test files / 130 passing tests / 1 skipped, production build, and bundle budget.
- Independent critic: passed after three repair cycles; the final review found no remaining implementation findings.
