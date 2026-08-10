// One-off generator: builds the six branded policy PDFs into policies/.
// Run: node scripts/generate-policies.mjs
import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const h = React.createElement;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "policies");

const COMPANY = {
  name: "Opus Form Ltd",
  companyNumber: "17228356",
  director: "Toby Green",
};

const styles = StyleSheet.create({
  page: { backgroundColor: "#ffffff", fontFamily: "Helvetica", fontSize: 10, color: "#0f172a" },
  header: {
    backgroundColor: "#1b1c20",
    paddingHorizontal: 36,
    paddingVertical: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoRow: { flexDirection: "row", alignItems: "center" },
  logoText: { color: "#E9E6E1", fontSize: 22, fontWeight: "bold", letterSpacing: 3 },
  logoDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#B5651D",
    marginHorizontal: 5,
  },
  headerRight: { alignItems: "flex-end" },
  companyLabel: { color: "#78716c", fontSize: 8, textTransform: "uppercase", letterSpacing: 1 },
  companyVal: { color: "#ffffff", fontSize: 9, marginTop: 2 },
  body: { paddingHorizontal: 36, paddingTop: 28, flex: 1 },
  kicker: {
    color: "#B5651D",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#0f172a", marginBottom: 16 },
  metaRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e7e5e4",
    marginBottom: 24,
  },
  metaCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderColor: "#e7e5e4",
  },
  metaCellLast: { borderRightWidth: 0 },
  metaLabel: {
    color: "#a8a29e",
    fontSize: 7,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
  },
  metaVal: { fontSize: 9, fontWeight: "bold", color: "#0f172a" },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  sectionNumber: { color: "#B5651D", fontSize: 9, fontWeight: "bold", width: 22 },
  sectionTitle: { fontSize: 13, fontWeight: "bold", color: "#0f172a", flex: 1 },
  sectionRule: {
    height: 1,
    backgroundColor: "#B5651D",
    width: 24,
    marginBottom: 8,
    marginLeft: 22,
  },
  paragraph: { fontSize: 9.5, lineHeight: 1.5, color: "#44403c", marginBottom: 6, marginLeft: 22 },
  bulletRow: { flexDirection: "row", marginLeft: 22, marginBottom: 4 },
  bulletDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#B5651D",
    marginTop: 4,
    marginRight: 8,
  },
  bulletText: { fontSize: 9.5, lineHeight: 1.5, color: "#44403c", flex: 1 },
  signOff: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: "#e7e5e4",
    marginTop: 12,
    paddingTop: 16,
  },
  signLabel: {
    color: "#a8a29e",
    fontSize: 7,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  signVal: { fontSize: 10, fontWeight: "bold", color: "#0f172a" },
  signSub: { fontSize: 8, color: "#78716c", marginTop: 2 },
  footer: {
    backgroundColor: "#1b1c20",
    paddingHorizontal: 36,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "auto",
  },
  footerText: { fontSize: 8, color: "#78716c", letterSpacing: 0.5, textTransform: "uppercase" },
});

