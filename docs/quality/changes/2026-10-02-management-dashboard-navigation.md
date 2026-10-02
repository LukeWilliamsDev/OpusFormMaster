# Opus Form change contract — management dashboard and navigation

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** source
**Accountable owner:** Luke Williams / Opus Form
**Source of truth:** User-approved dashboard direction and rendered desktop/tablet/mobile mockups from 2026-10-02
**Evidence base:** `d813e11` (current production main)
**Evidence head:** working tree
**Evidence fingerprint:** `2a7cb2d638e9292b44fad45bab843e5039e72100016782caf5c07cb35e5f1bfa`

## Intent

Replace the management dashboard's duplicated navigation and dense operations catalogue with a calm, attention-first home surface that meets the Foreman and Third Party quality bar while preserving existing management role and tenant boundaries.

## Scope

### In scope

- Management dashboard hierarchy, redundant shortcut removal, actionable attention items, current operations summary, and honest shared data states.
- Responsive management navigation using the approved Overview, Jobs, Schedule, Staff, and More mobile model.
- Removal of duplicate primary destinations from the Third Party More drawer.
- Semantic keyboard-accessible dashboard links and controls where touched.
- A development-only mock-data preview when Supabase client configuration is absent, without weakening production authentication.
- Preservation of the existing admin/director audit route and tenant/role boundaries while restoring the dashboard source.
- Focused tests and repository quality evidence for the changed behavior.

### Out of scope

- Database schema, RLS policy, migration, production deployment, or external service changes.
- Redesign of Foreman or Third Party content beyond navigation de-duplication required by this change.
- Changing management role permissions or expanding labourer access.
- Replacing the full Job Ledger, Calendar, Staff, Quotes, or Certificate Checker workflows.

### Changed files

- `src/opus/pages/Dashboard.tsx`
- `src/opus/pages/DashboardPreview.tsx`
- `src/opus/App.tsx`
- `src/opus/layouts/PortalLayout.tsx`
- `src/opus/components/ShiftResponses.tsx`
- `docs/quality/changes/2026-10-02-management-dashboard-navigation.md`

## Acceptance criteria

- [x] `AC-1`: The management dashboard has a clear page identity and purpose before utility search.
- [x] `AC-2`: Generic dashboard shortcut tiles duplicating sidebar/bottom-navigation destinations are removed.
- [x] `AC-3`: Actionable attention items appear before current operations and link to real, role-allowed destinations.
- [x] `AC-4`: Current operations show concise active/upcoming site information without duplicating the full calendar or ledger.
- [x] `AC-5`: Management dashboard consumes shared loading, error, refresh, and retry states without presenting failed data as empty data.
- [x] `AC-6`: Management mobile/tablet navigation uses the approved Overview, Jobs, Schedule, Staff, and More structure without obscuring content; desktop navigation remains complete and role-aware.
- [x] `AC-7`: Third Party primary bottom-navigation destinations are not duplicated in its More drawer.
- [x] `AC-8`: Dashboard navigation/search interactions are semantic and keyboard-operable, with honest labels and selected state where applicable.
- [x] `AC-9`: Existing compliance reminder behavior remains available and audit attribution is not broadened or silently changed by this UI refactor.
- [x] `AC-10`: Compliance reminder audit records the authenticated actor rather than a fixed identity, with the change verified by code inspection and role-appropriate acceptance evidence.
- [x] `AC-11`: No route guard, tenant boundary, restricted-role access rule, or completed/read-only behavior is weakened.
- [x] `AC-12`: Lint, formatting, typecheck, tests, production build, bundle budget, and the repository quality gate pass, or each exception is recorded with its exact reason.
- [x] `AC-13`: A fresh read-only critic reviews the actual diff and records no unresolved blocking or major findings.
- [x] `AC-14`: The development-only mock-data preview loads at the local preview URL without Supabase configuration and is excluded from production behavior.
- [x] `AC-15`: Restoring the dashboard does not weaken the existing admin/director audit route or other role and tenant boundaries — evidence: merged `App.tsx`/`PortalLayout.tsx` review and focused critic.

## Risk and approval gates

- This is a medium-risk UI and navigation change because it affects multiple roles, responsive fixed navigation, and direct action discoverability.
- Existing `RoleGuard` route protection remains authoritative; hidden navigation is not treated as access control.
- Dashboard data remains tenant/RLS-scoped. No direct Supabase management, migration, or production action is authorized.
- The user approved the rendered visual direction on 2026-10-02. Release, merge, deployment, and live authenticated acceptance remain separate human gates.
- Human approval required: yes — accountable owner must review the final implementation and validation evidence before release.

## Verification evidence

| Check                 | Exact command or evidence                             | Result                                                                                                        |
| --------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Contract              | `npm run quality:contract`                            | PASS — final contract validation                                                                              |
| Deterministic checks  | `npm run quality:gate`                                | PASS — lint (warnings only), format, typecheck, 162 tests with 1 skipped, production build, and bundle budget |
| Manual/external check | Rendered approved mockups and local responsive review | COMPLETE; mock preview smoke-tested locally; authenticated multi-role runtime remains unavailable             |

## Critic review

- Critic context/identity: fresh read-only critic pass `task_34` on the restored dashboard and current audit release base
- Review input: actual working-tree diff, this contract, approved mockups, and repository assurance rules
- Verdict: `PASS`
- Findings: No blocking or major findings remain. Authenticated runtime acceptance remains an explicit human gate.
- Unresolved blocking findings: `none`
- Repair iterations: `3`

## Release decision

- Automated gate: `PASS` — current-base quality gate passed with only the existing lint warnings.
- Release status: `NOT_RELEASED`
- Human approval: `PENDING`
- Residual uncertainty or exception: authenticated multi-role browser acceptance and deployment provenance remain outside this local implementation pass.
