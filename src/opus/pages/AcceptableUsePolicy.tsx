import React from "react";
import { LegalPageLayout, Section } from "../layouts/LegalPageLayout";

/**
 * Internal Acceptable Use Policy for Opus Form Ltd (Concrete Flooring Contractors).
 */
export const AcceptableUsePolicyPage: React.FC = () => (
  <LegalPageLayout title="Acceptable Use Policy" lastUpdated="July 2026">
    <Section title="1. Purpose">
      <p>
        These are our rules for using the portal. It's for managing shifts, sites, and projects.
      </p>
      <p>Breaking these rules can get you suspended or fired.</p>
    </Section>

    <Section title="2. What You Can Use It For">
      <p>You can:</p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li>Viewing your assigned shifts, site locations, and project briefs.</li>
        <li>
          Submitting and verifying compliance documents (e.g., CSCS cards, training certificates).
        </li>
        <li>Logging site diaries, health and safety reports, and near-misses.</li>
        <li>Accessing company policies, risk assessments, and method statements (RAMS).</li>
      </ul>
    </Section>

    <Section title="3. Don't Do This">
      <p>Don't:</p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li>Sharing your login credentials with anyone, including colleagues or site managers.</li>
        <li>
          Attempting to access data, shift patterns, or compliance records belonging to other
          operatives.
        </li>
        <li>Uploading false, expired, or modified compliance documents.</li>
        <li>Using the portal to store or transmit malicious software.</li>
        <li>
          Accessing the portal on shared or public devices without properly logging out immediately
          after use.
        </li>
      </ul>
    </Section>

    <Section title="4. Keep Your Data Accurate">
      <p>
        The info you enter affects site safety. Your right-to-work docs, training, and diary entries
        need to be accurate. Fake compliance docs break the law.
      </p>
    </Section>

    <Section title="5. We Log Everything">
      <p>We track who logs in, when, and what they upload. If we spot misuse, we investigate.</p>
    </Section>

    <Section title="6. Problems?">
      <p>
        Tell us right away if something's broken or your account is compromised:{" "}
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
