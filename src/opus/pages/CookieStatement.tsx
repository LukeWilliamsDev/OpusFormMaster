import React from "react";
import { LegalPageLayout, Section, DataTable } from "../layouts/LegalPageLayout";

/**
 * Internal Cookie Statement for Opus Form Ltd (Concrete Flooring Contractors).
 */
export const CookieStatementPage: React.FC = () => (
  <LegalPageLayout title="Cookie Statement" lastUpdated="September 2026">
    <Section title="1. How we use cookies">
      <p>This explains how we use cookies in our portal.</p>
      <p>
        We do not use marketing cookies, ad trackers, or anything that follows you across the web.
        This is an internal tool, not a public platform.
      </p>
    </Section>

    <Section title="2. What Are Cookies?">
      <p>
        Cookies are small files our system puts on your device when you log in. They help the portal
        work and keep you secure.
      </p>
    </Section>

    <Section title="3. Our Cookies">
      <p>
        We use strictly necessary authentication and security storage for the portal to work. We
        also use preference storage for features such as your selected theme and navigation state;
        that preference storage is not used for advertising or tracking. This page distinguishes
        browser cookies from local storage so the description remains accurate.
      </p>
      <DataTable
        headers={["Cookie Name", "Purpose", "Duration"]}
        rows={[
          [
            "sb-*-auth-token",
            "Authentication token provided by Supabase to verify your identity and keep you securely logged into the portal.",
            "Session / Persistent",
          ],
          [
            "opus_portal_theme (local storage)",
            "Remembers your UI preference, such as light or dark mode.",
            "Until cleared / 1 year",
          ],
          [
            "portal-sidebar-collapsed (local storage)",
            "Remembers whether the internal navigation is collapsed.",
            "Until cleared",
          ],
        ]}
      />
    </Section>

    <Section title="4. Your choices">
      <p>
        Authentication and security storage cannot be disabled without preventing sign-in or secure
        portal functions. Preference storage can be cleared through your browser settings and does
        not contain advertising identifiers. We do not use non-essential tracking cookies.
      </p>
    </Section>

    <Section title="5. Questions?">
      <p>
        Email us:{" "}
        <a
          href="mailto:admin@opusform.co.uk"
          className="underline"
          style={{ color: "var(--primary)" }}
        >
          admin@opusform.co.uk
        </a>
        .
      </p>
    </Section>
  </LegalPageLayout>
);
