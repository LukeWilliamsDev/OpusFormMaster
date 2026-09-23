import React from "react";
import { LegalPageLayout, Section } from "../layouts/LegalPageLayout";

export const RightToWorkPolicyPage: React.FC = () => (
  <LegalPageLayout title="Right to Work Policy" lastUpdated="July 2026">
    <Section title="1. Purpose and Scope">
      <p>
        Opus Form Ltd prevents illegal working where it employs or directly engages an individual to
        carry out work in the UK. This applies to employees, agency workers, labour-only
        subcontractors, self-employed operatives, consultants and other individuals working for us
        or on our behalf where we are responsible for the engagement.
      </p>
      <p>
        We follow the current Home Office right-to-work guidance and carry out checks fairly and
        consistently before work starts. A supplier's tax status or assurance does not replace our
        own check where Opus Form directly engages the individual.
      </p>
    </Section>

    <Section title="2. How We Check">
      <ul className="list-disc list-inside space-y-1.5 ml-1">
        <li>Check an eligible original document from the Home Office prescribed list.</li>
        <li>Use a GOV.UK share code and date of birth for an online Home Office check.</li>
        <li>Use the Employer Checking Service where the prescribed process requires it.</li>
        <li>Record the result, date, identity, permission and any expiry date or conditions.</li>
        <li>Complete follow-up checks before time-limited permission expires.</li>
        <li>
          Save the official result or required document record in the private compliance system.
        </li>
      </ul>
      <p>
        Nobody may start work until the required check has been completed and recorded, unless an
        official verification route confirms a lawful exception.
      </p>
    </Section>

    <Section title="3. What a Check Must Confirm">
      <p>
        Manual checks must use the current Home Office prescribed list and confirm that the document
        appears genuine, belongs to the person presenting it, permits the proposed work and has no
        unrecorded restrictions. Online checks must be completed through the GOV.UK employer service
        using the share code and date of birth; a worker's screenshot is not enough.
      </p>
      <p>
        We record the checker, date, evidence or verification reference, result, expiry date and any
        work conditions. Work must not be allocated outside those conditions.
      </p>
    </Section>

    <Section title="4. CIS and UTR Numbers">
      <p>
        A CIS number and a UTR (Unique Taxpayer Reference) are tax-administration references. They
        do not prove immigration permission or a right to work in the UK and must never be accepted
        as a substitute for a right-to-work check.
      </p>
      <p>
        The same applies to National Insurance numbers, invoices, payslips, driving licences and
        evidence of self-employed tax status when offered on their own.
      </p>
    </Section>

    <Section title="5. CSCS Checks">
      <p>
        CSCS is a separate competence and site-access check. Where required, we check the card using
        the official CSCS Smart Check or current official verification route and record the card,
        occupation, expiry and result.
      </p>
      <p>
        A CSCS card or CSCS check does not prove a person's right to work. Where both apply, we
        require both a right-to-work check and a CSCS, training and competence check.
      </p>
    </Section>

    <Section title="6. Fairness, Privacy and Retention">
      <p>
        We do not make assumptions based on nationality, appearance, accent or name, and apply the
        same lawful process consistently. Evidence is stored in the approved private compliance
        system and accessed only by authorised staff.
      </p>
      <p>
        Records are retained for the engagement and at least two years after it ends, or longer
        where a documented legal or regulatory requirement applies, before secure disposal.
      </p>
    </Section>

    <Section title="7. Monitoring and Concerns">
      <p>
        The compliance register records checks, expiry dates, follow-up actions and exceptions. A
        quarterly sample review confirms that evidence, dates, restrictions and retention actions
        were recorded correctly. Failed, unclear or late checks are escalated before work is
        allocated.
      </p>
      <p>
        Report suspected forged documents, illegal working, exploitation, coercion or modern slavery
        immediately to{" "}
        <a
          href="mailto:admin@opusform.co.uk"
          className="underline"
          style={{ color: "var(--primary)" }}
        >
          admin@opusform.co.uk
        </a>
        . Genuine concerns will be handled sensitively and without retaliation.
      </p>
    </Section>
  </LegalPageLayout>
);
