# Opus Form — Agent Rules

**Source of truth:** Read `.agents/AGENTS.md` at the start of every session — it defines all personas, business context, token conservation rules, planning workflow, and response format in full.

## Critical tool-behavior overrides (read before AGENTS.md)

**Business context:** Opus Form Ltd is a Concrete Flooring Contractor. The app is a proprietary internal workforce management portal — not a commercial SaaS product.

**NEVER start a dev server.** Do not run `npm run dev`, `dev.bat`, `localDev.bat`, `wrangler dev`, or any local server. Do not trigger automated page previews or browser tooling. The user verifies all changes manually in their browser.
