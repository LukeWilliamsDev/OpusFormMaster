// Company policy PDF generator using @react-pdf/renderer, matching the brand
// header treatment used on billing PDFs (see quotePdf.tsx).
import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

export interface PolicySection {
  number: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface PolicyDoc {
  title: string;
  reference: string;
  issued: string;
  reviewDate: string;
  sections: PolicySection[];
}

const COMPANY = {
  name: "Opus Form Ltd",
  companyNumber: "17228356",
  address: "128 City Road, London, EC1V 2NX",
  director: "Toby Green",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#0f172a",
  },
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
  sectionNumber: {
    color: "#B5651D",
    fontSize: 9,
    fontWeight: "bold",
    width: 22,
  },
  sectionTitle: { fontSize: 13, fontWeight: "bold", color: "#0f172a", flex: 1 },
  sectionRule: {
    height: 1,
    backgroundColor: "#B5651D",
    width: 24,
    marginBottom: 8,
    marginLeft: 22,
  },
  paragraph: {
    fontSize: 9.5,
    lineHeight: 1.5,
    color: "#44403c",
    marginBottom: 6,
    marginLeft: 22,
  },
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

const Header: React.FC<{ policy: PolicyDoc }> = ({ policy }) => (
  <View style={styles.header} fixed>
    <View style={styles.logoRow}>
      <Text style={styles.logoText}>OPUS</Text>
      <View style={styles.logoDot} />
      <Text style={styles.logoText}>FORM</Text>
    </View>
    <View style={styles.headerRight}>
      <Text style={styles.companyLabel}>{COMPANY.name.toUpperCase()}</Text>
      <Text style={styles.companyVal}>Co. No. {COMPANY.companyNumber}</Text>
    </View>
  </View>
);

const Footer: React.FC<{ policy: PolicyDoc }> = ({ policy }) => (
  <View style={styles.footer} fixed>
    <Text style={styles.footerText}>
      {COMPANY.name} &middot; Confidential &middot; {policy.reference}
    </Text>
    <Text style={styles.footerText}>admin@opusform.co.uk</Text>
  </View>
);

export const PolicyPdfDocument: React.FC<{ policy: PolicyDoc }> = ({ policy }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Header policy={policy} />
      <View style={styles.body}>
        <Text style={styles.kicker}>Company Policy</Text>
        <Text style={styles.title}>{policy.title}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Managing Director</Text>
            <Text style={styles.metaVal}>{COMPANY.director}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Issued</Text>
            <Text style={styles.metaVal}>{policy.issued}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Review Date</Text>
            <Text style={styles.metaVal}>{policy.reviewDate}</Text>
          </View>
          <View style={[styles.metaCell, styles.metaCellLast]}>
            <Text style={styles.metaLabel}>Reference</Text>
            <Text style={styles.metaVal}>{policy.reference}</Text>
          </View>
        </View>

        {policy.sections.map((section) => (
          <View key={section.number} style={styles.section} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>{section.number}</Text>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <View style={styles.sectionRule} />
            {section.paragraphs?.map((p, i) => (
              <Text key={i} style={styles.paragraph}>
                {p}
              </Text>
            ))}
            {section.bullets?.map((b, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.signOff}>
          <View>
            <Text style={styles.signLabel}>Approved By</Text>
            <Text style={styles.signVal}>{COMPANY.director}</Text>
            <Text style={styles.signSub}>Managing Director, {COMPANY.name}</Text>
          </View>
          <View>
            <Text style={styles.signLabel}>Date</Text>
            <Text style={styles.signVal}>{policy.issued}</Text>
            <Text style={styles.signSub}>Next scheduled review: {policy.reviewDate}</Text>
          </View>
        </View>
      </View>
      <Footer policy={policy} />
    </Page>
  </Document>
);

export async function generatePolicyPdfBuffer(policy: PolicyDoc): Promise<Buffer> {
  const instance = pdf(<PolicyPdfDocument policy={policy} />);
  return instance.toBuffer() as unknown as Promise<Buffer>;
}
