# Secure quote email and final-bill state

## Changes

- Require a valid bearer JWT and `admin`/`dispatcher` profile role before POST processing in `send-quote-pdf` and `send-final-bill`.
- Preserve the intentionally public GET logo route while documenting `verify_jwt = false` as a deliberate route-level setting.
- Pass the final-bill recipient from the client form instead of using a hardcoded test address.
- Save a final-bill draft before sending, let the Edge Function own the post-send state transition, and verify that `sent_at` persisted before returning success.
- Reassert the `job-attachments` bucket as private and remove the legacy unrestricted read policy without changing token-scoped anonymous uploads.
- Add regression coverage for bearer-token parsing and staff-role authorization.

## Verification

- `npm test`: 61 passed, 1 skipped.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Source-only ESLint: 0 errors; existing warnings remain.
- Prettier check on edited TypeScript files: passed.
- Full ESLint requires excluding unrelated untracked `.graphify` generated assets; with those assets excluded, 0 errors and existing warnings remain.

## Deployment status

The production Supabase functions, database, frontend, and email account were not changed. No function was invoked and no test email was sent. The fix is prepared for a coordinated review/deployment.
