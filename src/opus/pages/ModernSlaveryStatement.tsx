import React from "react";
import { LegalPageLayout, Section } from "../layouts/LegalPageLayout";

/**
 * Voluntary Modern Slavery and Illegal Working Statement for Opus Form Ltd.
 * Demonstrates best practices for compliance even though turnover is < £36m.
 */
export const ModernSlaveryStatementPage: React.FC = () => (
  <LegalPageLayout
    title="Modern Slavery and Illegal Working Statement"
    lastUpdated="September 2026"
  >
    <Section title="1. Our Stance">
      <p>
        We oppose modern slavery and trafficking in everything we do. We expect the same standards
        throughout our supply chain.
      </p>
      <p>
        Whether a statement is required depends on the organisation's current worldwide turnover,
        structure, and the statutory criteria in force at the time. This statement is published as a
        voluntary control unless those criteria require a formal statement. It is reviewed when the
        business or the law changes.
      </p>
    </Section>

    <Section title="2. What We Do">
      <p>
        We provide concrete flooring services across the UK. We engage staff and contractors, buy
        materials, and rent equipment for our jobs.
      </p>
      <p>
        We use subcontractors and labour agencies, so we recognise the modern slavery risks in the
        construction sector and work to reduce them.
      </p>
    </Section>

    <Section title="3. Our Policy">
      <p>
        We won't tolerate slavery, trafficking, or unlawful working. Illegal working and modern
        slavery are related but separate compliance risks, and one check does not prove that forced
        labour is absent. We deal fairly with everyone.
      </p>
      <p>
        Our detailed operational requirements are set out in our Right to Work Policy. A tax
        reference, CIS number, UTR or CSCS card is not accepted as proof of a right to work.
      </p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li>
          <strong>Right to Work Verification:</strong> We strictly verify the identity and right to
          work of all our direct employees and contractors before they commence work with us.
        </li>
        <li>
          <strong>Software Safeguards:</strong> Our software portal includes features designed to
          assist our clients in verifying compliance documents (such as CSCS cards) for their
          operatives, indirectly supporting wider industry efforts to combat illegal working.
        </li>
      </ul>
    </Section>

    <Section title="4. How We Check">
      <p>We:</p>
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li>Evaluate the modern slavery risks of any new major suppliers.</li>
        <li>
          Expect our suppliers to have suitable anti-slavery and human trafficking policies and
          processes.
        </li>
        <li>
          Prioritise worker safety, preserve evidence, escalate concerns, and consider remediation,
          suspension, termination, or referral to the appropriate authorities where a concern is
          identified.
        </li>
      </ul>
    </Section>

    <Section title="5. Tell Us If You See Something">
      <p>If you see slavery or illegal hiring in our business or with our suppliers, tell us:</p>
      <p>
        <a
          href="mailto:admin@opusform.co.uk"
          className="underline"
          style={{ color: "var(--primary)" }}
        >
          admin@opusform.co.uk
        </a>
      </p>
    </Section>

    <Section title="6. Review and updates">
      <p>We review this statement when things change in our business or the law.</p>
    </Section>
  </LegalPageLayout>
);
