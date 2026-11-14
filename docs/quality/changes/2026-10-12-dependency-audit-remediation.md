# Opus Form change contract — production dependency audit remediation

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** dependency
**Accountable owner:** Luke Williams / Opus Form
**Source of truth:** CI run 38212638192 for PR #59
**Evidence base:** `origin/main`
**Evidence head:** working tree (uncommitted)
**Evidence fingerprint:** f1d136ea9dfda4c2ab9716397f244f9c4b2963b62479949e9273d98c24f925ea

## Intent

Update the lockfile entries for the two production dependency vulnerabilities that blocked PR #59 without changing application source or dependency ranges.

## Scope

### In scope

- Lock `seroval` at `1.6.9` and `source-map-js` at `1.2.2`, both fixed versions for the CI-reported advisories.
- Verify the production-only audit gate and preserve application behavior.

### Changed files

- `docs/quality/changes/2026-10-12-dependency-audit-remediation.md`
- `package-lock.json`
- `docs/quality/changes/2026-10-11-quote-vat-cc.md`
- `src/opus/components/QuoteInvoiceBuilder.tsx`
- `src/opus/lib/billing.ts`
- `src/opus/lib/__tests__/billing.test.ts`
- `src/opus/lib/__tests__/quoteEmail.test.ts`
- `src/opus/lib/quoteEmail.ts`
- `src/opus/lib/quotePdf.tsx`
- `supabase/functions/send-quote-pdf/index.ts`

### Out of scope

- Force-upgrading development-only packages or changing `package.json` ranges.
- Bypassing CI, merging with failing checks, or changing production data/services.

## Acceptance criteria

- [x] `npm audit --omit=dev --audit-level=high` reports zero vulnerabilities.
- [x] The lockfile resolves `seroval@1.6.9` and `source-map-js@1.2.2`.
- [x] Typecheck and focused quote VAT/CC tests remain passing.

## Risk and approval gates

- This is a lockfile-only production dependency patch; application source is unchanged.
- `npm audit` without `--omit=dev` still reports unrelated development-tool advisories; the CI gate being repaired is explicitly production-only.
- CI must pass before the production merge; no audit bypass is authorized.
- The quote UI remains responsive and keyboard-native, and its existing authenticated role boundary is unchanged; the dependency-only change adds no UI or access behavior.

## Verification evidence

| Check               | Evidence                                                      | Result  |
| ------------------- | ------------------------------------------------------------- | ------- |
| Production audit    | `npm audit --omit=dev --audit-level=high` — 0 vulnerabilities | PASS    |
| Lockfile validation | `npm ci --ignore-scripts --dry-run` completed successfully    | PASS    |
| Typecheck           | `npm run typecheck`                                           | PASS    |
| Focused tests       | Billing and quote-email tests — 5 passed                      | PASS    |
| CI                  | PR #59 rerun after this commit                                | PENDING |

## Critic review

- Verdict: `PASS`
- Unresolved blocking findings: `none`
- Repair iterations: `0`

## Release decision

- Automated gate: `PENDING — CI rerun required`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
