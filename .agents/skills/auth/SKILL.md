---
name: auth
description: Supabase Auth flows, password resets, session management, and terminology.
---

# Auth Skill

## HARD RULES
- **Terminology**: Always use the term "password recovery" in UI and code instead of "key recovery" or "password reset" when referring to the action of sending a recovery link.
- **Password Recovery Redirection**: When generating password recovery links via Supabase auth, ensure the `redirectTo` URL properly points to the dedicated update-password route in the frontend, preserving any access tokens in the URL fragment.
- **Session Management**: Always retrieve and verify the Supabase session token upon initialization. Do not rely solely on localStorage; verify with the Supabase client (`supabase.auth.getSession()`).
- **Access Tokens**: If an access token is present in the URL hash (e.g., after a magic link or password recovery redirect), immediately set the session using `supabase.auth.setSession()` and clear the URL fragment to prevent token leakage.
- **Auth UI**: Ensure all Auth forms (login, sign up, password recovery) have proper error handling and display user-friendly error messages (e.g., "Invalid credentials" rather than raw Supabase errors).

## PROTOCOL
1. When modifying Auth flows, verify that the redirection URLs match the deployed environment (dev/staging/prod).
2. For password recovery, test that the user receives an email and the link correctly sets the session before prompting for the new password.
3. Ensure no auth tokens or session objects are logged to the console.
