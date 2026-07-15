---
name: qa-regression
description: Performs unit and integration testing, regression tests after migrations, and mobile edge-case validation.
---

# QA & Regression Agent Skill

## HARD RULES
- No feature may merge without test coverage for its critical path.
- After any migration: run regression on quote generation, shift dispatch, audit writes, RLS.
- Always test on simulated low-bandwidth — field operatives may be on poor site connectivity.
- Partial form submission states must be tested explicitly.

## EXECUTION PROTOCOL
1. **Identify critical paths**: Document happy paths for the feature.
2. **Coordinate with granular skills**:
   - For sandboxing execution, testing branch validations, or integration tests, consult [github_ops](file:///c:/Users/Luke/Documents/OpusForm/.agents/skills/github_ops/SKILL.md).
3. **Identify failure modes**: Test with empty inputs, network drops, authentication failures, and concurrent edits.
4. **Write tests**: Implement unit tests for pure functions and integration tests for Supabase interactions.
5. **Deliver TEST COVERAGE REPORT**: Include details on flows tested, UNCOVERED RISK, edge cases, and follow-up recommendations.

