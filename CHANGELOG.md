# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-07-23

### Security & Hardening
- Patched package vulnerability in `dompurify` via `npm audit fix`.
- Applied HTTP security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy`) across Cloudflare hosting configuration (`public/_headers`) and Vite dev/preview server settings (`vite.config.ts`).
- Created initial `COMPLIANCE_AUDIT.md` technical baseline report.

### Quality & Refactoring
- Refactored `auditDiff.ts` utility function parameter types to strict `Record<string, unknown>`.
