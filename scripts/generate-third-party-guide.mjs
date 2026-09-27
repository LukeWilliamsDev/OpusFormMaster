import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const h = React.createElement;
const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(root, "..", "public", "guides", "third-party-portal-user-guide.pdf");

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#f7f4ee",
    color: "#20262b",
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 36,
    paddingBottom: 48,
  },
  header: {
    backgroundColor: "#18252a",
    borderBottom: 4,
    borderBottomColor: "#b5651d",
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  logo: { color: "#f7f4ee", fontSize: 23, fontWeight: "bold", letterSpacing: 3 },
  dot: { color: "#b5651d" },
  headerMeta: {
    color: "#d8d1c6",
    fontSize: 7,
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "right",
  },
  panel: { backgroundColor: "#fff", padding: 22 },
  kicker: {
    color: "#b5651d",
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 18,
    marginBottom: 6,
  },
  title: { color: "#18252a", fontSize: 27, fontWeight: "bold", marginBottom: 8 },
  lead: { color: "#4d4a46", fontSize: 10.5, lineHeight: 1.45, marginBottom: 16 },
  quick: { backgroundColor: "#18252a", padding: 15, marginBottom: 18 },
  quickTitle: { color: "#fff", fontSize: 14, fontWeight: "bold", marginBottom: 10 },
  step: { flexDirection: "row", alignItems: "center", marginBottom: 7 },
  stepNo: {
    backgroundColor: "#b5651d",
    color: "#fff",
    width: 18,
    height: 18,
    borderRadius: 9,
    textAlign: "center",
    paddingTop: 4,
    fontSize: 8,
    fontWeight: "bold",
    marginRight: 8,
  },
  stepText: { color: "#f7f4ee", fontSize: 9.5 },
  section: { borderTop: 1, borderTopColor: "#ddd8d0", paddingTop: 12, marginTop: 12 },
  sectionTitle: { color: "#18252a", fontSize: 14, fontWeight: "bold", marginBottom: 5 },
  body: { color: "#4d4a46", fontSize: 9.5, lineHeight: 1.4 },
  bullet: { flexDirection: "row", marginTop: 5 },
  bulletDot: { color: "#b5651d", width: 10, fontSize: 11 },
  status: {
    flexDirection: "row",
    borderBottom: 1,
    borderBottomColor: "#e5e0d7",
    paddingVertical: 7,
  },
  statusTerm: { color: "#18252a", fontSize: 9, fontWeight: "bold", width: 125 },
  statusText: { color: "#4d4a46", fontSize: 9, flex: 1, lineHeight: 1.3 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    backgroundColor: "#18252a",
    padding: 7,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { color: "#d8d1c6", fontSize: 7 },
});

const bulletList = (items) =>
  items.map((item) =>
    h(
      View,
      { key: item, style: styles.bullet },
      h(Text, { style: styles.bulletDot }, "•"),
      h(Text, { style: styles.body }, item),
    ),
  );
const footer = (page) =>
  h(
    View,
    { style: styles.footer },
    h(
      Text,
      { style: styles.footerText },
      "Opus Form · Third-party portal guide · Updated September 2026",
    ),
    h(Text, { style: styles.footerText }, `Page ${page}`),
  );

// Build the pages with explicit JSX-free nodes so the guide can be generated in CI and locally.
const pages = [];
pages[0] = h(
  Page,
  { key: "overview", size: "A4", style: styles.page },
  h(
    View,
    { style: styles.header },
    h(
      Text,
      { style: styles.logo },
      h(React.Fragment, null, "OPUS", h(Text, { style: styles.dot }, " · "), "FORM"),
    ),
    h(Text, { style: styles.headerMeta }, "Third-party portal\nQuick guide · v2.0"),
  ),
  h(
    View,
    { style: styles.panel },
    h(Text, { style: styles.kicker }, "Third-party portal"),
    h(Text, { style: styles.title }, "Get the right thing done"),
    h(
      Text,
      { style: styles.lead },
      "Use this guide to manage staff, certificates, assigned sites, and support requests. The portal shows only records and sites available to your organisation.",
    ),
    h(
      View,
      { style: styles.quick },
      h(Text, { style: styles.quickTitle }, "Start here"),
      [
        "Open Home",
        "Review Needs attention",
        "Open the linked staff member or site",
        "Complete the action and confirm it appears",
      ].map((text, i) =>
        h(
          View,
          { key: text, style: styles.step },
          h(Text, { style: styles.stepNo }, String(i + 1)),
          h(Text, { style: styles.stepText }, text),
        ),
      ),
    ),
    h(
      View,
      { style: styles.section },
      h(Text, { style: styles.sectionTitle }, "Manage staff"),
      h(
        Text,
        { style: styles.body },
        "Open Staff to search approved staff and people awaiting review. Add a staff member, enter accurate details, and submit it to Opus Form. A new record stays Pending review until approved; it does not create site access before approval.",
      ),
    ),
    h(
      View,
      { style: styles.section },
      h(Text, { style: styles.sectionTitle }, "Upload or renew a certificate"),
      h(
        Text,
        { style: styles.body },
        "Open a staff record, choose Add certificate or Replace, enter the type, number, and expiry date, then upload a PDF, JPG, JPEG, or PNG file up to 10 MB. Uploading evidence does not approve it; Opus Form reviews it.",
      ),
    ),
  ),
  footer(1),
);

