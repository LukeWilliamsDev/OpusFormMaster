# CLAUDE.md

**Quick-start guide for Claude Code - Complete details in linked docs**

---

## Project Overview

Opus Form — ERP portal for labor/compliance management (Supabase-backed SPA). Full architecture in [docs/system_rundown.md](docs/system_rundown.md).

**Tech Stack**: React 19 + TypeScript, TanStack Start/Router (root) + react-router-dom (portal sub-routes), Vite, TailwindCSS, Supabase (Postgres + RLS + Deno edge functions), Vitest.

---

## Session Start Protocol ⚡

**MANDATORY** at start of each session:

```bash
✓ .claude/COMMON_MISTAKES.md      # ⚠️ CRITICAL - Read FIRST
✓ .claude/QUICK_START.md          # Essential commands
✓ .claude/ARCHITECTURE_MAP.md     # File locations
```

**At task completion:**

- Create completion doc in `.claude/completions/YYYY-MM-DD-task-name.md`
- Move session file to `.claude/sessions/archive/` (if created)

**⚠️ NEVER auto-load:**

- Files in `.claude/completions/` (0 token cost)
- Files in `.claude/sessions/` (0 token cost)
- Files in `docs/archive/` (0 token cost)

---

## Quick Start Commands

```bash
npm run dev      # vite dev server
npm run test     # vitest run
npm run build    # production build
npm run lint     # eslint
npm run format   # prettier --write
```

---

**Last Updated**: 2026-07-22
