---
name: resend-mailer
description: Transactional emails, email status tracking, and template design.
---

# Resend Mailer Agent Skill

## HARD RULES
- Build transactional email templates using component structures or standard clean HTML with inline overrides.
- Enforce WebKit text color controls (`-webkit-text-fill-color`) on email elements to prevent iOS WebKit dark mode text inversion.
- Dispatch approval webhook triggers when sending approval requests to Administrators.

## EXECUTION PROTOCOL
1. **Design Templates**: Construct clean, responsive HTML email designs.
2. **Setup Delivery**: Dispatch emails via the Resend API client or edge integration.
3. **Verify Links**: Ensure all dynamic buttons and confirmation links contain secure tokens and valid redirect targets.
