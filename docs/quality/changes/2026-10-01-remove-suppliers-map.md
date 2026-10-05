# Opus Form change contract — remove supplier proximity feature

**Status:** READY_FOR_REVIEW
**Risk:** low
**Change category:** source | edge-function | dependency | documentation
**Accountable owner:** Opus Form director / named repository reviewer
**Source of truth:** User-approved removal request from 2026-10-01
**Evidence base:** `00891a2ff4734f359497b054314ff30358874d1c`
**Evidence head:** `HEAD`
**Evidence fingerprint:** `5a8ed04b9786ffe393496bb947fa3e01b94c9ec1e8b8d8b572788cb46e6936a7`

## Intent

Remove the currently unused supplier lookup and proximity map from the
operations job detail view, including its unused client, Edge Function, CSS,
and package dependencies.

## Scope

### In scope

- Remove the Suppliers tab and Site Proximity Map from Job Details.
- Remove nearby-supplier lookup/geocoding state and the unused Edge Function.
- Remove Leaflet dependencies and map-specific styles/components.
- Preserve weather, job details, attachments, billing, history, feed, and other tabs.

### Out of scope

- Removing supplier references from company policies or general business copy.
- Changing jobs, map coordinates, weather, RLS, or production data.

### Changed files

- `docs/quality/changes/2026-10-01-remove-suppliers-map.md`
- `package-lock.json`
- `package.json`
- `src/opus/components/JobDetails.tsx`
- `src/opus/components/JobOverviewTab.tsx`
- `src/opus/components/OSMMap.tsx`
- `src/styles.css`
- `supabase/functions/nearby-suppliers/index.ts`

## Acceptance criteria

- [x] `AC-1`: Job Details no longer shows a Suppliers or proximity-map tab or performs nearby-supplier requests — evidence: four-tab Job Details source and no client references.
- [x] `AC-2`: Unused map components, Edge Function, Leaflet dependencies, and map-specific styles are removed — evidence: staged deletion and repository reference search.
- [x] `AC-3`: Weather and all other Job Details tabs remain available and build successfully — evidence: typecheck, tests, and production build.

## Risk and approval gates

- This is a reversible source/dependency removal; no schema, RLS, or production-data changes are in scope.
- The nearby-supplier Edge Function is removed only after all client references are removed.
- Existing role and access boundaries are unchanged; the removed supplier/map path was an operations-only Job Details feature and no field-user route or policy is broadened.
- Human approval required: no — the user directly requested removal of the unused feature.

## Verification evidence

| Check                             | Exact command or evidence                                                | Result                  |
| --------------------------------- | ------------------------------------------------------------------------ | ----------------------- |
| Contract                          | `QUALITY_BASE_REF=origin/main npm run quality:contract -- --staged-only` | PASS pending final gate |
| Unit tests                        | `npm test`                                                               | 141 passed, 1 skipped   |
| Typecheck                         | `npm run typecheck`                                                      | PASS                    |
| Build/dependency validation       | `npm run build`; source/package search for map references                | PASS                    |
| Visual/accessibility verification | Job Details four-tab list with Suppliers removed                         | PASS source review      |

## Critic review

- Critic context/identity: Fresh independent read-only review of feature removal and preserved Job Details paths.
- Review input: final source/dependency diff, tests, typecheck, build, and reference search.
- Verdict: `PASS`
- Findings: One empty-column issue was found and corrected: the remaining four Job Details tabs now use a four-column layout. No blocking findings remain.
- Unresolved blocking findings: `none`
- Repair iterations: `0`

## Release decision

- Automated gate: `PENDING`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty or exception: existing browser sessions may retain an old bundle until refreshed.
