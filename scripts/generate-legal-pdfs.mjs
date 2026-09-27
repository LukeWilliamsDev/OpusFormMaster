import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const h = React.createElement;
const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(root, "..", "public", "policies");

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#f7f4ee",
    color: "#20262b",
    fontFamily: "Helvetica",
    fontSize: 9,
    padding: 34,
    paddingBottom: 42,
  },
  header: {
    backgroundColor: "#18252a",
    borderBottom: 4,
    borderBottomColor: "#b5651d",
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  logo: { color: "#f7f4ee", fontSize: 22, fontWeight: "bold", letterSpacing: 3 },
  dot: { color: "#b5651d" },
  company: {
    color: "#d8d1c6",
    fontSize: 7,
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "right",
  },
  title: { color: "#18252a", fontSize: 20, fontWeight: "bold", marginTop: 22, marginBottom: 4 },
  reference: {
    color: "#b5651d",
    fontSize: 7,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  control: {
    backgroundColor: "#eee9df",
    borderLeftWidth: 3,
    borderLeftColor: "#b5651d",
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 14,
  },
  controlText: { color: "#514d48", fontSize: 7.5, letterSpacing: 0.4 },
  section: { marginBottom: 10 },
  sectionTitle: { color: "#18252a", fontSize: 10, fontWeight: "bold", marginBottom: 3 },
  text: { color: "#4d4a46", fontSize: 8.5, lineHeight: 1.35 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 34,
    right: 34,
    backgroundColor: "#18252a",
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
  },
  footerText: { color: "#d8d1c6", fontSize: 7 },
});

const docs = [
  {
    file: "Staff-Privacy-Notice.pdf",
    title: "Staff Privacy Notice",
    ref: "OF-LEG-01",
    sections: [
      [
        "What we collect",
        "We collect account, contact, work, compliance, and portal activity information needed to manage access and safe work.",
      ],
      [
        "How we use it",
        "We use information to administer the portal, check qualifications, allocate work, communicate with users, and meet legal obligations.",
      ],
      [
        "Sharing and security",
        "Access is limited to people who need it. We use appropriate technical and organisational safeguards and do not sell personal information.",
      ],
      [
        "Your rights",
        "You may ask to access, correct, or explain how your personal information is used. Contact IT if you have a question or concern.",
      ],
    ],
  },
  {
    file: "Portal-Usage-Policy.pdf",
    title: "Portal Usage Policy",
    ref: "OF-LEG-02",
    sections: [
      [
        "Purpose",
        "This policy governs how Opus Form staff, contractors, and approved partners use the portal.",
      ],
      [
        "Access",
        "Keep credentials private, use only your own account, log out from shared devices, and report suspected unauthorised access.",
      ],
      [
        "Accurate records",
        "Information and compliance documents must be accurate, current, and relevant to the work being managed.",
      ],
      [
        "Misuse",
        "Unauthorised access, malicious activity, deliberate false information, or misuse of company data may result in access being suspended.",
      ],
    ],
  },
  {
    file: "Acceptable-Use-Policy.pdf",
    title: "Acceptable Use Policy",
    ref: "OF-LEG-03",
    sections: [
      [
        "Permitted use",
        "Use the portal to manage assigned work, staff records, site updates, compliance documents, and company guidance.",
      ],
      [
        "Prohibited use",
        "Do not share credentials, access another person’s records, upload false documents, or use the portal to distribute malicious content.",
      ],
      [
        "Data care",
        "Only upload information relevant to the selected staff member or site. Do not include passwords or unrelated personal information.",
      ],
      [
        "Reporting",
        "Report suspected misuse, security concerns, or inaccurate records to IT promptly.",
      ],
    ],
  },
  {
    file: "Cookie-Statement.pdf",
    title: "Cookie Statement",
    ref: "OF-LEG-04",
    sections: [
      [
        "What cookies are",
        "Cookies are small files stored by a browser. They help a website remember settings and maintain a secure session.",
      ],
      [
        "How we use them",
        "The portal uses essential session and security storage, plus preference storage such as the selected light or dark theme.",
      ],
      [
        "Essential storage",
        "Turning off essential storage may prevent sign-in or secure portal functions from working correctly.",
      ],
      ["Questions", "If you have a question about cookies or privacy, contact Opus Form IT."],
    ],
  },
  {
    file: "Modern-Slavery-Statement.pdf",
    title: "Modern Slavery and Illegal Working Statement",
    ref: "OF-POL-07",
    sections: [
      [
        "Our stance",
        "Opus Form opposes modern slavery, forced labour, trafficking, and illegal working in our business and supply chain.",
      ],
      [
        "Checks",
        "We check identity, right-to-work evidence, competence, and relevant supplier or labour-provider information before work is approved.",
      ],
      [
        "Concerns",
        "Anyone who sees a concern should report it to IT or a company director. We do not tolerate retaliation for a genuine report.",
      ],
      [
        "Review",
        "This statement is reviewed regularly and updated when our work, suppliers, or legal obligations change.",
      ],
    ],
  },
  {
    file: "Right-to-Work-Policy.pdf",
    title: "Right to Work Policy",
    ref: "OF-POL-08",
    sections: [
      [
        "Purpose",
        "Opus Form only engages people who have the legal right to work in the United Kingdom for the work offered.",
      ],
      [
        "How we check",
        "We verify acceptable original or digital evidence, record the check, and complete follow-up checks where a permission has an expiry date.",
      ],
      [
        "Fairness and privacy",
        "Checks are applied consistently and information is retained securely only for as long as required.",
      ],
      [
        "Concerns",
        "Do not start work if evidence is incomplete or unclear. Raise questions with IT before a person is assigned.",
      ],
    ],
  },
  {
    file: "Anti-Bribery-Policy.pdf",
    title: "Anti-Bribery Policy",
    ref: "OF-POL-01",
    sections: [
      [
        "Our stance",
        "Opus Form does not tolerate bribery or corruption and conducts business fairly and in line with the Bribery Act 2010.",
      ],
      [
        "Gifts and hospitality",
        "Gifts and hospitality must be reasonable, transparent, and never offered or accepted to influence a decision.",
      ],
      [
        "Responsibilities",
        "Keep accurate records, follow approval controls, and ask IT or a director if a payment or request seems improper.",
      ],
      [
        "Reporting",
        "Report suspected bribery or an improper request promptly. Genuine concerns raised in good faith will be taken seriously.",
      ],
    ],
  },
  {
    file: "Health-and-Safety-Policy.pdf",
    title: "Health, Safety & Environmental Policy",
    ref: "OF-POL-02",
    sections: [
      [
        "Our commitment",
        "We protect employees, clients, contractors, visitors, and the public from harm while reducing the environmental impact of our work.",
      ],
      [
        "Safe work",
        "We provide information, training, supervision, equipment, PPE, risk assessments, and safe systems of work.",
      ],
      [
        "Environment",
        "We manage waste responsibly, use resources carefully, and follow applicable environmental law.",
      ],
      [
        "Responsibilities",
        "Everyone must take reasonable care, follow instructions, report hazards and incidents, and stop work where there is a serious immediate risk.",
      ],
    ],
  },
  {
    file: "Quality-Management-Policy.pdf",
    title: "Quality Management Policy",
    ref: "OF-POL-04",
    sections: [
      [
        "Our commitment",
        "We aim to meet agreed requirements and deliver consistent quality on every project and site.",
      ],
      [
        "Maintaining standards",
        "We use client feedback, complaint reviews, supplier monitoring, training, audits, measurable objectives, and management review.",
      ],
      [
        "Everyone's responsibility",
        "Every employee, contractor, and supplier is responsible for the quality of their own work.",
      ],
      [
        "Improvement",
        "We review procedures and lessons learned so our quality system remains useful and effective.",
      ],
    ],
  },
  {
    file: "Responsible-Sourcing-Policy.pdf",
    title: "Responsible Sourcing Policy",
    ref: "OF-POL-05",
    sections: [
      [
        "Why this matters",
        "Our purchasing decisions affect workers, communities, suppliers, and the environment.",
      ],
      [
        "Supplier standards",
        "Suppliers and subcontractors must follow applicable law, pay fairly, provide safe conditions, and oppose forced labour, trafficking, and child labour.",
      ],
      [
        "Environmental responsibility",
        "We consider waste, transport, materials, and environmental controls when selecting goods and services.",
      ],
      [
        "Review",
        "We monitor supplier performance and ask for evidence of responsible working practices where appropriate.",
      ],
    ],
  },
  {
    file: "Sustainability-Policy.pdf",
    title: "Sustainability Policy",
    ref: "OF-POL-06",
    sections: [
      [
        "Our approach",
        "We consider economic, environmental, and social responsibility in how we work with clients, staff, suppliers, and communities.",
      ],
      [
        "People and safety",
        "We support safe, respectful workplaces, fair treatment, data protection, and appropriate training.",
      ],
      [
        "Resources and waste",
        "We use energy and materials carefully, segregate waste where practical, and reduce avoidable environmental impact.",
      ],
      ["Improvement", "We review this approach as our work, risks, and opportunities change."],
    ],
  },
];