pages.push(
  h(
    Page,
    { key: "sites", size: "A4", style: styles.page },
    h(
      View,
      { style: styles.header },
      h(
        Text,
        { style: styles.logo },
        h(React.Fragment, null, "OPUS", h(Text, { style: styles.dot }, " · "), "FORM"),
      ),
      h(Text, { style: styles.headerMeta }, "Third-party portal\nQuick guide · v2.0"),
    ),
    h(
      View,
      { style: styles.panel },
      h(Text, { style: styles.kicker }, "Sites and updates"),
      h(Text, { style: styles.title }, "Work with assigned sites"),
      h(
        View,
        { style: styles.section },
        h(Text, { style: styles.sectionTitle }, "Find an assigned site"),
        h(
          Text,
          { style: styles.body },
          "Open Sites to see locations linked to your approved staff. Search by site name or postcode and filter All, Open, Needs attention, or Completed. Sites are assigned by Opus Form.",
        ),
      ),
      h(
        View,
        { style: styles.section },
        h(Text, { style: styles.sectionTitle }, "Add a note or file"),
        h(
          Text,
          { style: styles.body },
          "Open an open site and check its name before adding a note or attachment. Keep notes factual and relevant. You can reply to Opus Form responses; use a new note for a new update. Attachments are limited to 10 MB per file. Site photos supplied by Opus Form are view-only.",
        ),
      ),
      h(
        View,
        { style: styles.section },
        h(Text, { style: styles.sectionTitle }, "Completed sites"),
        h(
          Text,
          { style: styles.body },
          "Completed sites remain available as history. You can view photos, attachments, notes, replies, assigned staff, and completion details, but cannot add notes, upload attachments, rename files, or delete content.",
        ),
      ),
      h(
        View,
        { style: styles.section },
        h(Text, { style: styles.sectionTitle }, "Status words"),
        [
          ["Needs attention", "A certificate, submission, or site update needs action."],
          ["Pending review", "Submitted to Opus Form and awaiting review."],
          ["Valid", "The certificate is current."],
          ["Expiring", "Renewal may be needed soon."],
          ["Expired", "The certificate is no longer current."],
          ["Needs review", "Opus Form needs to check the evidence."],
          ["Completed — view only", "History remains available; new updates are disabled."],
        ].map(([term, text]) =>
          h(
            View,
            { key: term, style: styles.status },
            h(Text, { style: styles.statusTerm }, term),
            h(Text, { style: styles.statusText }, text),
          ),
        ),
      ),
    ),
    footer(2),
  ),
);

pages.push(
  h(
    Page,
    { key: "support", size: "A4", style: styles.page },
    h(
      View,
      { style: styles.header },
      h(
        Text,
        { style: styles.logo },
        h(React.Fragment, null, "OPUS", h(Text, { style: styles.dot }, " · "), "FORM"),
      ),
      h(Text, { style: styles.headerMeta }, "Third-party portal\nQuick guide · v2.0"),
    ),
    h(
      View,
      { style: styles.panel },
      h(Text, { style: styles.kicker }, "Support and safety"),
      h(Text, { style: styles.title }, "When you need help"),
      h(
        View,
        { style: styles.section },
        h(Text, { style: styles.sectionTitle }, "Contact Opus Form IT"),
        h(
          Text,
          { style: styles.body },
          "Use Contact IT for access problems, missing records, upload errors, or site-note issues. Include the site or staff name, what you were doing, approximate time, device/browser, and exact error. Your signed-in email is included for the reply.",
        ),
        bulletList([
          "Do not include passwords, sign-in links, payment details, or unrelated personal information.",
          "If the form does not send, try again or email admin@opusform.co.uk.",
          "We normally respond during working hours.",
        ]),
      ),
      h(
        View,
        { style: styles.section },
        h(Text, { style: styles.sectionTitle }, "Use the portal safely"),
        bulletList([
          "Use your own account and never share your password or sign-in link.",
          "Upload only information relevant to the selected staff member or site.",
          "Check the site name before posting a note or uploading a file.",
          "Completed sites are view-only; do not try to add new updates.",
        ]),
      ),
      h(
        View,
        { style: styles.section },
        h(Text, { style: styles.sectionTitle }, "Mobile navigation"),
        h(
          Text,
          { style: styles.body },
          "Home, Staff, Sites, and Help remain in the bottom navigation on a phone. Use More for Contact IT, settings, Legal & Privacy, theme, and logout. On detail pages, the bottom navigation remains available.",
        ),
      ),
      h(
        View,
        { style: styles.section },
        h(Text, { style: styles.sectionTitle }, "Direct routes"),
        bulletList([
          "Home: /portal/third-party",
          "Staff: /portal/third-party/staff",
          "Sites: /portal/third-party/sites",
          "Help: /portal/help",
          "Contact IT: /portal/contact",
        ]),
      ),
    ),
    footer(3),
  ),
);

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, await pdf(h(Document, null, pages)).toBuffer());
console.log(`Generated ${output}`);
