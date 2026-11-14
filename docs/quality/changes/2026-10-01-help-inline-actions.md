# Opus Form change contract — Help inline actions

**Status:** READY_FOR_REVIEW
**Risk:** low
**Change category:** source | documentation
**Accountable owner:** Opus Form director / named repository reviewer
**Source of truth:** User-approved Help interaction refinement from 2026-10-01
**Evidence base:** `4c7e83a4454268a513cfe5c5f6af51e6fa4e1bca`
**Evidence head:** `HEAD`
**Evidence fingerprint:** `8bf620b4b65d430278b33415dade326a3d24ad6f4025db8dd88bc0079179844f`

## Intent

Make Help instructions read as continuous tasks by placing destination links
inside the sentence they complete instead of rendering detached action buttons.

## Scope

### In scope

- Replace standalone Help action buttons with inline, keyboard-accessible action links.
- Apply the pattern to Home, Staff, Sites, and Foreman Today guidance.
- Preserve existing destinations, role-specific copy, and support routing.

### Out of scope

- Changing Help topics, portal routes, permissions, or support recipients.

### Changed files

- `docs/quality/changes/2026-10-01-help-inline-actions.md`
- `src/opus/pages/PortalHelp.tsx`

## Acceptance criteria

- [x] `AC-1`: Help action links are integrated into the relevant instruction sentences rather than separate buttons — evidence: inline Home, Staff, Sites, and Today links.
- [x] `AC-2`: Existing Help destinations remain unchanged and links retain visible focus states — evidence: unchanged route targets, native links, and focus rings.
- [x] `AC-3`: Help remains readable and usable on mobile and desktop — evidence: responsive source review and independent critic.

## Risk and approval gates

- This is a low-risk, reversible copy/link presentation change only.
- Human approval required: no — the user directly requested this refinement.

## Verification evidence

| Check                             | Exact command or evidence                                                | Result                  |
| --------------------------------- | ------------------------------------------------------------------------ | ----------------------- |
| Contract                          | `QUALITY_BASE_REF=origin/main npm run quality:contract -- --staged-only` | PASS pending final gate |
| Unit tests                        | `npm test`                                                               | 141 passed, 1 skipped   |
| Typecheck                         | `npm run typecheck`                                                      | PASS                    |
| Visual/accessibility verification | Help accordion source review and inline-link focus/mobile review         | PASS                    |

## Critic review

- Critic context/identity: Fresh independent read-only review of inline Help actions.
- Review input: final source diff, typecheck, tests, and visual/accessibility evidence.
- Verdict: `PASS`
- Findings: No blocking findings. Detached action buttons were removed, routes remain unchanged, and inline links retain visible keyboard focus.
- Unresolved blocking findings: `none`
- Repair iterations: `0`

## Release decision

- Automated gate: `PENDING`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
- Residual uncertainty or exception: no known exception.
