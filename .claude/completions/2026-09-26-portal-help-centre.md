# In-portal help centre

Added an authenticated `/portal/help` page with responsive, task-based guidance for third-party portal users.

Included:

- Quick-start checklist.
- Expandable guidance for staff, assigned sites, notes/files, and mobile use.
- Status glossary and account-safety reminders.
- Support-information checklist for reporting problems.
- Desktop and mobile navigation links labelled `Help & Guidance`.
- Existing PDF guide available as an optional download at `/guides/third-party-portal-user-guide.pdf`.

Validation: the changed files pass ESLint; `npm run build` completes successfully.

## Staging verification

The existing `third-party-test@staging.invalid` account was confirmed against the verified staging project. Local preview configuration was corrected to that project, `third_party` was added to the client role model and post-login routing, and internal staff/jobs/shifts/calendar loading and autosave were explicitly skipped for third-party accounts. A browser test completed login and reached `/portal/help` with no HTTP errors.

## Contact form

Added a signed-in contact form to `/portal/help` and a role-restricted `send-portal-help-request` edge function. It sends to `luke@opusform.co.uk`, uses the signed-in account as `reply_to`, validates subject/message lengths, escapes message HTML, and rejects anonymous/non-third-party callers. The function is deployed to the verified staging project; an anonymous smoke test correctly returned `401 Unauthorized`. A real email was not sent during smoke testing.

The form now lives on its own `/portal/contact` page. Help & Guidance links to it, and Contact IT is available separately in desktop and mobile navigation. The separate page was browser-tested at mobile width.

The contact page now refers only to **IT** in the user-facing copy. Legal & Privacy was also consolidated into one policy grid: online policies use one `Read online` action and downloadable policies use one `Download PDF` action, with the duplicate second download section removed.

Added the dedicated third-party portal surface for the existing `third_party` role: responsive Home, Staff, Assigned Sites, and Site Detail screens with the approved Manchester test data and separate third-party navigation. Login now routes third-party users to `/portal/third-party`, and browser checks confirmed Home, Staff, Sites, and Site Detail routes render without HTTP errors.
