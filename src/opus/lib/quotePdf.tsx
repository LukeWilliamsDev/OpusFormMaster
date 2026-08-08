// Standalone quote PDF generator using @react-pdf/renderer for native, pixel-exact vector PDF generation.
import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, pdf } from "@react-pdf/renderer";

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number | string;
}

export interface Quote {
  reference: string;
  clientInfo?: {
    entity?: string;
    email?: string;
    site?: string;
    postcode?: string;
  };
  items?: QuoteItem[];
  totals?: {
    netTotal?: number;
    grossTotal?: number;
  };
}

const COMPANY_INFO = {
  companyNumber: "17228356",
  bank: "Tide",
  accountName: "Opus Form Ltd",
  sortCode: "04-06-05",
  accountNumber: "31840773",
};

export const buildDefaultTerms = (entity: string | undefined) =>
  [
    "Assumed total pours up to 1, additional pours shall be charged minimum of £3,500",
    "Cancelled pours with less than 24hrs notice shall be charged",
    "Day rate per operative is £240 per day and Supervisor rate is £280 per day",
    "All the materials, telehandler and pump to be provided by Client",
    "Rate includes provision of licenced Telehandler/Forklift Operative",
  ].map((t) =>
    t.includes("to be provided by")
      ? `All the materials, telehandler and pump to be provided by ${entity || "Client"}`
      : t,
  );

const isIncludedRate = (rate: number | string) =>
  typeof rate === "string" && ["INCLUDED", "INCL"].includes(rate.toUpperCase());

const getLineTotal = (item: QuoteItem) => {
  if (isIncludedRate(item.rate)) return 0;
  let rateValue = 0;
  if (typeof item.rate === "string") {
    const parsed = parseFloat(item.rate.replace(/[£$,\s]/g, ""));
    rateValue = isNaN(parsed) ? 0 : parsed;
  } else {
    rateValue = Number(item.rate || 0);
  }
  return item.quantity * rateValue;
};

