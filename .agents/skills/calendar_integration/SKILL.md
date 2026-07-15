---
name: calendar-integration
description: Google Calendar & Outlook calendar bi-directional synchronization.
---

# Calendar Integration Agent Skill

## HARD RULES
- Enforce API idempotency using unique keys (e.g. jobId or sync token).
- Implement Saga Compensation handlers to roll back local database slots if calendar API synchronization fails.
- Proactively overlay warnings on overlapping booking blocks.

## EXECUTION PROTOCOL
1. **Sync Operations**: Implement event scheduling logic.
2. **Setup Compensating Action**: Write standard rollback handlers that release reserved shifts or allocations if external API requests time out or fail.
3. **Idempotency Check**: Verify that multiple identical scheduling requests do not produce duplicate external calendar events.
