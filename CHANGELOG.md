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

#### Session 4
- **Quote Builder UI/UX Refinement:** Integrated smooth step-based slide transitions using Framer Motion (`motion/react`) when switching stepper pages.
- **Searchable Concrete Autocomplete:** Embedded item suggestions for pours, rebar mesh, shuttering, pumps, and day rates that pre-fill description, unit, and standard rate parameters.
- **Integrated Dark Workspace Layout:** Redesigned the Live Mirror preview viewport frame (`bg-[#131417] border-[#2e2e2e]`) to merge seamlessly with the dark industrial user interface theme, and centered the page card vertically.
- **Duplicate Send Prompt Removal:** Streamlined the workflow by removing the duplicate bottom nav bar send button, driving emailing transactions exclusively through the step 3 \"Authorize & Send\" card.
- **Strict Form Validation Check:** Implemented strict controls that validate client name, email, project name, site postcode, line items list, and terms and conditions. Added a custom animated overlay modal dialog to report validation failures directly on the page instead of native browser popups.
- **Single-page Pixel-Perfect PDF Export:** Renamed the printer button to \"Save PDF\", mapped `jsPDF` custom formats directly to canvas pixel boundaries (`[794, 1122]`), and reset browser body margin styles during capture to prevent whitespaces and blank second page overflows.
- **Drafts-Only Local Storage:** Excluded sent quotes from the local storage drafts database and automatically purged draft records upon a successful send transaction.

#### Session 5
- **Edge Function Variables Concatenation:** Converted email HTML template assembly to standard string concatenation, completely resolving escaped template variable parsing issues under Deno bundler pipelines.
- **Self-Hosted Public Logo Endpoint:** Configured a GET handler on `send-quote-pdf` to serve the SVG logo and redeployed the function with `verify_jwt: false`, bypassing private repository authentication barriers so email clients can render the header logo.
- **iOS WebKit Color Inversion Bypass:** Applied inline `-webkit-text-fill-color` CSS declarations to all email text nodes, preventing iOS Mail and Gmail App from inverting white text to dark-on-dark in dark mode.
- **PDF Capitalization Normalization:** Removed native `uppercase` text formatting on the Client Name and Project fields and added a Title Case words capitalizer to render formatted casing.
- **Custom UI Banner Alerts:** Replaced native browser alerts with custom animated success and failure toast overlays, prompting contacts to `admin@opusform.co.uk` upon send failures.
