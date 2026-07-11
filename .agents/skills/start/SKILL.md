---
name: start
description: Activates when the user issues the /start command to initialize the session, retrieve state, sync with GitHub, and generate a session readiness report.
---

# Workflow: /start

This command initializes the pair-programming session and synchronizes the local workspace.

## 1. Initial State Retrieval
- **Identity & Rules**: Read `OpusFormManifesto.md` (or `ANTIGRAVITY_AGENT_MANIFESTO.md` if present) in the project root to re-initialize your identity, design constraints, and operational rules.
- **Project History**: Read `MEMORY.md` to understand the cumulative history, architecture, and current state of the project.
- **Unfinished Business**: Read `RECAP.md` for the most recent session's unfinished business and unresolved issues.

## 2. Environment Synchronization
- **GitHub Sync**: Use the GitHub MCP Server (or command-line git tools if available) to fetch and pull the latest commits from the development branch (e.g. `git pull origin dev`) to ensure local alignment with remote changes.
- **Sanity Check**: Verify that `PortalContext.tsx` and core layout files (such as `PortalLayout.tsx` or `App.tsx`) are accessible in the project workspace.

## 3. Session Readiness Report
Once synchronization is complete, output a structured report using this template:
> **SESSION INITIALIZED**
> - **Build Status:** [Version/Commit ID]
> - **Last Session Goal:** [Summary of previous session's active goal from RECAP.md]
> - **Critical Open Issues:** [Top 3 unresolved items from MEMORY.MD]
> - **Current Priority:** [What are we solving for today?]
