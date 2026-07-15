// @ts-nocheck
import React from "react";
import { LegalPageLayout, Section } from "../layouts/LegalPageLayout";

/**
 * Acceptable Use Policy for Opus Form.
 * Defines prohibited activities and user responsibilities.
 */
export const AcceptableUsePolicyPage: React.FC = () => (
  <LegalPageLayout title="Acceptable Use Policy" lastUpdated="July 2026">
    <Section title="1. Purpose">
      <p>
        This Acceptable Use Policy ("<strong style={{ color: "#d4d4d8" }}>AUP</strong>") sets out
        the rules governing your use of the Opus Form Ltd internal workforce management portal. It
        supplements our{" "}
        <a href="#/portal/terms" className="underline" style={{ color: "#6C8295" }}>
          Portal Usage Policy
        </a>{" "}
        and applies to all employees, contractors, and operatives with portal access.
      </p>
    </Section>

    <Section title="2. Prohibited Activities">
      <p>You must not:</p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li>
          Attempt to gain unauthorised access to any part of the Service, other users' accounts, or
          connected systems
        </li>
        <li>
          Use the Service to store, distribute, or transmit malicious software (malware, viruses,
          trojans)
        </li>
        <li>
          Scrape, harvest, or extract data from the Service by automated means without prior written
          consent
        </li>
        <li>Upload fraudulent, forged, or misleading compliance documents</li>
        <li>Share your login credentials with any other person</li>
        <li>
          Attempt to circumvent security controls, Row-Level Security policies, or role-based access
          restrictions
        </li>
        <li>
          Use the Service for any purpose that is unlawful under the laws of England and Wales
        </li>
        <li>Overload, disrupt, or interfere with the performance or availability of the Service</li>
        <li>Reverse-engineer, decompile, or disassemble any part of the Service's software</li>
      </ul>
    </Section>

    <Section title="3. Account Responsibilities">
      <p>You are responsible for:</p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li>All activity conducted through your authenticated session</li>
        <li>Logging out of shared or public devices after use</li>
        <li>
          Reporting any suspected security incident or unauthorised access to{" "}
          <a href="mailto:admin@opusform.co.uk" className="underline" style={{ color: "#6C8295" }}>
            admin@opusform.co.uk
          </a>{" "}
          immediately
        </li>
        <li>
          Ensuring compliance documents you upload are genuine, current, and accurately represent
          your qualifications
        </li>
      </ul>
    </Section>

    <Section title="4. Data Handling">
      <p>When using the Service, you must:</p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li>
          Only access data that your role permits — do not attempt to access other users' records
        </li>
        <li>
          Not export, copy, or share personal data from the Service except as authorised by an
          administrator
        </li>
        <li>
          Handle any personal data you access in accordance with the UK General Data Protection
          Regulation (UK GDPR)
        </li>
        <li>Report any data breach or suspected data breach immediately</li>
      </ul>
    </Section>

    <Section title="5. Reporting Violations">
      <p>
        If you become aware of any violation of this AUP, or suspect that the Service is being
        misused, report it to{" "}
        <a href="mailto:admin@opusform.co.uk" className="underline" style={{ color: "#6C8295" }}>
          admin@opusform.co.uk
        </a>
        . All reports are taken seriously and will be investigated.
      </p>
    </Section>

    <Section title="6. Consequences of Breach">
      <p>Violations of this AUP may result in:</p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li>Temporary or permanent suspension of your account</li>
        <li>Removal of content or data you have uploaded</li>
        <li>Notification to relevant authorities if criminal activity is suspected</li>
        <li>Legal action to recover damages or enforce compliance</li>
      </ul>
      <p>
        We reserve the right to investigate suspected violations and to take any action we deem
        appropriate, including cooperation with law enforcement agencies.
      </p>
    </Section>

    <Section title="7. Changes to This Policy">
      <p>
        We may update this AUP from time to time. Changes will be communicated via the portal.
        Continued use of the Service after changes take effect constitutes acceptance of the revised
        policy.
      </p>
    </Section>
  </LegalPageLayout>
);
