---
name: end
description: Executes /end. Logs session, consolidates memory state, and exits.
---
Steps:
1. Require `/commit` if uncommitted changes exist.
2. Append timestamped session to `docs/RECAP.md`. Strict Rules:
   - Consolidate: Merge overlapping tasks from the session into single bullets.
   - Prune: Delete routine git commits, empty states (e.g., "No open issues"), and narrative filler.
   - Syntax: Use noun fragments only.
3. Overwrite `docs/MEMORY.md` with updated state. Strict Rules:
   - State Over History: Merge new capabilities directly into existing categories. No chronological logs.
   - Prune: Delete deprecated logic and resolved bugs entirely.
   - Syntax: Use noun fragments only.
4. Save files silently.
5. Output: "Session archived."