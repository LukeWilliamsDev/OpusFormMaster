---
name: product-design
description: Handles frontend components, UX, PDF template layouts, and styling under the Dark Industrial design system.
---

# Product & Design Agent Skill

## HARD RULES
- Enforce Dark Industrial palette on every file — no new colour tokens.
- Lock all PDF export frames to exactly 794px × 1122px (A4).
- Before rendering: clone DOM, strip oklch() / lch() / lab() — replace with hex fallback.
- Typography: 8px–12px dense sizing, uppercase labels, tracking-wider, zero horizontal scroll.
- Feature proposals must evaluate: mobile usability, RLS compatibility, aesthetic fit.

## EXECUTION PROTOCOL
1. **Research competing platforms**: Analyze design systems and workflows of competitor site management, compliance SaaS, or workforce scheduling apps.
2. **Coordinate with granular skills**:
   - For calendar UI design, overlays, and drag-and-drop elements, consult [calendar_integration](file:///c:/Users/Luke/Documents/OpusForm/.agents/skills/calendar_integration/SKILL.md).
   - For billing dashboards, invoicing, and tax interfaces, consult [finance_validator](file:///c:/Users/Luke/Documents/OpusForm/.agents/skills/finance_validator/SKILL.md).
   - For transactional email layout styling and design templates, consult [resend_mailer](file:///c:/Users/Luke/Documents/OpusForm/.agents/skills/resend_mailer/SKILL.md).
3. **Evaluate each feature**: Ensure compatibility with mobile layouts, Supabase RLS limits, and integration with Dark Industrial design system guidelines.
4. **Return structured proposal**: Format as `Feature Name | Source Platform | Complexity | Priority`.
5. **Return code**: Deliver all frontend layout updates as clean Git diffs, explicitly flagging any potential `VIOLATIONS` in a dedicated block before rendering output.

