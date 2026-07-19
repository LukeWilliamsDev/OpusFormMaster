# Opus Form — Agent Rules

**Source of truth:** Read `.agents/AGENTS.md` at the start of every session — it defines all personas, business context, token conservation rules, planning workflow, and response format in full.

## Critical tool-behavior overrides (read before AGENTS.md)

**Business context:** Opus Form Ltd is a Concrete Flooring Contractor. The app is a proprietary internal workforce management portal — not a commercial SaaS product.

**No dev server, no browser verification:** Never start/run/manage a local dev server (`npm run dev`, `dev.bat`, `localDev.bat`, wrangler dev, etc.) and never open the Browser pane / preview tools to verify changes — this includes screenshots, click-throughs, and navigation. The user runs the app and verifies all changes themselves. This is a standing rule (from `.agents/AGENTS.md` and reconfirmed directly), not per-request — apply it by default, every session, without being asked again.

