// @ts-nocheck
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
        This Portal Usage Policy governs the use of the Opus Form workforce management portal by
        employees, contractors, and operatives of{" "}
        <strong style={{ color: "var(--foreground)" }}>Opus Form Ltd</strong> (Company No.
        17228356). Opus Form Ltd is a concrete flooring contractor, and this portal is a proprietary
        internal company tool built to manage our own construction operations. It is not a
        commercial SaaS agreement.
      </p>
      <p>
        By accessing the portal, you confirm that you have read and understood this policy and agree
        to abide by its terms as a condition of your engagement with the company.
      </p>
    </Section>

    <Section title="2. Portal Purpose">
      <p>The Opus Form portal is an internal business tool providing:</p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li>Staff roster and shift scheduling management</li>
        <li>Compliance document tracking and verification (CSCS, certificates)</li>
        <li>Job ledger, project tracking, and site operations</li>
        <li>Quote and invoice generation</li>
        <li>Audit trail and activity logging</li>
      </ul>
      <p>
        The portal is for authorised internal use only. It is not a public service and is not
        available for external subscription.
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
        Your use of the portal must comply with our{" "}
        <a href="#/portal/acceptable-use" className="underline" style={{ color: "var(--primary)" }}>
          Acceptable Use Policy
        </a>
        . Misuse of the portal may result in disciplinary action up to and including termination of
        your engagement with the company.
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
        While we aim to keep the portal available at all times, we may need to take it offline for
        maintenance, updates, or security patches. We will provide reasonable notice where
        practicable, but emergency maintenance may occur without prior notification.
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
