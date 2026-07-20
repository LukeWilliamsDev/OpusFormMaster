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
3. Update the real cross-session auto-memory store (`~/.claude/projects/.../memory/`), NOT `docs/MEMORY.md` (that file no longer exists as a target). Strict Rules:
   - State Over History: Merge new project facts into the existing relevant memory file (e.g. `project_opusform_context.md`) rather than appending a log entry.
   - Prune: Remove/update memory entries that are now stale or resolved; keep the `MEMORY.md` index in sync with one-line pointers.
   - Syntax: Use noun fragments only in memory bodies, following each memory file's existing frontmatter/type conventions.
4. Save files silently.
5. Output: "Session archived."