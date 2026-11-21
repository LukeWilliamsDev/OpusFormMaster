# Opus Form change contract — staff dossier site assignments

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** source
**Accountable owner:** Opus Form director / named repository reviewer
**Source of truth:** User request in this conversation
**Evidence base:** `origin/main`
**Evidence head:** working tree (uncommitted)
**Evidence fingerprint:** adc6118662467734386d3112e93cb4f001081af51c9f44e610853f5842494782

## Intent

Add a second, equivalent entry point for management users to assign the open staff
record to an active site from its **Site Assignments** tab.

## Scope

### In scope

- Staff dossier Site Assignments date selection and active-site picker.
- Existing compliance/conflict validation, reallocation confirmation, and audit path.
- Refresh of the dossier assignment list after scheduling mutations.

### Out of scope

- Assignment permissions, shift storage, RLS, schema, site eligibility rules, or
  calendar behavior.
- Production data, deployment, or external-service actions.

### Changed files

- `docs/quality/changes/2026-11-20-staff-dossier-site-assignments.md`
- `src/opus/hooks/useShiftActions.ts`
- `src/opus/components/RosterView.tsx`

## Acceptance criteria

- [x] `AC-1`: A management user can choose a date and open an active-site picker from
      a staff dossier's Site Assignments tab.
- [x] `AC-2`: The picker assigns the selected staff member through the existing shift
      action path, including compliance validation and audit logging.
- [x] `AC-3`: A same-day conflict uses the existing reallocation confirmation rather
      than silently creating a second assignment.
- [x] `AC-4`: The dossier list refreshes after an assignment/reallocation and retains
      loading, empty, and history states.
- [x] `AC-5`: Non-management users do not receive the new write control.
- [x] `AC-6`: Focused checks and the repository quality gate pass.

## Risk and approval gates

- This writes scheduling data through existing role-gated client mutations; no
  authorization or tenant boundary is changed.
- ISO `YYYY-MM-DD` values remain the persisted schedule date format.
- Human approval remains pending. No live Supabase, production, deployment, or
  external-service verification is claimed.

## Verification evidence

| Check                                         | Exact command or evidence                                                                              | Result |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------ |
| Typecheck                                     | `npm run typecheck`                                                                                    | PASS   |
| Focused tests                                 | `npm test` — 179 passed, 1 skipped                                                                     | PASS   |
| Lint                                          | `npm run lint` — 0 errors, existing warnings                                                           | PASS   |
| Visual/responsive/accessibility source review | Management-only control, native date input, responsive flex layout, keyboard-native buttons and picker | PASS   |
| Quality gate                                  | `npm run quality:gate`                                                                                 | PASS   |
| Diff review                                   | Fresh read-only critic against final diff                                                              | PASS   |

## Critic review

- Critic context/identity: Fresh independent read-only review by a separate critic context after repair.
- Review input: final source diff, this contract, and verification output.
- Verdict: `PASS`
- Findings: Two minor observations remain: dossier history refetches on any shift-state change;
  historical reallocation deletes the old row asynchronously. Neither blocks this reversible
  workflow, and both are bounded by the existing refresh/error paths.
- Unresolved blocking findings: `none`
- Repair iterations: `1` (complete dossier conflict history and historical-row deletion)

## Release decision

- Automated gate: `PASS`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty: browser acceptance and authenticated role acceptance remain
  for the named reviewer after implementation review.