// Pure HTML/React preview component used for live on-screen mirror
export const QuotePdfDocument: React.FC<{
  quote: Quote;
  terms: string[];
  scaleValue?: number;
  isPrintTarget?: boolean;
}> = ({ quote, terms, scaleValue = 1, isPrintTarget = false }) => {
  const { reference, clientInfo, items, totals } = quote;
  return (
    <div
      className={`bg-white shadow-2xl text-slate-900 flex flex-col origin-top shrink-0 ${
        isPrintTarget ? "print-area" : ""
      }`}
      style={{
        width: "794px",
        height: "1122px",
        minHeight: "1122px",
        maxHeight: "1122px",
        transform: `scale(${scaleValue})`,
        marginLeft: `${(794 * scaleValue - 794) / 2}px`,
        marginRight: `${(794 * scaleValue - 794) / 2}px`,
        marginBottom: `${1122 * scaleValue - 1122}px`,
      }}
    >
      <div className="bg-[#1b1c20] px-8 sm:px-12 py-9 flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-[#E9E6E1] text-[22px] font-black tracking-[0.14em]">OPUS</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#B5651D] mx-1.5 inline-block" />
          <span className="text-[#E9E6E1] text-[22px] font-black tracking-[0.14em]">FORM</span>
        </div>
        <div className="text-right">
          <div className="text-white text-[22px] sm:text-[26px] font-black tracking-[0.08em] leading-none mb-4">
            QUOTE
          </div>
          <div className="flex items-center justify-end gap-5">
            <div className="text-right">
              <div className="text-[9.5px] text-stone-500 uppercase tracking-[0.12em]">
                Reference
              </div>
              <div className="text-white text-[12.5px] font-black mt-0.5">#{reference}</div>
            </div>
            <div className="w-px h-7 bg-[#2b2c32]" />
            <div className="text-right">
              <div className="text-[9.5px] text-stone-500 uppercase tracking-[0.12em]">Date</div>
              <div className="text-white text-[12.5px] font-black mt-0.5">
                {new Date().toLocaleDateString("en-GB")}
              </div>
            </div>
            <div className="w-px h-7 bg-[#2b2c32]" />
            <div className="text-right">
              <div className="text-[9.5px] text-stone-500 uppercase tracking-[0.12em]">
                Valid Until
              </div>
              <div className="text-white text-[12.5px] font-black mt-0.5">
                {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB")}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-1 bg-[#ea580c]" />
      <div className="px-12 py-8 flex-1 flex flex-col">
        <div className="mb-7 grid grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] font-black tracking-[0.14em] uppercase text-[#ea580c] mb-1.5">
              Client
            </div>
            <div className="border border-stone-200 p-4 min-h-[72px] text-xs">
              {clientInfo?.entity ? (
                <div className="space-y-1">
                  <p className="font-black text-gray-900 text-sm">{clientInfo.entity}</p>
                  <p className="text-stone-500 tracking-wide">
                    {clientInfo.email ? clientInfo.email.toLowerCase() : "..."}
                  </p>
                </div>
              ) : (
                <span className="text-stone-400">No client data entered</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-black tracking-[0.14em] uppercase text-[#ea580c] mb-1.5">
              Project
            </div>
            <div className="border border-stone-200 p-4 min-h-[72px] text-xs">
              {clientInfo?.site ? (
                <div className="space-y-1">
                  <p className="font-black text-gray-900 text-sm">{clientInfo.site}</p>
                  <p className="text-stone-500 tracking-wide">{clientInfo.postcode || "..."}</p>
                </div>
              ) : (
                <span className="text-stone-400">No project data entered</span>
              )}
            </div>
          </div>
        </div>
        <div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#1b1c20]">
                <th className="text-[11px] font-black tracking-[0.1em] uppercase text-white p-3 text-left w-[42%] whitespace-nowrap">
                  Description
                </th>
                <th className="text-[11px] font-black tracking-[0.1em] uppercase text-white p-3 text-right w-[16%] whitespace-nowrap">
                  Volume / Qty
                </th>
                <th className="text-[11px] font-black tracking-[0.1em] uppercase text-white p-3 text-left w-[10%]">
                  Unit
                </th>
                <th className="text-[11px] font-black tracking-[0.1em] uppercase text-white p-3 text-right w-[16%]">
                  Unit Rate
                </th>
                <th className="p-3 pl-1 text-right w-[16%]">
                  <span className="text-white text-[10px] font-black uppercase whitespace-nowrap">
                    Net Value
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items && items.length > 0 ? (
                items.map((item: QuoteItem, idx: number) => (
                  <tr
                    key={item.id}
                    className={`border-b border-stone-200 ${idx % 2 === 1 ? "bg-stone-50" : ""}`}
                  >
                    <td className="p-3 text-xs leading-relaxed text-slate-900">
                      {item.description || "..."}
                    </td>
                    <td className="p-3 text-xs text-right text-slate-900 font-medium">
                      {item.quantity}
                    </td>
                    <td className="p-3 text-[11px] text-stone-400 italic uppercase tracking-wide">
                      {item.unit}
                    </td>
                    <td className="p-3 text-xs text-right text-slate-900">
                      {isIncludedRate(item.rate)
                        ? "INCLUDED"
                        : `£${Number(item.rate || 0).toFixed(2)}`}
                    </td>
                    <td className="p-3 text-xs text-right text-slate-900 font-black">
                      {isIncludedRate(item.rate)
                        ? "INCLUDED"
                        : `£${getLineTotal(item).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-stone-200">
                  <td
                    colSpan={5}
                    className="p-10 text-center text-stone-400 italic text-[11px] uppercase tracking-widest"
                  >
                    No billable items added
                  </td>
                </tr>
              )}
              <tr className="h-4 bg-stone-50">
                <td colSpan={5} />
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex justify-end border-t-2 border-[#1b1c20] mb-6">
          <div className="w-[280px]">
            <div className="flex justify-between p-2 px-3 text-xs border-b border-stone-200 text-stone-600">
              <span className="uppercase tracking-widest">NET SUBTOTAL</span>
              <span className="font-black text-slate-900">
                £{(totals?.netTotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center p-3.5 px-3 bg-[#1b1c20] text-white font-black text-[15px]">
              <span className="uppercase tracking-widest">Total</span>
              <span className="text-white text-[15px]">
                £
                {(totals?.grossTotal ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom pinned Terms & Banking Details */}
        <div className="mt-auto pt-4">
          <div className="bg-stone-50 border-l-[3px] border-[#ea580c] p-4 mb-6">
            <div className="text-[11px] font-black tracking-[0.12em] uppercase text-[#ea580c] mb-2.5">
              Standard Terms & Pour Conditions
            </div>
            <ul className="space-y-1.5">
              {terms.map(
                (term: string, index: number) =>
                  term.trim() && (
                    <li
                      key={index}
                      className="text-[10.5px] text-stone-700 leading-relaxed pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[6px] before:w-[5px] before:h-[5px] before:bg-[#ea580c]"
                    >
                      {term}
                    </li>
                  ),
              )}
            </ul>
          </div>
          <div className="mb-2">
            <div className="text-[11px] font-black tracking-[0.14em] uppercase text-stone-500 mb-2.5">
              Banking Details
            </div>
            <div className="flex flex-wrap items-start gap-x-6 gap-y-3 border-t border-stone-200 pt-3.5">
              {[
                { label: "Bank", value: COMPANY_INFO.bank },
                { label: "Account Name", value: COMPANY_INFO.accountName },
                { label: "Sort Code", value: COMPANY_INFO.sortCode },
                { label: "Account No.", value: COMPANY_INFO.accountNumber },
              ].map((field, idx, arr) => (
                <div key={field.label} className="flex items-start gap-6">
                  <div>
                    <div className="text-[9.5px] text-stone-400 uppercase tracking-[0.1em]">
                      {field.label}
                    </div>
                    <div className="font-black text-slate-900 text-[11px] mt-0.5">
                      {field.value}
                    </div>
                  </div>
                  {idx < arr.length - 1 && <div className="w-px h-7 bg-stone-200" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-[#1b1c20] px-8 sm:px-12 py-3.5 flex justify-between items-center mt-auto">
        <span className="text-[11px] text-stone-500 tracking-[0.1em] uppercase">
          Opus Form Ltd &middot; Company No. {COMPANY_INFO.companyNumber}
        </span>
        <span className="text-[11px] text-stone-500 tracking-[0.1em] uppercase">
          billing@opusform.co.uk
        </span>
      </div>
    </div>
  );
};

// Styles for native ReactPDF document
const pdfStyles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#0f172a",
    paddingBottom: 0,
  },
  header: {
    backgroundColor: "#1b1c20",
    paddingHorizontal: 36,
    paddingVertical: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeftLogo: {
    width: 140,
    height: 35,
    objectFit: "contain",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  titleQuote: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 2,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerItem: {
    alignItems: "flex-end",
  },
  headerLabel: {
    color: "#78716c",
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerVal: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 2,
  },
  headerDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#2b2c32",
    marginHorizontal: 12,
  },
  accentLine: {
    height: 3,
    backgroundColor: "#ea580c",
  },
  body: {
    paddingHorizontal: 36,
    paddingTop: 24,
    flex: 1,
  },
  gridTwo: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  cardCol: {
    flex: 1,
  },
  cardTitle: {
    color: "#ea580c",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  cardBox: {
    borderWidth: 1,
    borderColor: "#e7e5e4",
    padding: 10,
    minHeight: 55,
  },
  clientEntity: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 3,
  },
  clientMeta: {
    fontSize: 9,
    color: "#78716c",
  },
  placeholderText: {
    color: "#a8a29e",
    fontSize: 9,
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    backgroundColor: "#1b1c20",
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  thDesc: {
    width: "42%",
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  thQty: {
    width: "16%",
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "right",
  },
  thUnit: {
    width: "10%",
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  thRate: {
    width: "16%",
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "right",
  },
  thTotal: {
    width: "16%",
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "right",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e7e5e4",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableRowAlt: {
    backgroundColor: "#fafaf9",
  },
  tdDesc: {
    width: "42%",
    fontSize: 9,
    color: "#0f172a",
  },
  tdQty: {
    width: "16%",
    fontSize: 9,
    color: "#0f172a",
    textAlign: "right",
  },
  tdUnit: {
    width: "10%",
    fontSize: 8,
    color: "#a8a29e",
    textTransform: "uppercase",
  },
  tdRate: {
    width: "16%",
    fontSize: 9,
    color: "#0f172a",
    textAlign: "right",
  },
  tdTotal: {
    width: "16%",
    fontSize: 9,
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "right",
  },
  emptyRow: {
    paddingVertical: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e7e5e4",
  },
  emptyText: {
    color: "#a8a29e",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  totalsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 2,
    borderTopColor: "#1b1c20",
    marginTop: 10,
  },
  totalsBox: {
    width: 220,
  },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e7e5e4",
  },
  subtotalLabel: {
    fontSize: 8,
    color: "#57534e",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subtotalVal: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#0f172a",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#1b1c20",
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 11,
    color: "#ffffff",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  totalVal: {
    fontSize: 11,
    color: "#ffffff",
    fontWeight: "bold",
  },
  termsBox: {
    backgroundColor: "#fafaf9",
    borderLeftWidth: 3,
    borderLeftColor: "#ea580c",
    padding: 12,
    marginTop: "auto",
    marginBottom: 16,
  },
  termsTitle: {
    color: "#ea580c",
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  termItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  bullet: {
    width: 4,
    height: 4,
    backgroundColor: "#ea580c",
    marginRight: 6,
  },
  termText: {
    fontSize: 8,
    color: "#44403c",
  },
  bankSection: {
    marginBottom: 20,
  },
  bankTitle: {
    color: "#78716c",
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  bankGrid: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e7e5e4",
    paddingTop: 8,
    gap: 16,
  },
  bankCol: {
    marginRight: 8,
  },
  bankLabel: {
    fontSize: 7,
    color: "#a8a29e",
    textTransform: "uppercase",
  },
  bankVal: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 1,
  },
  footer: {
    backgroundColor: "#1b1c20",
    paddingHorizontal: 36,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
  },
  footerText: {
    color: "#78716c",
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});

// ReactPDF Document structure
export const QuotePdfVectorDocument: React.FC<{
  quote: Quote;
  terms: string[];
  documentTitle?: string;
}> = ({ quote, terms, documentTitle = "QUOTE" }) => {
  const { reference, clientInfo, items, totals } = quote;
  const logoUrl =
    typeof window !== "undefined" ? `${window.location.origin}/opus-form-primary-dark.png` : "";

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={{
                color: "#E9E6E1",
                fontSize: 22,
                fontWeight: "bold",
                letterSpacing: 3,
              }}
            >
              OPUS
            </Text>
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: "#B5651D",
                marginHorizontal: 5,
              }}
            />
            <Text
              style={{
                color: "#E9E6E1",
                fontSize: 22,
                fontWeight: "bold",
                letterSpacing: 3,
              }}
            >
              FORM
            </Text>
          </View>
          <View style={pdfStyles.headerRight}>
            <Text style={pdfStyles.titleQuote}>{documentTitle}</Text>
            <View style={pdfStyles.headerRow}>
              <View style={pdfStyles.headerItem}>
                <Text style={pdfStyles.headerLabel}>Reference</Text>
                <Text style={pdfStyles.headerVal}>#{reference}</Text>
              </View>
              <View style={pdfStyles.headerDivider} />
              <View style={pdfStyles.headerItem}>
                <Text style={pdfStyles.headerLabel}>Date</Text>
                <Text style={pdfStyles.headerVal}>{new Date().toLocaleDateString("en-GB")}</Text>
              </View>
              <View style={pdfStyles.headerDivider} />
              <View style={pdfStyles.headerItem}>
                <Text style={pdfStyles.headerLabel}>Valid Until</Text>
                <Text style={pdfStyles.headerVal}>
                  {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB")}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={pdfStyles.accentLine} />

        {/* Body */}
        <View style={pdfStyles.body}>
          {/* Client & Project */}
          <View style={pdfStyles.gridTwo}>
            <View style={pdfStyles.cardCol}>
              <Text style={pdfStyles.cardTitle}>Client</Text>
              <View style={pdfStyles.cardBox}>
                {clientInfo?.entity ? (
                  <>
                    <Text style={pdfStyles.clientEntity}>{clientInfo.entity}</Text>
                    <Text style={pdfStyles.clientMeta}>
                      {clientInfo.email ? clientInfo.email.toLowerCase() : "..."}
                    </Text>
                  </>
                ) : (
                  <Text style={pdfStyles.placeholderText}>No client data entered</Text>
                )}
              </View>
            </View>
            <View style={pdfStyles.cardCol}>
              <Text style={pdfStyles.cardTitle}>Project</Text>
              <View style={pdfStyles.cardBox}>
                {clientInfo?.site ? (
                  <>
                    <Text style={pdfStyles.clientEntity}>{clientInfo.site}</Text>
                    <Text style={pdfStyles.clientMeta}>{clientInfo.postcode || "..."}</Text>
                  </>
                ) : (
                  <Text style={pdfStyles.placeholderText}>No project data entered</Text>
                )}
              </View>
            </View>
          </View>

          {/* Line Items Table */}
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={pdfStyles.thDesc}>Description</Text>
              <Text style={pdfStyles.thQty}>Volume / Qty</Text>
              <Text style={pdfStyles.thUnit}>Unit</Text>
              <Text style={pdfStyles.thRate}>Unit Rate</Text>
              <Text style={pdfStyles.thTotal}>Net Value</Text>
            </View>

            {items && items.length > 0 ? (
              items.map((item, idx) => (
                <View
                  key={item.id || idx}
                  style={[pdfStyles.tableRow, idx % 2 === 1 ? pdfStyles.tableRowAlt : {}]}
                >
                  <Text style={pdfStyles.tdDesc}>{item.description || "..."}</Text>
                  <Text style={pdfStyles.tdQty}>{item.quantity}</Text>
                  <Text style={pdfStyles.tdUnit}>{item.unit}</Text>
                  <Text style={pdfStyles.tdRate}>
                    {isIncludedRate(item.rate)
                      ? "INCLUDED"
                      : `£${Number(item.rate || 0).toFixed(2)}`}
                  </Text>
                  <Text style={pdfStyles.tdTotal}>
                    {isIncludedRate(item.rate)
                      ? "INCLUDED"
                      : `£${getLineTotal(item).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}`}
                  </Text>
                </View>
              ))
            ) : (
              <View style={pdfStyles.emptyRow}>
                <Text style={pdfStyles.emptyText}>No billable items added</Text>
              </View>
            )}
          </View>

          {/* Totals */}
          <View style={pdfStyles.totalsContainer}>
            <View style={pdfStyles.totalsBox}>
              <View style={pdfStyles.subtotalRow}>
                <Text style={pdfStyles.subtotalLabel}>NET SUBTOTAL</Text>
                <Text style={pdfStyles.subtotalVal}>
                  £
                  {(totals?.netTotal ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </Text>
              </View>
              <View style={pdfStyles.totalRow}>
                <Text style={pdfStyles.totalLabel}>Total</Text>
                <Text style={pdfStyles.totalVal}>
                  £
                  {(totals?.grossTotal ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </Text>
              </View>
            </View>
          </View>

          {/* Terms */}
          <View style={pdfStyles.termsBox}>
            <Text style={pdfStyles.termsTitle}>Standard Terms & Pour Conditions</Text>
            {terms.map(
              (term, index) =>
                term.trim() !== "" && (
                  <View key={index} style={pdfStyles.termItem}>
                    <View style={pdfStyles.bullet} />
                    <Text style={pdfStyles.termText}>{term}</Text>
                  </View>
                ),
            )}
          </View>

          {/* Banking Details */}
          <View style={pdfStyles.bankSection}>
            <Text style={pdfStyles.bankTitle}>Banking Details</Text>
            <View style={pdfStyles.bankGrid}>
              {[
                { label: "Bank", value: COMPANY_INFO.bank },
                { label: "Account Name", value: COMPANY_INFO.accountName },
                { label: "Sort Code", value: COMPANY_INFO.sortCode },
                { label: "Account No.", value: COMPANY_INFO.accountNumber },
              ].map((field) => (
                <View key={field.label} style={pdfStyles.bankCol}>
                  <Text style={pdfStyles.bankLabel}>{field.label}</Text>
                  <Text style={pdfStyles.bankVal}>{field.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer}>
          <Text style={pdfStyles.footerText}>
            Opus Form Ltd · Company No. {COMPANY_INFO.companyNumber}
          </Text>
          <Text style={pdfStyles.footerText}>billing@opusform.co.uk</Text>
        </View>
      </Page>
    </Document>
  );
};

// Generates a native vector PDF Blob
export async function generateQuotePdfBlob(quote: Quote) {
  const terms = buildDefaultTerms(quote.clientInfo?.entity);
  const pdfInstance = pdf(<QuotePdfVectorDocument quote={quote} terms={terms} />);
  const blob = await pdfInstance.toBlob();
  const filename = `Quote_${quote.reference}.pdf`;
  return { blob, filename };
}

export async function generateBillPdf(
  bill: Quote,
  opts: { documentTitle: string; filenamePrefix: string },
) {
  const terms = buildDefaultTerms(bill.clientInfo?.entity);
  const pdfInstance = pdf(
    <QuotePdfVectorDocument quote={bill} terms={terms} documentTitle={opts.documentTitle} />,
  );
  const blob = await pdfInstance.toBlob();
  const filename = `${opts.filenamePrefix}_${bill.reference}.pdf`;
  return { blob, filename };
}
