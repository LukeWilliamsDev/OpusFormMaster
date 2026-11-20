# Opus Form change contract — job media compression and video uploads

**Status:** READY_FOR_REVIEW
**Risk:** medium
**Change category:** media-storage
**Accountable owner:** Luke Williams / Opus Form
**Source of truth:** current Opus Form job/site media requirements
**Evidence base:** working tree review and repository validation
**Evidence head:** working tree (uncommitted)
**Evidence fingerprint:** b7ba581379283dc5bf0b79df9aeeb9ab2cf9cbd69efe12b91df584e9990db514
## Intent

Reduce ordinary site-photo storage without degrading evidence records, and add
bounded MP4/WebM uploads for job/site media with the same existing tenant and
audience boundaries.

## Scope

### In scope

- Re-encode ordinary JPEG photos at 90% quality and cap oversized photos at a
  2,560 px longest edge when the result is smaller.
- Leave PNGs, certificates, compliance documents, and certificate-check evidence
  as original uploads.
- Permit MP4/WebM job/site media up to 100 MB and render it in the existing
  before/after media views with signed URLs.
- Update the job and third-party attachment bucket limits and MIME allowlist.

### Changed files

- `docs/quality/changes/2026-11-19-job-media-video-and-compression.md`
- `src/opus/components/JobDetails.tsx`
- `src/opus/components/MediaTab.tsx`
- `src/opus/lib/compressImage.ts`
- `src/opus/pages/ForemanSitePage.tsx`
- `src/opus/pages/ForemanWorkspace.tsx`
- `src/opus/pages/ThirdPartySitePage.tsx`
- `supabase/migrations/20261119123000_enable_job_media_video_uploads.sql`

### Out of scope

- Video transcoding, server-generated thumbnails, or browser-side video
  recompression.
- Compression or format changes for compliance/certificate evidence.
- Applying the migration to live Supabase or deploying the application.

## Acceptance criteria

- [x] JPEG site media uses the shared 2,560 px / 90% policy and falls back to
      the original when compression is not beneficial.
- [x] PNGs and evidence upload paths retain their original files.
- [x] Job/site media controls accept MP4/WebM and reject unsupported video types.
- [x] Job/site media displays video thumbnails and signed playback controls.
- [x] The migration raises the relevant bucket limit to 100 MB and allows only
      MP4/WebM as new video MIME types.
- [x] Existing automated tests, typecheck, lint, and production build pass.

## Risk and approval gates

- The migration changes Storage bucket limits and MIME configuration but does
  not broaden RLS, tenant, role, or signed-URL access policies.
- The 100 MB limit is per object; job-level aggregate limits remain in place.
- Live migration application and deployment require the normal human release
  approval and rollback plan.

## Verification evidence

| Check | Evidence | Result |
| --- | --- | --- |
| Tests | `npm test` — 187 passed, 1 skipped | PASS |
| Typecheck | `npm run typecheck` | PASS |
| Targeted lint | Changed application files; 0 errors, existing warnings only | PASS |
| Build | `npm run build` | PASS |
| Diff hygiene | `git diff --check` | PASS |
| Live migration | Not applied | PENDING |

## Critic review

- Verdict: `PASS`
- Unresolved blocking findings: `none`
- Repair iterations: `1` (corrected third-party document validation and limit copy)

## Release decision

- Automated gate: `PASS — local validation complete`
- Release status: `READY_FOR_HUMAN_APPROVAL`
- Human approval: `PENDING`
