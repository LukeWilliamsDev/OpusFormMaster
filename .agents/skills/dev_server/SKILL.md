---
name: dev-server
description: Activates when the user asks to spin up/launch/start/run the dev server, see/open/show the live preview, see how it looks, view the website, preview the page, check the visual UI, or run the local site.
---

# Dev Server & Live Preview Skill

This skill allows the agent to spin up the local development server and guide the user on displaying the live site inside their IDE.

## Execution Flow

1. **Check for Running Servers**:
   - Check if a background task for `dev.bat` or `npm run dev` is already running.
   
2. **Start the Dev Server**:
   - If not already running, execute `dev.bat` in the workspace root (`c:\Users\Luke\Documents\OpusForm`) as a background task using `run_command`.
   - Wait for the server to initialize (usually 2-5 seconds).
   
3. **Determine active Port/URL**:
   - Inspect the logs of the background task to find the local URL (e.g. `http://localhost:8082/`).
   
4. **Display Preview Instructions**:
   - Instruct the user to launch the live preview inside VS Code using the task:
     - Run **`Ctrl+Shift+P`** (or **`Cmd+Shift+P`** on macOS)
     - Select **`Tasks: Run Task`** -> **`Open Live Preview`**
     - Or manually trigger **`Simple Browser: Show`** pointing to the detected URL.
