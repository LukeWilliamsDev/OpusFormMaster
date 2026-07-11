# Changelog

### [2026-07-11]

#### Session 1
- **Git & Environment Setup:** Installed Git via winget on Windows and initialized the local repository tracking `Dev` branch of `opus-form-builder`.
- **Legacy Cleanup:** Deleted the unused legacy component `src/opus/components/Dashboard.tsx` to clean up the codebase.
- **Standalone Supabase Configuration:** Configured `.env` and `supabase/config.toml` to point to the standalone project ref `fgpthpxmiroyebrzjdzo`.
- **Database Migration:** Sequentially applied all 6 migration SQL files to the standalone database.
- **User Provisioning:** Created 4 admin accounts (`roya@optusform.co.uk`, `liam@optusform.co.uk`, `anais@optusform.co.uk`, `admin@optusform.co.uk`) with shared password `Swithers123` and promoted them to the `admin` role.
- **GitHub Sync:** Staged, committed, and pushed all setup modifications back to the remote `Dev` branch.

#### Session 2
- **Reverted Views:** Dropped the `user_directory` view and deleted its migration file as requested by the user.
- **Memory Lifecycle Integration:** Updated `.agents/AGENTS.md` and `.agents/skills/end/SKILL.md` to implement the `Memory Lifecycle` system.
- **User Provisioning Verification:** Confirmed logins are active and roles updated for all four new administrators.

#### Session 3
- **PDF Generation Integration:** Installed `html2pdf.js` and wired client-side PDF rendering for quote summaries.
- **Vite Styling fixes:** Resolved `html2canvas` canvas parsing crash caused by modern Tailwind `oklch()` variables by programmatically cloning the target A4 node and sanitizing CSS definitions synchronously.
- **Layout & Zoom Isolation:** Fixed page boundaries, margins, and blank overflow pages in generated PDFs by isolating elements in a hidden container to prevent active preview transform calculations from leaking.
- **Resend SMTP API Migration:** Replaced the Nodemailer SMTP server transport with a standard HTTP-based Resend API client to bypass IONOS rate-limiting and anti-bot blocks.
- **Secure Key Database Storage:** Configured secure settings storage in `public.smtp_config` database table with RLS protections, allowing the Edge Function to pull keys dynamically without manual deployment changes.
