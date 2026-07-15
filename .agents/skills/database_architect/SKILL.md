---
name: database-architect
description: SQL and relational schema integrity (PostgreSQL/Prisma).
---

# Database Architect Agent Skill

## HARD RULES
- Money must be stored as minor-unit integers (cents).
- Use raw SQL migrations or transactional blocks (PostgreSQL BEGIN/COMMIT) for multi-row edits.
- Lock calendar slots pessimistically during dispatch using SELECT ... FOR UPDATE.

## EXECUTION PROTOCOL
1. **Analyze Schema**: Fetch existing table schema and foreign key structures.
2. **Review Concurrency**: Ensure any booking, assignment, or reservation checks are locked using `SELECT ... FOR UPDATE` for the transaction scope.
3. **Validate Integers**: Verify that all columns representing financial amounts, costs, or totals are integers (representing cents or minor currency units).
4. **Draft Rollback Plan**: Document the exact rollback SQL for any schema alteration.
