import React from "react";
import { LegalPageLayout, Section, DataTable } from "../layouts/LegalPageLayout";

/**
 * UK GDPR-compliant Staff Privacy Notice for Opus Form Ltd (Concrete Flooring Contractors).
 */
export const PrivacyNoticePage: React.FC = () => (
  <LegalPageLayout title="Staff Privacy Notice" lastUpdated="July 2026">
    <Section title="1. Who We Are">
      <p>
        Opus Form Ltd ("<strong style={{ color: "#d4d4d8" }}>we</strong>", "
        <strong style={{ color: "#d4d4d8" }}>us</strong>", "
        <strong style={{ color: "#d4d4d8" }}>our</strong>") is a concrete flooring contractor and the data controller for personal data processed through this internal platform. This notice applies to all staff, contractors, and operatives whose data is managed through our proprietary workforce management portal.
      </p>
      <p>
        <strong style={{ color: "#d4d4d8" }}>Registered Address:</strong> 128 City Road, London,
        England, EC1V 2NX
        <br />
        <strong style={{ color: "#d4d4d8" }}>Company Number:</strong> 17228356
        <br />
        <strong style={{ color: "#d4d4d8" }}>Contact:</strong>{" "}
        <a href="mailto:admin@opusform.co.uk" className="underline" style={{ color: "#6C8295" }}>
          admin@opusform.co.uk
        </a>
      </p>
    </Section>

    <Section title="2. Data We Collect">
      <p>To effectively manage our construction operations and ensure site safety, we collect:</p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li><strong>Identity & Contact:</strong> Name, phone number, email, and emergency contacts.</li>
        <li><strong>Compliance & Right-to-Work:</strong> CSCS card details, CITB training certificates, visa/right-to-work documentation, and driving licenses (if operating company vehicles).</li>
        <li><strong>Operational Data:</strong> Shift allocations, site diary entries, clock-in/out times on flooring jobs, and site logs.</li>
        <li><strong>Technical Data:</strong> IP address, login times, and device information when you access the portal for security auditing.</li>
      </ul>
    </Section>

    <Section title="3. Why We Process Your Data">
      <DataTable
        headers={["Purpose", "Lawful Basis"]}
        rows={[
          ["Scheduling your concrete flooring shifts and site allocations", "Performance of a Contract"],
          ["Verifying your CSCS, training, and right-to-work compliance", "Legal Obligation"],
          ["Maintaining site health & safety records and RAMS acknowledgments", "Legal Obligation"],
          ["Processing your payments/invoices for work completed", "Performance of a Contract"],
          ["Monitoring portal access to prevent unauthorised use", "Legitimate Interests"],
        ]}
      />
    </Section>

    <Section title="4. Sharing Your Data">
      <p>
        We do not sell your data. We only share it with third parties when strictly necessary for our business operations:
      </p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li><strong>Main Contractors:</strong> We may need to share your compliance data (e.g., CSCS numbers) with main contractors to secure your site access.</li>
        <li><strong>Regulatory Bodies:</strong> HSE or HMRC during audits or investigations (e.g., verifying employment or sub-contractor status).</li>
        <li><strong>Service Providers:</strong> Our secure cloud hosting provider (Supabase) where the portal database is physically stored.</li>
      </ul>
    </Section>

    <Section title="5. Data Retention">
      <p>
        We keep your personal data only as long as necessary. Training certificates and right-to-work documentation are kept for the duration of your engagement with us. Site diaries, health and safety records, and payment data are retained for up to 7 years in compliance with UK tax and safety legislation.
      </p>
    </Section>

    <Section title="6. Your Rights">
      <p>Under the UK GDPR, you have the right to:</p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li>Request access to the personal data we hold about you.</li>
        <li>Request correction of inaccurate data (e.g., updating an expired CSCS card).</li>
        <li>Request deletion of your data (subject to our legal obligations to retain H&S records).</li>
        <li>Complain to the Information Commissioner's Office (ICO) if you feel your data has been mishandled.</li>
      </ul>
      <p>
        To exercise these rights, please contact{" "}
        <a href="mailto:admin@opusform.co.uk" className="underline" style={{ color: "#6C8295" }}>
          admin@opusform.co.uk
        </a>
        .
      </p>
    </Section>
  </LegalPageLayout>
);
