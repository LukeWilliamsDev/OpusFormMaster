import React from "react";
import { LegalPageLayout, Section } from "../layouts/LegalPageLayout";

/**
 * Internal Portal Usage Policy for Opus Form Ltd.
 * Not a SaaS T&C — this governs how internal staff use the company portal.
 * Governed by the laws of England & Wales.
 */
export const TermsOfServicePage: React.FC = () => (
  <LegalPageLayout title="Portal Usage Policy" lastUpdated="July 2026">
    <Section title="1. About This Policy">
      <p>
        This policy covers how Opus Form Ltd employees, contractors, and operatives use our internal
        shift and project management system. It's not a commercial agreement — it's our house rules.
      </p>
      <p>
        By using the portal, you agree to follow this policy. That's part of working here.
      </p>
    </Section>

    <Section title="2. Portal Purpose">
      <p>Our system handles:</p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li>Shift schedules and rosters</li>
        <li>Compliance document checks (CSCS, certs)</li>
        <li>Job tracking and site logging</li>
        <li>Quotes and invoices</li>
        <li>Activity logs for security</li>
      </ul>
      <p>
        It's staff only. Not public, not for sale.
      </p>
    </Section>

    <Section title="3. Access & Credentials">
      <p>Portal access is provided by a company administrator. You are responsible for:</p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li>Keeping your login credentials confidential — never share them with anyone</li>
        <li>All activity that occurs under your account during an authenticated session</li>
        <li>Logging out when using shared or site-based devices</li>
        <li>
          Reporting any suspected unauthorised access immediately to{" "}
          <a
            href="mailto:admin@opusform.co.uk"
            className="underline"
            style={{ color: "var(--primary)" }}
          >
            admin@opusform.co.uk
          </a>
        </li>
      </ul>
    </Section>

    <Section title="4. Acceptable Use">
      <p>
        Follow our{" "}
        <a href="#/portal/acceptable-use" className="underline" style={{ color: "var(--primary)" }}>
          Acceptable Use Policy
        </a>
        . Misuse can get you fired.
      </p>
    </Section>

    <Section title="5. Data & Accuracy">
      <p>
        You are responsible for ensuring that any data you enter into the portal is accurate,
        complete, and up to date. This includes:
      </p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li>Your personal contact details (email, phone)</li>
        <li>Compliance documents (CSCS cards, certificates) — must be genuine and current</li>
        <li>Shift records and site diary entries</li>
      </ul>
      <p>
        Entering false or misleading information, particularly regarding compliance certificates, is
        a serious breach and may have legal consequences under health and safety legislation.
      </p>
    </Section>

    <Section title="6. Data Protection">
      <p>
        How we handle your personal data is governed by our{" "}
        <a href="#/privacy" className="underline" style={{ color: "var(--primary)" }}>
          Staff Privacy Notice
        </a>
        , which forms part of this policy. By using the portal, you acknowledge that you have read
        and understood the Privacy Notice.
      </p>
    </Section>

    <Section title="7. Intellectual Property">
      <p>
        The portal software, design, and documentation are the property of Opus Form Ltd. You must
        not copy, modify, distribute, or reverse-engineer any part of the portal without written
        authorisation from a company director.
      </p>
    </Section>

    <Section title="8. Availability">
      <p>
        We'll give you notice when we do maintenance. Emergency fixes might happen without warning.
      </p>
    </Section>

    <Section title="9. Termination of Access">
      <p>
        Your access to the portal will be revoked when your engagement with Opus Form Ltd ends, or
        if you breach this policy. Upon termination of access, your data will be retained in
        accordance with the retention periods set out in the{" "}
        <a href="#/privacy" className="underline" style={{ color: "var(--primary)" }}>
          Staff Privacy Notice
        </a>
        .
      </p>
    </Section>

    <Section title="10. Governing Law">
      <p>
        This policy is governed by and construed in accordance with the laws of{" "}
        <strong style={{ color: "var(--foreground)" }}>England and Wales</strong>.
      </p>
    </Section>

    <Section title="11. Contact">
      <p>
        For questions about this policy, contact{" "}
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
