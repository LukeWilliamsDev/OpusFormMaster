import React from "react";
import { useParams } from "react-router-dom";
import { LegalPageLayout, Section } from "../layouts/LegalPageLayout";

const POLICIES = {
  "anti-bribery": {
    title: "Anti-Bribery Policy",
    sections: [
      [
        "Purpose",
        "Opus Form does not tolerate bribery or corruption. We conduct business fairly, professionally, and in line with the Bribery Act 2010.",
      ],
      [
        "Who this covers",
        "This policy applies to directors, employees, contractors, consultants, agency workers, and anyone acting for Opus Form.",
      ],
      [
        "Gifts and hospitality",
        "No gift, hospitality, payment, donation, sponsorship, or other advantage may be offered, promised, given, requested, or accepted to induce improper performance, influence a decision improperly, or create an improper obligation. Internal approval thresholds are controls, not a safe harbour. Cash gifts and gifts linked to an expected favour are not permitted.",
      ],
      [
        "Facilitation payments",
        "Facilitation payments are prohibited. If an immediate threat to personal safety leaves no practical alternative, prioritise safety, report the circumstances as soon as possible, and record what happened. This is not permission to make such payments.",
      ],
      [
        "Reporting concerns",
        "Report suspected bribery or an improper request to IT or a company director as soon as possible. Genuine concerns raised in good faith will be treated seriously.",
      ],
    ],
  },
  "health-safety-environmental": {
    title: "Health, Safety & Environmental Policy",
    sections: [
      [
        "Our commitment",
        "This policy sets Opus Form's framework for supporting compliance with applicable health and safety law. Site-specific risk assessments, RAMS, the construction phase plan, and principal-contractor instructions remain the controlling documents.",
      ],
      [
        "Safe work",
        "We provide suitable information, instruction, training, supervision, equipment, PPE, risk assessments, and safe systems of work.",
      ],
      [
        "Environment",
        "We manage waste responsibly, use resources carefully, follow applicable environmental law, and look for practical ways to reduce waste and emissions.",
      ],
      [
        "Responsibilities",
        "Everyone must take reasonable care, follow site instructions, report hazards and incidents, and stop work where there is a serious immediate risk. Respiratory protective equipment must be selected following the COSHH assessment and relevant HSE guidance; tight-fitting RPE requires suitable face-fit testing.",
      ],
    ],
  },
  "quality-management": {
    title: "Quality Management Policy",
    sections: [
      [
        "Our commitment",
        "Opus Form aims to meet agreed requirements and deliver consistent quality on every project and site.",
      ],
      [
        "How we maintain standards",
        "We use client feedback, complaint reviews, supplier monitoring, training, audits, measurable objectives, and management review to improve our work.",
      ],
      [
        "Everyone's responsibility",
        "The director has overall responsibility for quality, but every employee, contractor, and supplier has responsibility for the quality of their own work.",
      ],
      [
        "Continuous improvement",
        "We review procedures and lessons learned so that our quality system remains useful, proportionate, and effective.",
      ],
    ],
  },
  "responsible-sourcing": {
    title: "Responsible Sourcing Policy",
    sections: [
      [
        "Why this matters",
        "Our purchasing decisions affect workers, communities, suppliers, and the environment. We expect responsible conduct throughout our supply chain.",
      ],
      [
        "Supplier standards",
        "Suppliers and subcontractors must follow applicable law, pay fairly, provide safe working conditions, and oppose forced labour, trafficking, and child labour.",
      ],
      [
        "Environmental responsibility",
        "We consider waste, transport, materials, and environmental controls when selecting goods and services, and favour practical local sourcing where appropriate.",
      ],
      [
        "Review",
        "We monitor supplier performance and may ask for evidence of responsible working practices where the risk or nature of the work requires it.",
      ],
    ],
  },
  sustainability: {
    title: "Sustainability Policy",
    sections: [
      [
        "Our approach",
        "Opus Form considers economic, environmental, and social responsibility in how we work with clients, staff, suppliers, and communities.",
      ],
      [
        "People and safety",
        "We support safe, respectful workplaces, fair treatment, data protection, and appropriate training and supervision.",
      ],
      [
        "Resources and waste",
        "We use energy and materials carefully, segregate waste where practical, and seek to reduce avoidable waste and environmental impact.",
      ],
      [
        "Improvement",
        "We review this approach as our work, risks, and opportunities change, and make improvements that are practical and measurable.",
      ],
    ],
  },
} as const;

export const CompanyPolicyPage: React.FC = () => {
  const { policySlug } = useParams();
  const policy = policySlug ? POLICIES[policySlug as keyof typeof POLICIES] : undefined;
  if (!policy) return null;

  return (
    <LegalPageLayout title={policy.title} lastUpdated="September 2026">
      {policy.sections.map(([title, text], index) => (
        <Section key={title} title={`${index + 1}. ${title}`}>
          <p>{text}</p>
        </Section>
      ))}
    </LegalPageLayout>
  );
};
