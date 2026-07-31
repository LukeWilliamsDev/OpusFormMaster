import React from "react";
import { LegalPageLayout, Section } from "../layouts/LegalPageLayout";

/**
 * Voluntary Modern Slavery and Illegal Working Statement for Opus Form Ltd.
 * Demonstrates best practices for compliance even though turnover is < £36m.
 */
export const ModernSlaveryStatementPage: React.FC = () => (
  <LegalPageLayout title="Modern Slavery and Illegal Working Statement" lastUpdated="July 2026">
    <Section title="1. Our Stance">
      <p>
        We oppose modern slavery and trafficking in everything we do. Our supply chain needs to be
        clean too.
      </p>
      <p>
        We're under the £36 million turnover threshold, so this statement is voluntary. But we're
        publishing it to show we take this seriously.
      </p>
    </Section>

    <Section title="2. What We Do">
      <p>
        We do concrete flooring across the UK. We hire workers, buy materials, and rent equipment
        for jobs.
      </p>
      <p>
        We use subcontractors and labor agencies. Construction has real slavery risks. We work to
        stop that.
      </p>
    </Section>

    <Section title="3. Our Policy">
      <p>
        We won't tolerate slavery, trafficking, or illegal hiring. We deal fairly with everyone.
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
          Reserve the right to terminate our relationship with suppliers if instances of modern
          slavery come to light.
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

    <Section title="6. We'll Keep It Current">
      <p>We review this statement when things change in our business or the law.</p>
    </Section>
  </LegalPageLayout>
);
