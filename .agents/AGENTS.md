# Workspace Agent Rules

## Dev Server & Browser Policy

- **Automatic Dev Server Boot**: Whenever initiating work on this workspace, verify if the dev server (`scripts/dev.bat`) is active. If not, run `scripts/dev.bat` to boot up the local dev server.
- **Browser Preview**: Ensure Simple Browser is open and directed to `http://localhost:8080/`.
- **Persistent Server Monitoring**: Maintain the dev server running while work is active. If the server or browser is closed, re-launch `scripts/dev.bat` and reopen `http://localhost:8080/`.

## Composio Integration Policy

- **Service Routing**: Always use **Composio** when managing, querying, or integrating with **GitHub**, **Supabase**, **Cloudflare**, **OpenRouter**, or **Resend**.

## Change Assurance Policy

- For every Opus Form create/edit task, follow [the agentic change-assurance loop](../docs/quality/AGENTIC_CHANGE_ASSURANCE.md).
- Create or update one `docs/quality/changes/*.md` contract with observable acceptance criteria before declaring the work complete.
- Run `npm run quality:gate` and perform a fresh, read-only critic pass against the actual diff before marking the contract `READY_FOR_REVIEW`.
- Treat the critic as review evidence, not as approval. Schema, RLS, security, policy, production, and external-service gates still require the named accountable human.
