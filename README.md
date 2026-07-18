# Opus Form

Internal workforce management portal for **Opus Form Ltd**, a concrete flooring contractor. Used to manage operatives, jobs, quotes, and compliance documentation — not a public-facing product.

## Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React 19 + TanStack Router) on [Vite](https://vitejs.dev/)
- **Styling:** Tailwind CSS v4 + Radix UI primitives
- **Backend:** [Supabase](https://supabase.com/) (Postgres, Auth, RLS, Edge Functions)
- **Deployment:** Cloudflare Workers (via Wrangler)
- **Package manager:** [Bun](https://bun.sh/)

## Getting started

```bash
bun install
bun run dev       # start the dev server
bun run build      # production build
bun run test       # run vitest
bun run lint        # eslint
```

Environment variables live in `.env` (not committed) — see Supabase project settings for the required keys.

## Project structure

```
src/
  opus/            Application code: pages, components, hooks, layouts, context
    pages/         Route-level screens (Dashboard, JobLedger, PortalAuth, Settings, ...)
    components/    Feature components (e.g. QuoteInvoiceBuilder)
  components/       Shared/design-system UI (shadcn-style + Radix wrappers)
  integrations/     Generated Supabase client + types
  routes/           TanStack Router route tree
supabase/
  functions/        Deno edge functions (email sending, PDF dispatch, alerts)
  migrations/        SQL schema migrations
policies/            Legal/compliance policy PDFs
docs/                Project documentation
```

## Key features

- **Job Ledger & Pipeline** — track jobs and quote status end to end
- **Quote/Invoice Builder** — generates client-facing PDF quotes (`html2pdf.js`, rendered from a live on-screen mirror) and emails them via a Supabase edge function
- **Labor Roster & Credential Portal** — operative records and compliance document submission
- **Audit Log** — tracked actions across the portal
- **Policy pages** — Terms, Privacy Notice, Acceptable Use, Modern Slavery Statement, Cookie Statement

## Development notes

- Do **not** run a local dev server for the assistant to preview — changes are verified manually in the browser by the developer.
- Multi-file or schema-touching changes go through an approval step; see `.agents/AGENTS.md` for the full agent workflow and available personas.
- Branch naming is case-sensitive on the remote — the working branch is `dev` (lowercase); avoid creating a `Dev` duplicate, especially from a Windows machine where local branch names collide case-insensitively.
