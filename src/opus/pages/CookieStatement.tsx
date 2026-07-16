import React from "react";
import { LegalPageLayout, Section, DataTable } from "../layouts/LegalPageLayout";

/**
 * Internal Cookie Statement for Opus Form Ltd (Concrete Flooring Contractors).
 */
export const CookieStatementPage: React.FC = () => (
  <LegalPageLayout title="Cookie Statement" lastUpdated="July 2026">
    <Section title="1. Introduction">
      <p>
        This Cookie Statement explains how Opus Form Ltd uses cookies and similar technologies on our internal workforce management portal.
      </p>
      <p>
        Because this portal is a proprietary internal tool used strictly for managing our concrete flooring operations and operatives, we do <strong>not</strong> use any marketing, advertising, or cross-site tracking cookies.
      </p>
    </Section>

    <Section title="2. What are Cookies?">
      <p>
        Cookies are small text files placed on your device when you access the portal. They are widely used to make web applications work, or work more efficiently, as well as to provide security.
      </p>
    </Section>

    <Section title="3. How We Use Cookies">
      <p>
        We only use <strong>Strictly Necessary Cookies</strong>. These are essential for the portal to function properly and cannot be switched off in our systems. They are usually only set in response to actions made by you, such as logging in or filling in forms (e.g., submitting site diaries or compliance certificates).
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

    <Section title="4. Managing Cookies">
      <p>
        Because the cookies we use are strictly necessary for the secure operation of the portal, there is no option to opt-out. If you set your browser to block or alert you about these cookies, parts of the portal (such as viewing your shift roster or uploading your CSCS card) will not work.
      </p>
    </Section>

    <Section title="5. Contact">
      <p>
        If you have any questions about this statement or how we manage security on the portal, please contact{" "}
        <a href="mailto:admin@opusform.co.uk" className="underline" style={{ color: "#6C8295" }}>
          admin@opusform.co.uk
        </a>
        .
      </p>
    </Section>
  </LegalPageLayout>
);
