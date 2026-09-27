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
        "Gifts and hospitality must be reasonable, transparent, and never offered or accepted to influence a decision. Cash gifts and gifts linked to an expected favour are not permitted.",
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
        "Opus Form aims to protect employees, clients, contractors, visitors, and the public from harm, while reducing the environmental impact of our work.",
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
        "Everyone must take reasonable care, follow site instructions, report hazards and incidents, and stop work where there is a serious immediate risk.",
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
