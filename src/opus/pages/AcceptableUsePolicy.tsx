import React from "react";
import { LegalPageLayout, Section } from "../layouts/LegalPageLayout";

/**
 * Internal Acceptable Use Policy for Opus Form Ltd (Concrete Flooring Contractors).
 */
export const AcceptableUsePolicyPage: React.FC = () => (
  <LegalPageLayout title="Acceptable Use Policy" lastUpdated="July 2026">
    <Section title="1. Purpose">
      <p>
        This Acceptable Use Policy outlines the rules and guidelines for using the Opus Form internal workforce portal. Opus Form Ltd is a concrete flooring contractor, and this portal is provided strictly for managing our site operatives, subcontractors, and construction projects.
      </p>
      <p>
        By accessing the portal, you agree to comply with this policy. Failure to do so may result in the suspension of your access and disciplinary action.
      </p>
    </Section>

    <Section title="2. Permitted Use">
      <p>The portal is provided exclusively for the following purposes:</p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li>Viewing your assigned shifts, site locations, and project briefs.</li>
        <li>Submitting and verifying compliance documents (e.g., CSCS cards, training certificates).</li>
        <li>Logging site diaries, health and safety reports, and near-misses.</li>
        <li>Accessing company policies, risk assessments, and method statements (RAMS).</li>
      </ul>
    </Section>

    <Section title="3. Prohibited Activities">
      <p>When using the portal, you must strictly avoid the following:</p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li>Sharing your login credentials with anyone, including colleagues or site managers.</li>
        <li>Attempting to access data, shift patterns, or compliance records belonging to other operatives.</li>
        <li>Uploading false, expired, or modified compliance documents.</li>
        <li>Using the portal to store or transmit malicious software.</li>
        <li>Accessing the portal on shared or public devices without properly logging out immediately after use.</li>
      </ul>
    </Section>

    <Section title="4. Data Accuracy on Site">
      <p>
        As a concrete flooring operative or subcontractor, the information you provide in this portal directly impacts health and safety on site. You must ensure that all right-to-work, training, and site diary information is strictly accurate. Falsifying compliance data is a serious breach of health and safety regulations.
      </p>
    </Section>

    <Section title="5. System Monitoring">
      <p>
        To ensure the security of our internal operations, Opus Form Ltd maintains detailed audit logs of all portal activity. This includes logging IP addresses, login times, and document uploads. Misuse detected during routine audits will be investigated by management.
      </p>
    </Section>

    <Section title="6. Contact">
      <p>
        If you experience technical issues or suspect unauthorised access to your account, please immediately inform the office at{" "}
        <a href="mailto:admin@opusform.co.uk" className="underline" style={{ color: "var(--primary)" }}>
          admin@opusform.co.uk
        </a>
        .
      </p>
    </Section>
  </LegalPageLayout>
);
