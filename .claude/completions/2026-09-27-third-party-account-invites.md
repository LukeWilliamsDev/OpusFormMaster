---
title: Third-party account invitations
date: 2026-09-27
---

# Third-party account invitations

## Implemented

- Allowed the trusted `admin-create-user` function to invite accounts with the existing `third_party` account role.
- Allowed the trusted `admin-manage-user` function to update accounts to or from `third_party`.
- Restricted account invitation and management to active `admin` and `director` accounts.
- Changed the duplicate-account error from staff-specific wording to account wording.
- Displayed human-readable role labels in the new-account selector.

## Deliberate boundary

The user administration surface is restricted to active `admin` and `director` accounts. Third-party content access remains separately scoped by the existing `third_party_staff_access` and row-level-security rules; creating an account does not automatically grant access to every job or staff record.

## Validation

- TypeScript check: passed.
- Diff whitespace check: passed.
- Full ESLint: existing unrelated formatting errors remain in `send-portal-help-request/index.ts`; no new errors were introduced by these changes.

## Release gate

Deploy the updated edge functions together with the already-existing third-party role/portal migrations, then test: administrator invite → email password setup → third-party portal redirect → assigned-content visibility → denied unassigned-content visibility.