function documentFor(policy) {
  return h(
    Document,
    null,
    h(
      Page,
      { size: "A4", style: styles.page },
      h(
        View,
        { style: styles.header },
        h(
          Text,
          { style: styles.logo },
          h(React.Fragment, null, "OPUS", h(Text, { style: styles.dot }, " · "), "FORM"),
        ),
        h(Text, { style: styles.company }, "Opus Form Ltd\nLegal & Privacy"),
      ),
      h(Text, { style: styles.title }, policy.title),
      h(
        Text,
        { style: styles.reference },
        `${policy.ref} · Issued September 2026 · Review September 2027`,
      ),
      h(
        View,
        { style: styles.control },
        h(
          Text,
          { style: styles.controlText },
          "CONTROLLED DOCUMENT · VERSION 1.0 · OWNER: OPUS FORM LTD · CURRENT ONLINE COPY: OPUSFORM.CO.UK",
        ),
      ),
      ...policy.sections.map(([title, text]) =>
        h(
          View,
          { key: title, style: styles.section },
          h(Text, { style: styles.sectionTitle }, title),
          h(Text, { style: styles.text }, text),
        ),
      ),
      h(
        View,
        { style: styles.footer },
        h(
          Text,
          { style: styles.footerText },
          "Opus Form Ltd · 128 City Road, London EC1V 2NX · OPUSFORM.CO.UK",
        ),
        h(Text, { style: styles.footerText }, `${policy.ref} · Page 1 of 1`),
      ),
    ),
  );
}

await mkdir(output, { recursive: true });
for (const policy of docs)
  await writeFile(path.join(output, policy.file), await pdf(documentFor(policy)).toBuffer());
console.log(`Generated ${docs.length} one-page legal PDFs in ${output}`);
