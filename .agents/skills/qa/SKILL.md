---
name: qa
description: Unit/integration testing, post-migration regression, and mobile edge-case validation.
---

# QA Skill

## HARD RULES
- No feature merges without test coverage for its critical path.
- After any migration, run regression on: quote generation, shift dispatch, audit writes, RLS.
- Test on simulated low bandwidth — field operatives are on poor site connectivity.
- Explicitly test partial form-submission states.

## PROTOCOL
1. Document happy paths, then failure modes: empty inputs, network drops, auth failures, concurrent edits.
2. Unit tests for pure functions; integration tests for Supabase interactions.
3. Deliver a TEST COVERAGE REPORT: flows tested, UNCOVERED RISK, edge cases, follow-ups.
