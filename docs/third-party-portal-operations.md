# Third-party portal early-production operations

## Automated smoke test

Run the live smoke test manually with:

```bash
THIRD_PARTY_SMOKE_EMAIL='test account email' \
THIRD_PARTY_SMOKE_PASSWORD='test account password' \
npm run smoke:third-party
```

The test checks login, Home, Help, Contact IT, Legal & Privacy, a policy PDF, and the legacy sites-route redirect. It does not submit a contact request, upload a file, or modify portal data.

GitHub Actions runs the same check hourly and can also be started with **Run workflow**. Configure these repository secrets before relying on the scheduled result:

- `THIRD_PARTY_SMOKE_EMAIL`
- `THIRD_PARTY_SMOKE_PASSWORD`

Use a dedicated, least-privileged test account. Never use a real customer's credentials.

## When a smoke test fails

1. Check whether the failure is a deployment, authentication, Supabase, or Cloudflare problem.
2. Open the failed workflow output and identify the first failing route or HTTP response.
3. If the release caused the failure, roll back the Cloudflare Worker to the last known-good version.
4. Record the incident, affected route, start/end time, and corrective change.
5. Re-run the smoke test before announcing recovery.

The smoke test is an early warning system, not a replacement for a full user acceptance test. It deliberately avoids write operations.
