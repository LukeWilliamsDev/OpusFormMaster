// @ts-nocheck
import React from "react";
import { LegalPageLayout, Section, DataTable } from "../layouts/LegalPageLayout";

/**
 * UK GDPR-compliant Staff Privacy Notice.
 * Internal use — Opus Form Ltd (Company No. 17228356).
 * Covers Articles 13 & 14 — identity, purposes, lawful bases, retention,
 * third-party processors, international transfers, and data subject rights.
 */
export const PrivacyNoticePage: React.FC = () => (
  <LegalPageLayout title="Staff Privacy Notice" lastUpdated="July 2026">
    <Section title="1. Who We Are">
      <p>
        Opus Form Ltd ("<strong style={{ color: "#d4d4d8" }}>we</strong>", "
        <strong style={{ color: "#d4d4d8" }}>us</strong>", "
        <strong style={{ color: "#d4d4d8" }}>our</strong>") is the data controller for personal data
        processed through this platform. This notice applies to all staff, contractors, and
        operatives whose data is managed through our internal workforce management portal.
      </p>
      <p>
        <strong style={{ color: "#d4d4d8" }}>Registered Address:</strong> 128 City Road, London,
        England, EC1V 2NX
        <br />
        <strong style={{ color: "#d4d4d8" }}>Company Number:</strong> 17228356
        <br />
        <strong style={{ color: "#d4d4d8" }}>ICO Registration:</strong> Pending — registration in
        progress
        <br />
        <strong style={{ color: "#d4d4d8" }}>Contact:</strong>{" "}
        <a href="mailto:admin@opusform.co.uk" className="underline" style={{ color: "#6C8295" }}>
          admin@opusform.co.uk
        </a>
      </p>
    </Section>

    <Section title="2. What Data We Collect & Why">
      <p>
        We process personal data to manage staff engagements, comply with health and safety
        legislation, and operate our construction workforce management platform.
      </p>
      <DataTable
        headers={["Data Category", "Examples", "Lawful Basis", "Why"]}
        rows={[
          [
            "Staff identity & contact",
            "Name, email, phone, role",
            "Contract (Art. 6(1)(b))",
            "Necessary to manage your engagement with us",
          ],
          [
            "Location data",
            "Staff postcode, job site postcode",
            "Legitimate Interest (Art. 6(1)(f))",
            "Proximity-based scheduling optimisation",
          ],
          [
            "Compliance documents",
            "CSCS cards, certificates, right-to-work",
            "Legal Obligation (Art. 6(1)(c))",
            "CDM Regulations 2015, H&S at Work Act 1974",
          ],
          [
            "Shift & assignment history",
            "Dates, job allocations, attendance",
            "Legitimate Interest (Art. 6(1)(f))",
            "Business operations and workforce planning",
          ],
          [
            "Audit & security logs",
            "Login times, data changes, IP metadata",
            "Legitimate Interest (Art. 6(1)(f))",
            "Security monitoring and regulatory compliance",
          ],
          [
            "Client commercial data",
            "Names, companies, quote/invoice amounts",
            "Contract (Art. 6(1)(b))",
            "Fulfilling commercial contracts",
          ],
        ]}
      />
    </Section>

    <Section title="3. How Long We Keep Your Data">
      <p>
        We retain personal data only for as long as necessary. After the retention period, records
        are flagged for review and deleted by an administrator — data is never auto-purged without
        human confirmation.
      </p>
      <DataTable
        headers={["Data Type", "Retention Period", "Legal Basis"]}
        rows={[
          ["Staff records", "6 years after end of engagement", "Limitation Act 1980"],
          ["Compliance documents", "6 years after last engagement", "CDM Regulations 2015"],
          ["Quotes & invoices", "7 years after creation", "HMRC tax record requirements"],
          ["Audit & security logs", "2 years after creation", "Industry best practice"],
        ]}
      />
    </Section>

    <Section title="4. Who We Share Data With">
      <p>
        We use the following third-party service providers to operate our platform. We do not sell
        your personal data to any third party.
      </p>
      <DataTable
        headers={["Provider", "Purpose", "Location", "Transfer Safeguard"]}
        rows={[
          [
            "Supabase Inc.",
            "Database, authentication, file storage",
            "EU (Frankfurt)",
            "UK adequacy decision",
          ],
          [
            "Cloudflare Inc.",
            "Website hosting and content delivery",
            "Global CDN",
            "DPA with Standard Contractual Clauses",
          ],
          [
            "Resend Inc.",
            "Transactional email delivery",
            "United States",
            "DPA with UK IDTA / Standard Contractual Clauses",
          ],
          [
            "postcodes.io",
            "UK postcode geocoding",
            "United Kingdom",
            "No personal data transferred — postcodes only",
          ],
        ]}
      />
    </Section>

    <Section title="5. Your Rights Under UK GDPR">
      <p>
        Under the UK General Data Protection Regulation and Data Protection Act 2018, you have the
        right to:
      </p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li>
          <strong style={{ color: "#d4d4d8" }}>Access</strong> — request a copy of all personal data
          we hold about you (Subject Access Request)
        </li>
        <li>
          <strong style={{ color: "#d4d4d8" }}>Rectification</strong> — ask us to correct inaccurate
          data
        </li>
        <li>
          <strong style={{ color: "#d4d4d8" }}>Erasure</strong> — ask us to delete your data
          (subject to legal retention obligations)
        </li>
        <li>
          <strong style={{ color: "#d4d4d8" }}>Portability</strong> — receive your data in a
          machine-readable format
        </li>
        <li>
          <strong style={{ color: "#d4d4d8" }}>Objection</strong> — object to processing based on
          Legitimate Interest
        </li>
        <li>
          <strong style={{ color: "#d4d4d8" }}>Restriction</strong> — request that we limit how we
          use your data
        </li>
      </ul>
      <p>
        To exercise any of these rights, contact us at{" "}
        <a href="mailto:admin@opusform.co.uk" className="underline" style={{ color: "#6C8295" }}>
          admin@opusform.co.uk
        </a>
        . We will respond within <strong style={{ color: "#d4d4d8" }}>30 calendar days</strong> as
        required by the ICO.
      </p>
    </Section>

    <Section title="6. Cookies & Local Storage">
      <p>
        This platform uses{" "}
        <strong style={{ color: "#d4d4d8" }}>essential authentication tokens only</strong>, stored
        in your browser's localStorage by Supabase Auth. These are strictly necessary for the
        service to function and are exempt from consent requirements under the Privacy and
        Electronic Communications Regulations 2003 (PECR).
      </p>
      <p>
        We do not use analytics cookies, advertising trackers, or any third-party tracking
        technologies.
      </p>
      <p>
        For more details, see our{" "}
        <a href="#/cookies" className="underline" style={{ color: "#6C8295" }}>
          Cookie Statement
        </a>
        .
      </p>
    </Section>

    <Section title="7. Data Security">
      <p>We protect your data using:</p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li>
          Row-Level Security (RLS) policies enforcing least-privilege access at database level
        </li>
        <li>Role-Based Access Control (RBAC) with privilege escalation prevention</li>
        <li>Encrypted connections (TLS/HTTPS) for all data in transit</li>
        <li>Supabase Vault for secure credential storage — no secrets in application code</li>
        <li>Content Security Policy (CSP) and security headers</li>
        <li>Time-limited signed URLs (60-second expiry) for private file access</li>
        <li>Comprehensive audit logging of all data access and modifications</li>
      </ul>
    </Section>

    <Section title="8. Complaints">
      <p>
        If you are dissatisfied with how we handle your data, you have the right to lodge a
        complaint with the UK Information Commissioner's Office (ICO):
      </p>
      <p>
        <strong style={{ color: "#d4d4d8" }}>Website:</strong>{" "}
        <a
          href="https://ico.org.uk/make-a-complaint/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
          style={{ color: "#6C8295" }}
        >
          ico.org.uk/make-a-complaint
        </a>
        <br />
        <strong style={{ color: "#d4d4d8" }}>Phone:</strong> 0303 123 1113
      </p>
    </Section>

    <Section title="9. Changes to This Notice">
      <p>
        We may update this Privacy Notice from time to time. Material changes will be communicated
        via the portal. The "Last Updated" date at the top of this page indicates when it was last
        revised.
      </p>
    </Section>
  </LegalPageLayout>
);
