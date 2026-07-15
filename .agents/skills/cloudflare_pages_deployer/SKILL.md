---
name: cloudflare-pages-deployer
description: Edge API routes compiling (Pages Functions), wrangler bindings, redirects.
---

# Cloudflare Pages Deployer Agent Skill

## HARD RULES
- Write edge-compatible, lightweight V8 engine code (avoid node-specific APIs unless using `nodejs_compat`).
- Run code compilation and local tests in isolated, ephemeral environments.
- Verify redirect and header mappings inside the final build assets output (e.g. `public/_headers`).

## EXECUTION PROTOCOL
1. **Develop Functions**: Ensure all endpoint handlers under `functions/` or pages edge layouts are lightweight and compile correctly under Wrangler.
2. **Setup Dev Runner**: Start local server testing using wrangler pages dev server sidecar.
3. **Verify Output**: Build and confirm that assets compile cleanly to the designated distribution folders.
