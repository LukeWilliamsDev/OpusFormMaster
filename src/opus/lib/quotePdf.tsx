// Standalone quote PDF template + headless generator, shared by the live
// QuoteInvoiceBuilder editor and any code that needs a PDF from a saved
// quote row without the editor mounted (e.g. converting a quote to a job).
import React from "react";
import ReactDOM from "react-dom/client";

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number | string;
}

interface Quote {
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

// Pure template: identical markup to the live QuoteInvoiceBuilder preview, but
// driven entirely by a Quote object + terms list instead of component state.
export const QuotePdfDocument = ({
  quote,
  terms,
  scaleValue = 1,
  isPrintTarget = false,
}: {
  quote: Quote;
  terms: string[];
  scaleValue?: number;
  isPrintTarget?: boolean;
}) => {
  const { reference, clientInfo, items, totals } = quote;
  return (
    <div
      className={`bg-white shadow-2xl text-slate-900 flex flex-col origin-top shrink-0 ${isPrintTarget ? "print-area" : ""}`}
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
        <img src="/opus-form-primary-dark.svg" alt="Opus Form" className="h-9 sm:h-10 w-auto" />
        <div className="text-right">
          <div className="inline-block bg-white text-[#1b1c20] text-[22px] sm:text-[26px] font-black tracking-[0.08em] leading-none mb-4 px-3 py-1.5 rounded">
            QUOTE
          </div>
          <div className="flex items-center justify-end gap-5">
            <div className="text-right">
              <div className="text-[9.5px] text-stone-500 uppercase tracking-[0.12em]">
                Reference
              </div>
              <div className="inline-block bg-white text-[#1b1c20] text-[12.5px] font-black mt-0.5 px-2 py-0.5 rounded">
                #{reference}
              </div>
            </div>
            <div className="w-px h-7 bg-[#2b2c32]" />
            <div className="text-right">
              <div className="text-[9.5px] text-stone-500 uppercase tracking-[0.12em]">Date</div>
              <div className="inline-block bg-white text-[#1b1c20] text-[12.5px] font-black mt-0.5 px-2 py-0.5 rounded">
                {new Date().toLocaleDateString("en-GB")}
              </div>
            </div>
            <div className="w-px h-7 bg-[#2b2c32]" />
            <div className="text-right">
              <div className="text-[9.5px] text-stone-500 uppercase tracking-[0.12em]">
                Valid Until
              </div>
              <div className="inline-block bg-white text-[#1b1c20] text-[12.5px] font-black mt-0.5 px-2 py-0.5 rounded">
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
            <div className="border border-stone-200 p-4 min-h-[72px] text-xs">
              {clientInfo?.entity ? (
                <div className="space-y-1">
                  <p className="font-black text-gray-900 text-sm">{clientInfo.entity}</p>
                  <p className="text-muted-foreground tracking-wide">
                    {clientInfo.email ? clientInfo.email.toLowerCase() : "..."}
                  </p>
                </div>
              ) : (
                <span className="text-stone-400">No client data entered</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-black tracking-[0.14em] uppercase text-primary mb-1.5">
              Project
            </div>
            <div className="border border-stone-200 p-4 min-h-[72px] text-xs">
              {clientInfo?.site ? (
                <div className="space-y-1">
                  <p className="font-black text-gray-900 text-sm">{clientInfo.site}</p>
                  <p className="text-muted-foreground tracking-wide">
                    {clientInfo.postcode || "..."}
                  </p>
                </div>
              ) : (
                <span className="text-stone-400">No project data entered</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1">
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
                  <span className="inline-block bg-white text-[#1b1c20] text-[10px] font-black uppercase px-1.5 py-1 rounded whitespace-nowrap">
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
        <div className="flex justify-end border-t-2 border-[#1b1c20]">
          <div className="w-[280px]">
            <div className="flex justify-between p-2 px-3 text-xs border-b border-stone-200 text-stone-600">
              <span className="uppercase tracking-widest">NET SUBTOTAL</span>
              <span className="font-black text-slate-900">
                £{(totals?.netTotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center p-3.5 px-3 bg-[#1b1c20] text-white font-black text-[15px]">
              <span className="uppercase tracking-widest">Total</span>
              <span className="inline-block bg-white text-[#1b1c20] px-2.5 py-1 rounded text-[14px]">
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
        <div className="bg-stone-50 border-l-[3px] border-primary p-4 mb-6">
          <div className="text-[11px] font-black tracking-[0.12em] uppercase text-primary mb-2.5">
            Standard Terms & Pour Conditions
          </div>
          <ul className="space-y-1.5">
            {terms.map(
              (term: string, index: number) =>
                term.trim() && (
                  <li
                    key={index}
                    className="text-[10.5px] text-stone-700 leading-relaxed pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[6px] before:w-[5px] before:h-[5px] before:bg-primary"
                  >
                    {term}
                  </li>
                ),
            )}
          </ul>
        </div>
        <div className="mb-8">
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
                  <div className="font-black text-slate-900 text-[11px] mt-0.5">{field.value}</div>
                </div>
                {idx < arr.length - 1 && <div className="w-px h-7 bg-stone-200" />}
              </div>
            ))}
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

// html2canvas cannot parse modern CSS color functions and crashes the PDF render;
// resolve each one to its real rgb() equivalent so text/backgrounds keep the right
// color instead of a flat fallback. Reading `ctx.fillStyle` back after assignment
// doesn't work here — Chrome's canvas getter echoes oklch() input verbatim rather
// than normalizing it — so actually rasterize a pixel and read its RGBA bytes back.
const resolveToRgb = (() => {
  let ctx: CanvasRenderingContext2D | null = null;
  return (colorFn: string) => {
    if (!ctx) {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      ctx = canvas.getContext("2d");
    }
    if (!ctx) return "#333333";
    try {
      ctx.fillStyle = colorFn;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
    } catch {
      return "#333333";
    }
  };
})();

// Paren-balanced replace: color-mix(in oklab, oklch(...) 50%, white) nests functions,
// so a non-greedy [^)]* regex would stop at the first inner ")" and mangle the value.
const stripUnsupportedColorFunctions = (text: string) => {
  const starters = /\b(?:oklch|oklab|lch|lab|color-mix)\(/g;
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = starters.exec(text))) {
    const start = match.index;
    let depth = 1;
    let i = starters.lastIndex;
    while (i < text.length && depth > 0) {
      if (text[i] === "(") depth++;
      else if (text[i] === ")") depth--;
      i++;
    }
    result += text.slice(lastIndex, start) + resolveToRgb(text.slice(start, i));
    lastIndex = i;
    starters.lastIndex = i;
  }
  return result + text.slice(lastIndex);
};

const buildHtml2PdfOptions = (filename: string, originalElement: HTMLElement) => ({
  margin: 0,
  filename,
  image: { type: "png" },
  html2canvas: {
    scale: 2,
    useCORS: true,
    logging: false,
    scrollX: 0,
    scrollY: 0,
    // html2canvas's word-spacing measurement collapses to 0 for some font/weight
    // combos (see comment below) — per-character rendering sidesteps it entirely.
    letterRendering: true,
    onclone: (_document: Document, clonedElement: HTMLElement) => {
      const cloneDoc = clonedElement.ownerDocument;
      if (cloneDoc?.body) {
        cloneDoc.body.style.margin = "0";
        cloneDoc.body.style.padding = "0";
        cloneDoc.body.style.background = "transparent";
      }
      // html2canvas measures text with its own manual glyph-width table, which isn't
      // calibrated for the app's variable webfont ("Public Sans") — especially at the
      // 900 weight used for totals/dates/bank details. That mismatch makes characters
      // overlap: at normal weight it drops spaces (words run together), and at bold
      // weight the overlap is dense enough to look like a solid highlighted block.
      // Force a metrically-safe system font stack for the capture only.
      clonedElement.style.setProperty("font-family", "Arial, Helvetica, sans-serif", "important");

      // NOTE: deliberately NOT stripping/replacing the document's <style>/<link> tags
      // here. An earlier version rebuilt one flattened stylesheet from cssText, which
      // silently destroyed Tailwind's @layer cascade order (utilities no longer reliably
      // outrank base/component rules) — white-on-dark text fell back to the wrong
      // inherited dark color. The inline !important overrides below are what actually
      // neutralize oklch for html2canvas's parser; leaving the real stylesheets in place
      // keeps every non-color style (and cascade order) correct.
      const fontFixEl = cloneDoc.createElement("style");
      fontFixEl.textContent =
        "*,*::before,*::after{font-family:Arial,Helvetica,sans-serif!important;" +
        "-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}" +
        ".font-black,.font-black *{font-weight:700!important;}";
      cloneDoc.head.appendChild(fontFixEl);

      cloneDoc.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
        const inline = el.getAttribute("style");
        if (inline && /(oklch|oklab|lch|lab)\(/.test(inline)) {
          el.setAttribute("style", stripUnsupportedColorFunctions(inline));
        }
      });

      // Belt-and-braces sweep, same approach as the live editor's PDF path: colors
      // reach the canvas via any computed property (color, box-shadow, gradients,
      // ring shadows...) once resolved through var()/color-mix(), which the
      // source-text regex above never sees. Cover ancestors too since html2canvas
      // walks the chain up to <html>/<body> for stacking context.
      const originalAncestors = [document.documentElement, document.body];
      const clonedAncestors = cloneDoc ? [cloneDoc.documentElement, cloneDoc.body] : [];
      const originalNodes = [
        ...originalAncestors,
        originalElement,
        ...Array.from(originalElement.querySelectorAll<HTMLElement>("*")),
      ];
      const clonedNodes = [
        ...clonedAncestors,
        clonedElement,
        ...Array.from(clonedElement.querySelectorAll<HTMLElement>("*")),
      ];
      const unsupportedColorFn = /\b(?:oklch|oklab|lch|lab|color-mix)\(/;
      originalNodes.forEach((original, i) => {
        const clone = clonedNodes[i];
        if (!clone) return;
        const computed = window.getComputedStyle(original);
        for (let p = 0; p < computed.length; p++) {
          const prop = computed.item(p);
          const value = computed.getPropertyValue(prop);
          if (value && unsupportedColorFn.test(value)) {
            clone.style.setProperty(prop, stripUnsupportedColorFunctions(value), "important");
          }
        }
      });

      const cloneWin = cloneDoc?.defaultView;
      if (cloneWin) {
        clonedNodes.forEach((node) => {
          const c = cloneWin.getComputedStyle(node);
          for (let p = 0; p < c.length; p++) {
            const prop = c.item(p);
            const value = c.getPropertyValue(prop);
            if (value && unsupportedColorFn.test(value)) {
              node.style.setProperty(prop, stripUnsupportedColorFunctions(value), "important");
            }
          }
        });
      }

      if (cloneDoc) {
        let pseudoCss = "";
        let pseudoId = 0;
        ["::before", "::after"].forEach((pseudo) => {
          originalNodes.forEach((original, i) => {
            const clone = clonedNodes[i];
            if (!clone) return;
            const computed = window.getComputedStyle(original, pseudo);
            const leaking: string[] = [];
            for (let p = 0; p < computed.length; p++) {
              const prop = computed.item(p);
              const value = computed.getPropertyValue(prop);
              if (value && unsupportedColorFn.test(value)) {
                leaking.push(`${prop}: ${stripUnsupportedColorFunctions(value)} !important;`);
              }
            }
            if (leaking.length > 0) {
              let id = clone.getAttribute("data-pdf-fix");
              if (!id) {
                pseudoId += 1;
                id = String(pseudoId);
                clone.setAttribute("data-pdf-fix", id);
              }
              pseudoCss += `[data-pdf-fix="${id}"]${pseudo}{${leaking.join(" ")}}\n`;
            }
          });
        });
        if (pseudoCss) {
          const pseudoStyleEl = cloneDoc.createElement("style");
          pseudoStyleEl.textContent = pseudoCss;
          cloneDoc.head.appendChild(pseudoStyleEl);
        }
      }
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
export async function generateQuotePdfBlob(quote: Quote) {
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
    const printArea = container.querySelector(".print-area") as HTMLElement;
    const worker = html2pdf();
    const blob = await worker
      .from(printArea)
      .set(buildHtml2PdfOptions(filename, printArea) as unknown as Parameters<typeof worker.set>[0])
      .outputPdf("blob");

    return { blob, filename };
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}