function buildDocument(policy) {
  const header = h(
    View,
    { style: styles.header, fixed: true },
    h(
      View,
      { style: styles.logoRow },
      h(Text, { style: styles.logoText }, "OPUS"),
      h(View, { style: styles.logoDot }),
      h(Text, { style: styles.logoText }, "FORM"),
    ),
    h(
      View,
      { style: styles.headerRight },
      h(Text, { style: styles.companyLabel }, COMPANY.name.toUpperCase()),
      h(Text, { style: styles.companyVal }, `Co. No. ${COMPANY.companyNumber}`),
    ),
  );

  const meta = h(
    View,
    { style: styles.metaRow },
    h(
      View,
      { style: styles.metaCell },
      h(Text, { style: styles.metaLabel }, "Managing Director"),
      h(Text, { style: styles.metaVal }, COMPANY.director),
    ),
    h(
      View,
      { style: styles.metaCell },
      h(Text, { style: styles.metaLabel }, "Issued"),
      h(Text, { style: styles.metaVal }, policy.issued),
    ),
    h(
      View,
      { style: styles.metaCell },
      h(Text, { style: styles.metaLabel }, "Review Date"),
      h(Text, { style: styles.metaVal }, policy.reviewDate),
    ),
    h(
      View,
      { style: [styles.metaCell, styles.metaCellLast] },
      h(Text, { style: styles.metaLabel }, "Reference"),
      h(Text, { style: styles.metaVal }, policy.reference),
    ),
  );

  const sections = policy.sections.map((section) =>
    h(
      View,
      { key: section.number, style: styles.section, wrap: false },
      h(
        View,
        { style: styles.sectionHeader },
        h(Text, { style: styles.sectionNumber }, section.number),
        h(Text, { style: styles.sectionTitle }, section.title),
      ),
      h(View, { style: styles.sectionRule }),
      ...(section.paragraphs || []).map((p, i) =>
        h(Text, { key: `p${i}`, style: styles.paragraph }, p),
      ),
      ...(section.bullets || []).map((b, i) =>
        h(
          View,
          { key: `b${i}`, style: styles.bulletRow },
          h(View, { style: styles.bulletDot }),
          h(Text, { style: styles.bulletText }, b),
        ),
      ),
    ),
  );

  const signOff = h(
    View,
    { style: styles.signOff },
    h(
      View,
      null,
      h(Text, { style: styles.signLabel }, "Approved By"),
      h(Text, { style: styles.signVal }, COMPANY.director),
      h(Text, { style: styles.signSub }, `Managing Director, ${COMPANY.name}`),
    ),
    h(
      View,
      null,
      h(Text, { style: styles.signLabel }, "Date"),
      h(Text, { style: styles.signVal }, policy.issued),
      h(Text, { style: styles.signSub }, `Next scheduled review: ${policy.reviewDate}`),
    ),
  );

  const footer = h(
    View,
    { style: styles.footer, fixed: true },
    h(Text, { style: styles.footerText }, `${COMPANY.name} · Confidential · ${policy.reference}`),
    h(Text, { style: styles.footerText }, "admin@opusform.co.uk"),
  );

  const body = h(
    View,
    { style: styles.body },
    h(Text, { style: styles.kicker }, "Company Policy"),
    h(Text, { style: styles.title }, policy.title),
    meta,
    ...sections,
    signOff,
  );

  return h(Document, null, h(Page, { size: "A4", style: styles.page }, header, body, footer));
}

