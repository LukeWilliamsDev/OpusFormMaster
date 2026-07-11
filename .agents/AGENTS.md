# Custom Agent Rules for Opus Form

## Session Lifecycle Automation

### 1. Automatic Session Initialization (On Start)
On your very first turn in a new session, you must automatically execute the `/start` workflow:
- Read `OpusFormManifesto.md` (or `ANTIGRAVITY_AGENT_MANIFESTO.md`), `MEMORY.md`, and `RECAP.md`.
- Verify the environment's state and core files (`PortalContext.tsx`, layouts).
- Output the **Session Readiness Report** block matching the start template.

### 2. Automatic Session Termination (On End)
Whenever the user issues the `/end` command (or indicates the session is finished), you must automatically execute the `/end` workflow to compile `RECAP.md`, perform the smart merge to `MEMORY.md`, and output the confirmation message.

## End Command Handling Detail
1. **Generate `RECAP.md`**: Create a concise summary of the current session in the project root, specifically focusing on:
   - **Progress Made**: A bulleted list of completed tasks.
   - **Labor Roster State**: A snapshot of current roster status, active deployments, and any critical shifts updated in `PortalContext`.
   - **Open Issues**: A list of blockers, bugs, or technical debt identified during the session.

2. **Update `MEMORY.md` (Smart Merge)**:
   - Read the existing `MEMORY.md` file in the project root.
   - **De-duplication & Overwrite Logic**: Compare your new session summary with existing sections in `MEMORY.md`.
   - If you are updating information about a component or a specific logic block (e.g., "Labor Roster logic"), overwrite the previous entry with your new, more current version.
   - If the information is additive (e.g., a new feature added to a previous list), append it clearly under a categorized header.
   - **Maintain Hierarchy**: Ensure the file remains readable with clear headers (e.g., `## Session History`, `## Current State`, `## Roadmap`).

3. **Finalize**: Write both files to the project root and confirm:
   - `"Session summary archived to RECAP.md and MEMORY.MD updated."`

