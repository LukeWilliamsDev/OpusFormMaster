---
name: end
description: Activates when the user issues the /end command to compile RECAP.md, perform the smart merge to MEMORY.md, and output the confirmation message.
---

# Workflow: /end

## 1. Summarization
- Audit the current session and summarize the progress made against the active goal.
- Extract the current state of the **Labor Roster** (key shifts, deployments).
- Identify any "dangling" issues, bugs, or technical debt introduced or uncovered in this session.

## 2. RECAP.md Generation
- Write the summary to `RECAP.md` in the project root. This file should be fresh for the next session.

## 3. MEMORY.MD Smart Merge
- Read `MEMORY.MD` from the root.
- **Compare:** Check if the information in the new session summary is similar to existing modules in `MEMORY.MD`.
- **Merge/Overwrite:** If the new information is more current, **overwrite** the older block. If it is entirely new, **append** it under the correct module header.
- **Timestamp:** Add a `### Last Updated: [Timestamp]` entry at the top of modified blocks.

## 4. Closing
- Save all changes to the file system.
- Output: "Session summary archived to `RECAP.md` and `MEMORY.MD` updated. Opus Form state is preserved."