const POLICIES = [
  {
    file: "Anti-Bribery-Policy.pdf",
    title: "Anti-Bribery Policy",
    reference: "OF-POL-01",
    issued: "July 2026",
    reviewDate: "July 2027",
    sections: [
      {
        number: "01",
        title: "Our Stance",
        paragraphs: [
          "We don't tolerate bribery or corruption, in any form. Bribery is offering, giving, accepting, or asking for an advantage to get someone to act improperly, and we won't be part of it.",
          "We act professionally, fairly, and with integrity in every business relationship, wherever we operate. We're bound by UK law, including the Bribery Act 2010.",
        ],
      },
      {
        number: "02",
        title: "Who This Covers",
        paragraphs: [
          "This applies to everyone working for us, at every level: directors, employees, consultants, contractors, agency staff, and anyone else associated with our business.",
        ],
      },
      {
        number: "03",
        title: "Bribes",
        paragraphs: [
          "No one may offer, give, ask for, or accept a bribe, whether directly or through someone else.",
        ],
      },
      {
        number: "04",
        title: "Gifts and Hospitality",
        paragraphs: [
          "Don't offer or give a gift or hospitality worth more than £50 each, or £100 total to one person in a financial year, unless the Managing Director approves it in writing.",
          "Don't accept a gift or hospitality worth more than £50, in cash, or where a favour is expected in return.",
        ],
      },
      {
        number: "05",
        title: "Facilitation Payments and Kickbacks",
        paragraphs: [
          "We don't pay facilitation payments. If your personal safety, or a family member's, is genuinely at risk and a payment can't be avoided, keep it to a minimum, record it, and report it to the Managing Director straight away.",
        ],
      },
      {
        number: "06",
        title: "Political and Charitable Contributions",
        paragraphs: [
          "We don't donate to political parties or candidates. Charitable giving is fine but can never be used to disguise a bribe, and needs the Managing Director's approval first.",
        ],
      },
      {
        number: "07",
        title: "Your Responsibilities",
        paragraphs: [
          'Read, understand, and follow this policy. We keep proper financial records and controls, so payments to third parties are always explainable. Nothing goes "off-book".',
          "If you're unsure whether something counts as bribery, or you've been affected by it, tell the Managing Director as soon as possible. We support anyone who raises a genuine concern in good faith.",
        ],
      },
    ],
  },
  {
    file: "Health-and-Safety-Policy.pdf",
    title: "Health, Safety & Environmental Policy",
    reference: "OF-POL-02",
    issued: "July 2026",
    reviewDate: "July 2027",
    sections: [
      {
        number: "01",
        title: "Our Approach",
        paragraphs: [
          "This policy meets the Health and Safety at Work Act 1974 and the Management of Health and Safety at Work Regulations 1999. We supply concrete flooring services and products across the UK from our London office.",
          "Health and safety isn't separate from running a good business, it's part of it. We want a workplace where employees, clients, subcontractors, visitors, and the public are never put at risk by what we do.",
        ],
        bullets: [
          "Safe plant, equipment, and systems of work, properly maintained.",
          "Clear information, instruction, training, and supervision for everyone who needs it.",
          "The right safety equipment and protective clothing, provided by us.",
          "Safe transport, storage, handling, and use of hazardous substances.",
        ],
      },
      {
        number: "02",
        title: "Environment",
        paragraphs: [
          "This follows the Environmental Protection Act 1990. Protecting the environment is part of how we do business, and every manager is responsible for putting it into practice.",
        ],
        bullets: [
          "Conserving energy and using raw materials sustainably.",
          "Managing waste responsibly.",
          "Steadily reducing our environmental impact.",
        ],
      },
      {
        number: "03",
        title: "Smoking",
        paragraphs: [
          "We keep our workplace smoke-free, in line with the Health Act 2006. Smoking isn't allowed in any of our buildings or company vehicles.",
        ],
      },
      {
        number: "04",
        title: "Who's Responsible",
        paragraphs: [
          "Toby Green, our Managing Director, has overall responsibility for health and safety, including funding what's needed, making sure our systems meet the law, and monitoring how we're doing.",
          "Everyone working for us must take reasonable care of themselves and others, cooperate with management, and report accidents, near misses, and misconduct to their supervisor straight away.",
        ],
      },
      {
        number: "05",
        title: "On Site",
        paragraphs: [
          "Ask your supervisor if you're ever unsure whether something affects your safety or anyone else's. Alcohol, drugs, and illegal substances have no place on our premises. Visitors sign in and out and are accompanied at all times.",
          "Contractors must show us their safety policy meets the law, and must follow safety instructions from our site contact.",
          "We carry out risk assessments to catch hazards before they cause harm, and train every employee in manual handling, PPE, and safe use of work equipment.",
        ],
      },
      {
        number: "06",
        title: "Protective Equipment",
        paragraphs: [
          "We issue suitable PPE, treating it as a last line of defence rather than the whole answer. We also issue respiratory protective equipment (RPE) where it's needed, note that beards and heavy stubble stop facemask-type respirators sealing properly.",
        ],
      },
      {
        number: "07",
        title: "Accidents and First Aid",
        paragraphs: [
          "Report every accident and incident, injury or not. We provide first aid facilities sized to the workplace and the work being done.",
        ],
      },
      {
        number: "08",
        title: "Construction (Design and Management) Regulations 2015",
        paragraphs: [
          "As a concrete flooring contractor, we know our duties under the CDM Regulations 2015. We make sure we have the skills and experience to work safely, cooperate fully with the Principal Contractor and Principal Designer, follow the Construction Phase Plan, and properly induct and supervise our operatives.",
        ],
      },
      {
        number: "09",
        title: "Control of Substances Hazardous to Health (COSHH)",
        paragraphs: [
          "Concrete flooring work can expose our operatives to hazardous substances, mainly respirable crystalline silica (RCS) dust and wet cement. We meet the COSHH Regulations 2002 strictly.",
        ],
        bullets: [
          "Specific COSHH risk assessments for cutting, grinding, and pouring.",
          "Wet-cutting methods, on-tool dust extraction (LEV), and mandatory FFP3 masks wherever dust can't be fully controlled.",
          "Waterproof protective clothing and gloves, to prevent cement burns and dermatitis during pours.",
        ],
      },
    ],
  },
  {
    file: "Quality-Management-Policy.pdf",
    title: "Quality Management Policy",
    reference: "OF-POL-04",
    issued: "July 2026",
    reviewDate: "July 2027",
    sections: [
      {
        number: "01",
        title: "Our Commitment",
        paragraphs: [
          "We're a concrete flooring contractor, and quality matters to us because our clients matter to us. We aim to meet, and exceed, what our clients expect from every finish we deliver.",
          "We're committed to continuous improvement, and we run a Quality Management System to keep our standards consistent on every site.",
        ],
      },
      {
        number: "02",
        title: "How We Keep Standards Up",
        paragraphs: ["We support total customer satisfaction and continuous improvement through:"],
        bullets: [
          "Gathering and monitoring client feedback.",
          "A structured review of any client complaint.",
          "Choosing and monitoring our suppliers and labour agencies.",
          "Training and development for every employee and operative.",
          "Audits of our internal processes and site operations.",
          "Measurable quality objectives tied to our business aims.",
          "Management reviews of audit results, feedback, and complaints.",
          "Regular review of our internal procedures.",
        ],
      },
      {
        number: "03",
        title: "Everyone's Responsibility",
        paragraphs: [
          "The Managing Director holds ultimate responsibility for quality, but every employee and subcontractor plays a part in their own area of work. Our Quality Management System is aligned with the core principles of ISO 9001.",
        ],
      },
    ],
  },
  {
    file: "Responsible-Sourcing-Policy.pdf",
    title: "Responsible Sourcing Policy",
    reference: "OF-POL-05",
    issued: "July 2026",
    reviewDate: "July 2027",
    sections: [
      {
        number: "01",
        title: "Why This Matters",
        paragraphs: [
          "Our purchasing decisions affect people and the environment well beyond our own operations. We only want to work with suppliers who take that responsibility as seriously as we do, to the people they employ, the communities they affect, and their environmental impact.",
        ],
      },
      {
        number: "02",
        title: "How We Do Business",
        paragraphs: [
          "We act with integrity in everything we do. We're open and transparent with everyone our supply chain touches, and we pay what we owe, on the terms we agreed.",
        ],
      },
      {
        number: "03",
        title: "Environmental Sustainability",
        paragraphs: [
          "We weigh up the environmental impact of goods and services before we buy them for our concrete flooring work.",
        ],
        bullets: [
          "We monitor and review what, and how much, we buy, to cut waste.",
          "We work to reduce our carbon footprint wherever practical.",
          "We minimise materials with hazardous content.",
          "We expect our supply chain to run its own environmental policy, in line with best practice and the law.",
          "We expect suppliers to manage their own environmental impacts and targets, cutting waste where they can.",
          "We reduce waste to landfill through reuse, recycling, and proper waste segregation.",
        ],
      },
      {
        number: "04",
        title: "Procurement and Supply Chain",
        paragraphs: [
          "Our success rests on strong partnerships with our clients and our supply chain.",
        ],
        bullets: [
          "Where practical, we favour local labour and local goods and services, to benefit the community.",
          "We buy locally where we can, to cut the carbon cost of transport.",
          "We expect suppliers to show real commitment to ethical working practices, fair wages, fair hours, and equal opportunities.",
          "We require every supplier and subcontractor to comply fully with the UK Modern Slavery Act 2015, no forced labour, human trafficking, or child labour, anywhere in their operations or supply chains.",
        ],
      },
    ],
  },
  {
    file: "Sustainability-Policy.pdf",
    title: "Sustainability Policy",
    reference: "OF-POL-06",
    issued: "July 2026",
    reviewDate: "July 2027",
    sections: [
      {
        number: "01",
        title: "Our Approach",
        paragraphs: [
          "This policy sets our standard for economic, ecological, and social responsibility. We want a sustainable, conscientious way of working with our clients, employees, and suppliers, one that gets the best out of how we cooperate and perform.",
        ],
      },
      {
        number: "02",
        title: "Health and Safety at Work",
        paragraphs: [
          "As an employer, we put real weight on good ergonomics and safety in the workplace.",
        ],
      },
      {
        number: "03",
        title: "Data and Identity Protection",
        paragraphs: [
          "We take real care over data protection and confidential information about our clients, employees, and suppliers, to protect their identity and privacy.",
        ],
      },
      {
        number: "04",
        title: "Environmental Protection, Energy, and Waste",
        paragraphs: [
          "We manage natural resources carefully and economically, to keep our environmental burden as low as possible and minimise waste. We follow our Duty of Care under the UK Waste (England and Wales) Regulations 2011 strictly: concrete waste is properly segregated, moved only by registered waste carriers, and documented with valid Waste Transfer Notes.",
        ],
      },
      {
        number: "05",
        title: "Ethical Principles and Modern Slavery",
        paragraphs: [
          "We build our business on loyalty, respect, transparency, and fair competition, free of corruption and exploitation. We oppose discrimination of any kind, race, origin, religion, gender, sexual orientation, or age.",
          "We take a zero-tolerance approach to modern slavery and human trafficking, and we strictly follow the UK Modern Slavery Act 2015.",
        ],
      },
      {
        number: "06",
        title: "Freedom of Association and Choice of Workplace",
        paragraphs: [
          "Employees can speak openly and respectfully with each other and with management about working conditions. Forced labour or trafficking has no place here.",
        ],
      },
      {
        number: "07",
        title: "Working Hours and Child Labour",
        paragraphs: [
          "Pay, benefits, working hours, and holiday all follow statutory requirements. We condemn child labour and comply with the law on minimum working age.",
        ],
      },
      {
        number: "08",
        title: "Continuous Improvement and Transparency",
        paragraphs: [
          "We keep improving on environmental protection, energy efficiency, health and safety, and social responsibility. Every employee is told clearly what their tasks, rights, and duties are.",
        ],
      },
    ],
  },
  {
    file: "Modern-Slavery-Statement.pdf",
    title: "Modern Slavery and Illegal Working Statement",
    reference: "OF-POL-03",
    issued: "July 2026",
    reviewDate: "July 2027",
    sections: [
      {
        number: "01",
        title: "Our Stance",
        paragraphs: [
          "We oppose modern slavery and trafficking in everything we do. Our supply chain needs to be clean too.",
          "We're under the £36 million turnover threshold, so this statement is voluntary. But we're publishing it to show we take this seriously.",
        ],
      },
      {
        number: "02",
        title: "What We Do",
        paragraphs: [
          "We do concrete flooring across the UK. We hire workers, buy materials, and rent equipment for jobs.",
          "We use subcontractors and labour agencies. Construction has real slavery risks. We work to stop that.",
        ],
      },
      {
        number: "03",
        title: "Our Policy",
        paragraphs: [
          "We won't tolerate slavery, trafficking, or illegal hiring. We deal fairly with everyone.",
        ],
        bullets: [
          "Right to Work Verification: we strictly verify the identity and right to work of all our direct employees and contractors before they start with us.",
          "Software Safeguards: our software portal helps clients verify compliance documents, like CSCS cards, for their operatives, supporting wider industry efforts against illegal working.",
        ],
      },
      {
        number: "04",
        title: "How We Check",
        paragraphs: ["We:"],
        bullets: [
          "Evaluate the modern slavery risks of any new major suppliers.",
          "Expect our suppliers to have suitable anti-slavery and human trafficking policies and processes.",
          "Reserve the right to end our relationship with suppliers if modern slavery comes to light.",
        ],
      },
      {
        number: "05",
        title: "Tell Us If You See Something",
        paragraphs: [
          "If you see slavery or illegal hiring in our business or with our suppliers, tell us at admin@opusform.co.uk.",
        ],
      },
      {
        number: "06",
        title: "We'll Keep It Current",
        paragraphs: ["We review this statement when things change in our business or the law."],
      },
    ],
  },
];

async function main() {
  for (const policy of POLICIES) {
    const instance = pdf(buildDocument(policy));
    const buffer = await instance.toBuffer();
    const chunks = [];
    for await (const chunk of buffer) chunks.push(chunk);
    const outPath = path.join(OUT_DIR, policy.file);
    await writeFile(outPath, Buffer.concat(chunks));
    console.log(`Wrote ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
