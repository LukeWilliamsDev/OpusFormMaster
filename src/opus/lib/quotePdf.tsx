// @ts-nocheck
// Standalone quote PDF template + headless generator, shared by the live
// QuoteInvoiceBuilder editor and any code that needs a PDF from a saved
// quote row without the editor mounted (e.g. converting a quote to a job).
import React from "react";
import ReactDOM from "react-dom/client";

const COMPANY_INFO = {
  companyNumber: "17228356",
  bank: "Tide",
  accountName: "Opus Form Ltd",
  sortCode: "04-06-05",
  accountNumber: "31840773",
};

export const buildDefaultTerms = (entity) =>
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

const isIncludedRate = (rate) =>
  typeof rate === "string" && ["INCLUDED", "INCL"].includes(rate.toUpperCase());

const getLineTotal = (item) => {
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

// Pure template: identical markup to the live QuoteInvoiceBuilder preview, but
// driven entirely by a Quote object + terms list instead of component state.
export const QuotePdfDocument = ({ quote, terms, scaleValue = 1, isPrintTarget = false }) => {
  const { reference, clientInfo, items, totals } = quote;
  return (
    <div
      className={`bg-white shadow-2xl text-[#333] flex flex-col origin-top shrink-0 ${isPrintTarget ? "print-area" : ""}`}
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
      <div className="bg-[#26262B] px-8 sm:px-12 py-9 flex justify-between items-center">
        <img src="/opus-form-primary-dark.svg" alt="Opus Form" className="h-9 sm:h-10 w-auto" />
        <div className="text-right">
          <div className="text-[26px] sm:text-[30px] font-black text-[#F4F4F0] tracking-[0.08em] leading-none mb-4">
            QUOTE
          </div>
          <div className="flex items-center justify-end gap-5">
            <div className="text-right">
              <div className="text-[9.5px] text-[#8A8A82] uppercase tracking-[0.12em]">
                Reference
              </div>
              <div className="text-[12.5px] text-[#F4F4F0] font-black mt-0.5">#{reference}</div>
            </div>
            <div className="w-px h-7 bg-[#3A3A40]" />
            <div className="text-right">
              <div className="text-[9.5px] text-[#8A8A82] uppercase tracking-[0.12em]">Date</div>
              <div className="text-[12.5px] text-[#F4F4F0] font-black mt-0.5">
                {new Date().toLocaleDateString("en-GB")}
              </div>
            </div>
            <div className="w-px h-7 bg-[#3A3A40]" />
            <div className="text-right">
              <div className="text-[9.5px] text-[#8A8A82] uppercase tracking-[0.12em]">
                Valid Until
              </div>
              <div className="text-[12.5px] text-[#F4F4F0] font-black mt-0.5">
                {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB")}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-1 bg-primary" />
      <div className="px-12 py-8 flex-1 flex flex-col">
        <div className="mb-7 grid grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] font-black tracking-[0.14em] uppercase text-primary mb-1.5">
              Client
            </div>
            <div className="border border-[#E4E0D8] p-4 min-h-[72px] text-xs">
              {clientInfo?.entity ? (
                <div className="space-y-1">
                  <p className="font-black text-gray-900 text-sm">{clientInfo.entity}</p>
                  <p className="text-muted-foreground tracking-wide">
                    {clientInfo.email ? clientInfo.email.toLowerCase() : "..."}
                  </p>
                </div>
              ) : (
                <span className="text-[#AAA]">No client data entered</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-black tracking-[0.14em] uppercase text-primary mb-1.5">
              Project
            </div>
            <div className="border border-[#E4E0D8] p-4 min-h-[72px] text-xs">
              {clientInfo?.site ? (
                <div className="space-y-1">
                  <p className="font-black text-gray-900 text-sm">{clientInfo.site}</p>
                  <p className="text-muted-foreground tracking-wide">
                    {clientInfo.postcode || "..."}
                  </p>
                </div>
              ) : (
                <span className="text-[#AAA]">No project data entered</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#26262B]">
                <th className="text-[11px] font-black tracking-[0.1em] uppercase text-[#F4F4F0] p-3 text-left w-[42%] whitespace-nowrap">
                  Description
                </th>
                <th className="text-[11px] font-black tracking-[0.1em] uppercase text-[#F4F4F0] p-3 text-right w-[16%] whitespace-nowrap">
                  Volume / Qty
                </th>
                <th className="text-[11px] font-black tracking-[0.1em] uppercase text-[#F4F4F0] p-3 text-left w-[10%]">
                  Unit
                </th>
                <th className="text-[11px] font-black tracking-[0.1em] uppercase text-[#F4F4F0] p-3 text-right w-[16%]">
                  Unit Rate
                </th>
                <th className="text-[11px] font-black tracking-[0.1em] uppercase text-[#F4F4F0] p-3 text-right w-[16%]">
                  Net Value
                </th>
              </tr>
            </thead>
            <tbody>
              {items?.length > 0 ? (
                items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-[#EDEAE4] ${idx % 2 === 1 ? "bg-[#FAFAF8]" : ""}`}
                  >
                    <td className="p-3 text-xs leading-relaxed text-[#333]">
                      {item.description || "..."}
                    </td>
                    <td className="p-3 text-xs text-right text-[#333] font-medium">
                      {item.quantity}
                    </td>
                    <td className="p-3 text-[11px] text-[#BBB] italic uppercase tracking-wide">
                      {item.unit}
                    </td>
                    <td className="p-3 text-xs text-right text-[#333]">
                      {isIncludedRate(item.rate)
                        ? "INCLUDED"
                        : `£${Number(item.rate || 0).toFixed(2)}`}
                    </td>
                    <td className="p-3 text-xs text-right text-[#333] font-black">
                      {isIncludedRate(item.rate)
                        ? "INCLUDED"
                        : `£${getLineTotal(item).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-[#EDEAE4]">
                  <td
                    colSpan={5}
                    className="p-10 text-center text-[#BBB] italic text-[11px] uppercase tracking-widest"
                  >
                    No billable items added
                  </td>
                </tr>
              )}
              <tr className="h-4 bg-[#FAFAF8]">
                <td colSpan={5} />
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex justify-end border-t-2 border-[#26262B]">
          <div className="w-[280px]">
            <div className="flex justify-between p-2 px-3 text-xs border-b border-[#EDEAE4] text-[#666]">
              <span className="uppercase tracking-widest">NET SUBTOTAL</span>
              <span className="font-black text-[#333]">
                £{(totals?.netTotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between p-3.5 px-3 bg-[#26262B] text-[#F4F4F0] font-black text-[15px]">
              <span className="uppercase tracking-widest">Total</span>
              <span>
                £
                {(totals?.grossTotal ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="px-12 pt-7">
        <div className="bg-[#F4F3F0] border-l-[3px] border-primary p-4 mb-6">
          <div className="text-[11px] font-black tracking-[0.12em] uppercase text-primary mb-2.5">
            Standard Terms & Pour Conditions
          </div>
          <ul className="space-y-1.5">
            {terms.map(
              (term, index) =>
                term.trim() && (
                  <li
                    key={index}
                    className="text-[10.5px] text-[#555] leading-relaxed pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[6px] before:w-[5px] before:h-[5px] before:bg-primary"
                  >
                    {term}
                  </li>
                ),
            )}
          </ul>
        </div>
        <div className="mb-8">
          <div className="text-[11px] font-black tracking-[0.14em] uppercase text-[#888] mb-2.5">
            Banking Details
          </div>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-3 border-t border-[#E4E0D8] pt-3.5">
            {[
              { label: "Bank", value: COMPANY_INFO.bank },
              { label: "Account Name", value: COMPANY_INFO.accountName },
              { label: "Sort Code", value: COMPANY_INFO.sortCode },
              { label: "Account No.", value: COMPANY_INFO.accountNumber },
            ].map((field, idx, arr) => (
              <div key={field.label} className="flex items-start gap-6">
                <div>
                  <div className="text-[9.5px] text-[#AAA] uppercase tracking-[0.1em]">
                    {field.label}
                  </div>
                  <div className="font-black text-[#333] text-[11px] mt-0.5">{field.value}</div>
                </div>
                {idx < arr.length - 1 && <div className="w-px h-7 bg-[#E4E0D8]" />}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-[#26262B] px-8 sm:px-12 py-3.5 flex justify-between items-center mt-auto">
        <span className="text-[11px] text-[#B8B8B0] tracking-[0.1em] uppercase">
          Opus Form Ltd &middot; Company No. {COMPANY_INFO.companyNumber}
        </span>
        <span className="text-[11px] text-[#B8B8B0] tracking-[0.1em] uppercase">
          billing@opusform.co.uk
        </span>
      </div>
    </div>
  );
};

const stripUnsupportedColorFunctions = (cssText) =>
  cssText.replace(/\b(oklch|oklab|lch|lab)\([^)]*\)/g, "#333333");

const buildHtml2PdfOptions = (filename) => ({
  margin: 0,
  filename,
  image: { type: "jpeg", quality: 0.98 },
  html2canvas: {
    scale: 2,
    useCORS: true,
    logging: false,
    scrollX: 0,
    scrollY: 0,
    onclone: (_document, clonedElement) => {
      const cloneDoc = clonedElement.ownerDocument;
      if (cloneDoc?.body) {
        cloneDoc.body.style.margin = "0";
        cloneDoc.body.style.padding = "0";
        cloneDoc.body.style.background = "transparent";
      }
      let cssText = "";
      for (let i = 0; i < document.styleSheets.length; i++) {
        try {
          const rules = document.styleSheets[i].cssRules || document.styleSheets[i].rules;
          for (let j = 0; j < rules.length; j++) cssText += rules[j].cssText + "\n";
        } catch (e) {
          console.warn("Could not read stylesheet rules: ", e);
        }
      }
      const safeCss = stripUnsupportedColorFunctions(cssText);
      cloneDoc.querySelectorAll('link[rel="stylesheet"], style').forEach((el) => el.remove());
      const styleEl = cloneDoc.createElement("style");
      styleEl.textContent = safeCss;
      cloneDoc.head.appendChild(styleEl);
    },
  },
  jsPDF: {
    unit: "px",
    format: [794, 1122],
    orientation: "portrait",
    hotfixes: ["px_scaling"],
  },
  pagebreak: { mode: "avoid" },
});

// Renders a Quote off-screen (no mounted editor required) and returns the
// generated PDF as a Blob, ready to upload.
export async function generateQuotePdfBlob(quote) {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = "794px";
  container.style.height = "1122px";
  container.style.overflow = "hidden";
  document.body.appendChild(container);

  const root = ReactDOM.createRoot(container);
  const terms = buildDefaultTerms(quote.clientInfo?.entity);

  try {
    await new Promise((resolve) => {
      root.render(<QuotePdfDocument quote={quote} terms={terms} isPrintTarget />);
      // Two rAFs so the browser has painted before html2canvas rasterizes it.
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    const { default: html2pdf } = await import("html2pdf.js");
    const filename = `Quote_${quote.reference}.pdf`;
    const blob = await html2pdf()
      .from(container.querySelector(".print-area"))
      .set(buildHtml2PdfOptions(filename))
      .outputPdf("blob");

    return { blob, filename };
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}
