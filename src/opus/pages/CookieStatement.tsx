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
        We only use essential cookies. You cannot turn them off because the portal will not work
        without them. We set them when you do things like log in or upload docs.
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
            "opus-portal-theme",
            "Remembers your UI preferences (e.g., dark mode settings) for the internal portal.",
            "1 Year",
          ],
        ]}
      />
    </Section>

    <Section title="4. Essential cookies">
      <p>
        These cookies are essential. If you block them in your browser, you won't be able to log in
        or upload documents.
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
