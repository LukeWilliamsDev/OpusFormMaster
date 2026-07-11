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
1. **Update `RECAP.md` (Daily Buffer)**: Append a new, timestamped entry for the current session (detailing achievements, roster updates, and blockers) to the top of `RECAP.md`.
2. **Commit to `CHANGELOG.md` (Permanent Archive)**:
   - Read the system date.
   - Check the date of the last entry in `CHANGELOG.md`.
   - If the current date is new: Create a `### [YYYY-MM-DD]` header in `CHANGELOG.md`, move all content from the daily buffer (`RECAP.md`) to this section, and clear `RECAP.md`.
   - If the date matches, append the new session recap directly under the existing `### [YYYY-MM-DD]` section.
3. **Smart Merge to `MEMORY.md` (Long-Term Brain)**: Reflect the current architectural state, database refactoring, and directory structure changes in `MEMORY.md` to keep the project memory current.
4. **Finalize**: Confirm the updates:
   - `"Session summary archived to RECAP.md, CHANGELOG.md updated, and MEMORY.MD updated."`

