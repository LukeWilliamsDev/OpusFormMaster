---
name: end
description: Activates when the user issues the /end command to compile RECAP.md, perform the smart merge to MEMORY.md, and output the confirmation message.
---

# Workflow: /end

## 1. Summarization
- Audit the current session and summarize the progress made against the active goal.
- Extract the current state of the **Labor Roster** (key shifts, deployments).
- Identify any "dangling" issues, bugs, or technical debt introduced or uncovered in this session.

## 2. Memory Lifecycle Execution

### A. Update `RECAP.md` (Daily Buffer)
- Append the new timestamped session entry (detailing achievements, roster status, and blockers) to `RECAP.md` in the project root.

### B. Commit to `CHANGELOG.md` (Permanent Archive)
- Read the current system date.
- Read `CHANGELOG.md`.
- Compare the current date with the date of the last entry in `CHANGELOG.md`.
- **Date Mismatch (New Day):** 
  1. Create a new `### [YYYY-MM-DD]` section in `CHANGELOG.md`.
  2. Copy the full content of `RECAP.md` into this new section.
  3. Clear the contents of `RECAP.md` to prepare for the new day's work.
- **Date Match (Same Day):**
  1. Simply append the new session recap directly under the existing `### [YYYY-MM-DD]` section in `CHANGELOG.md`.

### C. Smart Merge to `MEMORY.md` (Long-Term Brain)
- Review `MEMORY.md` from the project root.
- Ensure the primary state, database configurations, and active directories are updated to match the current architectural status of the codebase.

## 3. Closing
- Save all updated files (`RECAP.md`, `CHANGELOG.md`, `MEMORY.md`) to the workspace root.
- Output: `"Session summary archived to RECAP.md, CHANGELOG.md updated, and MEMORY.MD updated."`