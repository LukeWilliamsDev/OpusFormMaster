# Full-Stack Security & Compliance Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Perform an autonomous full-stack security and compliance audit, patch vulnerabilities and code quality issues, enforce security headers, and generate compliance artifacts.

**Architecture:** Update npm dependencies for security vulnerabilities, configure Vite/Cloudflare HTTP security headers, resolve linting/type warnings, write ISO 9001 compliance logs, and commit to `agent-audit-fixes`.

**Tech Stack:** React 19, TypeScript, Vite, TailwindCSS, Supabase, Cloudflare Wrangler, Vitest, ESLint.

## Global Constraints
- Must maintain 100% clean builds (`npm run build`, `npm run typecheck`, `npm run test`).
- All changes committed to branch `agent-audit-fixes`.

---

### Task 1: Security & Cyber Essentials Baseline Patching

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `public/_headers`
- Modify: `vite.config.ts`

- [ ] **Step 1: Run npm audit fix**
Run: `npm audit fix`
Expected: Vulnerabilities fixed, DOMPurify updated.

- [ ] **Step 2: Add HTTP Security Headers configuration**
Create `public/_headers` with:
```text
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: wss:;
```

- [ ] **Step 3: Update Vite config for preview security headers**
Modify `vite.config.ts` to attach headers to dev/preview servers:
```ts
headers: {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}
```

- [ ] **Step 4: Verify build and tests**
Run: `npm run build && npm run test`

---

### Task 2: Code Quality & Best Practices Cleanup

**Files:**
- Modify: `src/opus/utils/auditDiff.ts`
- Modify: `supabase/functions/nearby-suppliers/index.ts`
- Modify: `src/opus/pages/JobUploadPortal.tsx`

- [ ] **Step 1: Fix explicit any types in auditDiff.ts**
Update function parameter typing from `any` to `Record<string, unknown>`.

- [ ] **Step 2: Run linter and typecheck**
Run: `npm run lint && npm run typecheck`

---

### Task 3: Compliance Documentation & Git Branch Delivery

**Files:**
- Create: `COMPLIANCE_AUDIT.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Create COMPLIANCE_AUDIT.md**
Document audit findings, dependency status, security headers applied, and test results.

- [ ] **Step 2: Update CHANGELOG.md**
Add audit entry under `[Unreleased]`.

- [ ] **Step 3: Create git branch agent-audit-fixes and commit**
Run: `git checkout -b agent-audit-fixes && git add . && git commit -m "chore: full-stack security and compliance audit fixes"`
