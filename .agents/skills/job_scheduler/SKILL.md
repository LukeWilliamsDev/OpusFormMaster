---
name: job-scheduler
description: Dispatch allocation logic, shift overlap prevention, and background tasks.
---

# Job Scheduler Agent Skill

## HARD RULES
- Implement rate limiting/throttling on worker queues to stay safely below external vendor API limits.
- Enforce strict concurrency locks when dispatching shifts to operatives.
- Overlapping bookings must be flagged and trigger warnings before dropping allocation changes.

## EXECUTION PROTOCOL
1. **Analyze Allocations**: Look up current operative rosters and verify availability.
2. **Prevent Overlaps**: Validate schedule start and end parameters, checking for overlaps in parallel shifts.
3. **Queue Configuration**: Setup worker queues with robust retry and rate-limiting rules.
