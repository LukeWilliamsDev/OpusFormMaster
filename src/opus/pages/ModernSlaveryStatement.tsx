import React from "react";
import { LegalPageLayout, Section } from "../layouts/LegalPageLayout";

/**
 * Voluntary Modern Slavery and Illegal Working Statement for Opus Form Ltd.
 * Demonstrates best practices for compliance even though turnover is < £36m.
 */
export const ModernSlaveryStatementPage: React.FC = () => (
  <LegalPageLayout title="Modern Slavery and Illegal Working Statement" lastUpdated="July 2026">
    <Section title="1. Introduction">
      <p>
        Opus Form Ltd (Company No. 17228356) is committed to preventing modern slavery and human
        trafficking in our corporate activities, and to ensuring that our supply chains are free
        from these practices.
      </p>
      <p>
        While Opus Form Ltd currently has an annual turnover below the £36 million threshold
        requiring a mandatory statement under section 54 of the Modern Slavery Act 2015, we are
        making this voluntary statement to demonstrate our commitment to best practices and ethical
        operations.
      </p>
    </Section>

    <Section title="2. Organisational Structure and Supply Chains">
      <p>
        We provide concrete flooring and associated construction services, including the provision
        of labour, materials, and plant machinery for industrial flooring projects across the United
        Kingdom.
      </p>
      <p>
        Our supply chains include the sourcing of raw materials (such as concrete and steel
        reinforcement), plant and machinery hire, and the use of specialised sub-contractors and
        labour agencies. We recognise that the construction industry carries a higher inherent risk
        of modern slavery and illegal working, and we are committed to mitigating this risk.
      </p>
    </Section>

    <Section title="3. Policies on Modern Slavery and Illegal Working">
      <p>
        We operate a zero-tolerance approach to modern slavery, human trafficking, and illegal
        working. We are committed to acting ethically and with integrity in all our business
        dealings and relationships.
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

    <Section title="4. Due Diligence Processes">
      <p>As part of our initiative to identify and mitigate risk, we:</p>
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

    <Section title="5. Reporting and Raising Concerns">
      <p>
        We encourage all our employees, contractors, and partners to report any concerns regarding
        modern slavery or illegal working within our business or supply chain. Concerns should be
        raised directly to management via:
      </p>
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

    <Section title="6. Ongoing Review">
      <p>
        We will periodically review and update this statement to reflect our ongoing commitment and
        any changes in our business operations or legal obligations.
      </p>
    </Section>
  </LegalPageLayout>
);
