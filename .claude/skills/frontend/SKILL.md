---
name: frontend
description: UI components, UX, PDF export layouts, and transactional email templates under the Dark Industrial design system.
---

# Frontend Skill

## HARD RULES
- Dark Industrial palette only — no new colour tokens.
- Typography: 8px–12px dense sizing, uppercase labels, `tracking-wider`; zero horizontal scrolling; mobile-first.
- Lock PDF export frames to exactly 794px × 1122px (A4).
- Before html2pdf rendering: clone the DOM and strip `oklch()` / `lch()` / `lab()` — replace with hex fallbacks (html2canvas crashes on them).
- Emails: clean HTML with inline styles; set `-webkit-text-fill-color` to prevent iOS dark-mode text inversion; send via the `send-quote-pdf` edge function (Resend API), not SMTP.
- Feature proposals must evaluate mobile usability, RLS compatibility, and aesthetic fit.

## PROTOCOL
1. Build under `src/components/`; benchmark layouts against Jobber, Monday.com, Stripe dashboards.
2. Reporting UIs go in `src/components/reports/`; quote/PDF templates in `src/components/quotes/`.
3. Verify email links carry secure tokens and valid redirect targets.
4. Flag any design-system violations in a `VIOLATIONS` block before output.
