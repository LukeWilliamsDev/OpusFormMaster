---
name: finance-validator
description: Invoicing validation, tax computations, and Stripe hook responses.
---

# Finance Validator Agent Skill

## HARD RULES
- Always verify Stripe webhook payloads using signing secrets.
- Enforce Human-in-the-Loop (HITL) State Suspension for refunds, invoice cancellations, or destructive financial adjustments (flag status as `PENDING_APPROVAL`).
- Enforce precise, double-entry validation on all tax/CIS/DRC computations.

## EXECUTION PROTOCOL
1. **Payload Verification**: Check cryptographic signatures on all incoming billing hooks.
2. **State Suspension**: If a destructive action is initiated, freeze the record and fire approval alerts.
3. **Double-Entry Check**: Validate that invoice subtotals + tax values exactly match the overall totals in minor-unit calculations.
