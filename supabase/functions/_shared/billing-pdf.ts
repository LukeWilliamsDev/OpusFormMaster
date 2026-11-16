import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "https://esm.sh/pdf-lib@1.17.1?target=deno";
import {
  formatUKDate,
  lineTotal,
  reconcileFinancials,
  type ReconciledFinancials,
} from "./billing-pdf-financials.ts";

export { formatUKDate, lineTotal, reconcileFinancials } from "./billing-pdf-financials.ts";

export type BillingDocumentKind = "quote" | "invoice" | "final_bill";

export interface PersistedBillingDocument {
  kind: BillingDocumentKind;
  reference: string;
  date: string;
  jobRef?: string | null;
  clientInfo: Record<string, unknown>;
  items: unknown[];
  vatRate: unknown;
  totals: unknown;
}

export interface RenderedBillingPdf {
  bytes: Uint8Array;
  base64: string;
  sha256: string;
  byteSize: number;
  filename: string;
  financials: ReconciledFinancials;
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 36;
const DARK = rgb(0.106, 0.11, 0.125);
const ACCENT = rgb(0.71, 0.396, 0.114);
const TEXT = rgb(0.11, 0.12, 0.13);
const MUTED = rgb(0.35, 0.33, 0.31);
const LIGHT = rgb(0.96, 0.945, 0.92);
const BORDER = rgb(0.84, 0.82, 0.78);

function rateValue(value: unknown): number {
  if (value === null || value === undefined || value === "") {
    throw new Error("Persisted billing line item rate is invalid.");
  }
  if (typeof value === "string" && !["included", "incl"].includes(value.trim().toLowerCase())) {
    const normalized = value
      .trim()
      .replaceAll("£", "")
      .replaceAll("$", "")
      .replaceAll("€", "")
      .replaceAll(",", "")
      .split(/\s/)
      .join("");
    if (!normalized || !Number.isFinite(Number(normalized)) || Number(normalized) < 0) {
      throw new Error("Persisted billing line item rate is invalid.");
    }
  }
  if (typeof value === "string" && ["included", "incl"].includes(value.trim().toLowerCase())) {
    return 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[£$€,	\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return Number(value || 0);
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim().replace(/[^\u0000-\u00ff]/g, "?") : fallback;
}

function wrap(value: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function drawWrapped(
  page: PDFPage,
  value: string,
  x: number,
  y: number,
  width: number,
  font: PDFFont,
  size: number,
  color = TEXT,
  lineHeight = size + 3,
): number {
  const lines = wrap(value, font, size, width);
  lines.forEach((line, index) => {
    page.drawText(line, { x, y: y - index * lineHeight, size, font, color });
  });
  return lines.length * lineHeight;
}

function money(value: number): string {
  return `£${value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function base64(bytes: Uint8Array): string {
  let result = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    result += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(result);
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function drawTableHeader(page: PDFPage, y: number, regular: PDFFont, bold: PDFFont): number {
  page.drawRectangle({
    x: MARGIN,
    y: y - 18,
    width: PAGE_WIDTH - MARGIN * 2,
    height: 22,
    color: DARK,
  });
  page.drawText("Description", {
    x: MARGIN + 8,
    y: y - 11,
    size: 8,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Qty", { x: 345, y: y - 11, size: 8, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Unit", { x: 390, y: y - 11, size: 8, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Rate", { x: 430, y: y - 11, size: 8, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Net", { x: 510, y: y - 11, size: 8, font: bold, color: rgb(1, 1, 1) });
  return y - 30;
}

export async function renderBillingPdf(
  input: PersistedBillingDocument,
): Promise<RenderedBillingPdf> {
  const financials = reconcileFinancials(input.items, input.totals, input.vatRate);
  const client = input.clientInfo || {};
  const safeReference = text(input.reference, "document");
  const safeJobRef = text(input.jobRef);
  const title =
    input.kind === "quote" ? "QUOTATION" : input.kind === "invoice" ? "INVOICE" : "FINAL BILL";
  const documentDate = formatUKDate(input.date);
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const drawPageHeader = () => {
    const logoSize = 11;
    const logoGap = 4;
    const logoDotRadius = 1.5;
    const logoY = PAGE_HEIGHT - 42;
    const opusWidth = bold.widthOfTextAtSize("OPUS", logoSize);
    const dotX = MARGIN + opusWidth + logoGap + logoDotRadius;
    const formX = dotX + logoDotRadius + logoGap;
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 88, width: PAGE_WIDTH, height: 88, color: DARK });
    page.drawText("OPUS", {
      x: MARGIN,
      y: logoY,
      size: logoSize,
      font: bold,
      color: rgb(0.91, 0.9, 0.87),
    });
    page.drawCircle({ x: dotX, y: logoY + logoSize * 0.36, size: logoDotRadius, color: ACCENT });
    page.drawText("FORM", {
      x: formX,
      y: logoY,
      size: logoSize,
      font: bold,
      color: rgb(0.91, 0.9, 0.87),
    });
    page.drawText(title, {
      x: PAGE_WIDTH - 170,
      y: PAGE_HEIGHT - 38,
      size: 18,
      font: bold,
      color: rgb(1, 1, 1),
    });
    page.drawText(`Reference  ${safeReference}`, {
      x: PAGE_WIDTH - 200,
      y: PAGE_HEIGHT - 61,
      size: 8,
      font: regular,
      color: rgb(0.84, 0.84, 0.82),
    });
    page.drawText(`Date  ${documentDate}`, {
      x: PAGE_WIDTH - 200,
      y: PAGE_HEIGHT - 74,
      size: 8,
      font: regular,
      color: rgb(0.84, 0.84, 0.82),
    });
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 92, width: PAGE_WIDTH, height: 4, color: ACCENT });
  };

  drawPageHeader();
  y = PAGE_HEIGHT - 124;
  if (safeJobRef) {
    page.drawText(`Job reference: ${safeJobRef}`, {
      x: MARGIN,
      y,
      size: 9,
      font: bold,
      color: MUTED,
    });
    y -= 18;
  }

  page.drawText("CLIENT", { x: MARGIN, y, size: 8, font: bold, color: ACCENT });
  page.drawText("PROJECT", { x: 310, y, size: 8, font: bold, color: ACCENT });
  y -= 12;
  page.drawRectangle({
    x: MARGIN,
    y: y - 44,
    width: 250,
    height: 50,
    borderColor: BORDER,
    borderWidth: 1,
    color: LIGHT,
  });
  page.drawRectangle({
    x: 310,
    y: y - 44,
    width: 249,
    height: 50,
    borderColor: BORDER,
    borderWidth: 1,
    color: LIGHT,
  });
  drawWrapped(page, text(client.entity, "Client"), MARGIN + 10, y - 16, 230, bold, 10);
  drawWrapped(page, text(client.email), MARGIN + 10, y - 33, 230, regular, 8, MUTED);
  drawWrapped(page, text(client.site, "Project"), 320, y - 16, 229, bold, 10);
  drawWrapped(page, text(client.postcode), 320, y - 33, 229, regular, 8, MUTED);
  y -= 76;

  y = drawTableHeader(page, y, regular, bold);
  for (const item of input.items) {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const description = text(row.description, "Line item");
    const lines = wrap(description, regular, 8, 285);
    const rowHeight = Math.max(22, lines.length * 10 + 8);
    if (y - rowHeight < 100) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      drawPageHeader();
      y = PAGE_HEIGHT - 124;
      y = drawTableHeader(page, y, regular, bold);
    }
    page.drawRectangle({
      x: MARGIN,
      y: y - rowHeight + 4,
      width: PAGE_WIDTH - MARGIN * 2,
      height: rowHeight,
      borderColor: BORDER,
      borderWidth: 0.5,
    });
    lines.forEach((line, index) =>
      page.drawText(line, {
        x: MARGIN + 8,
        y: y - 12 - index * 10,
        size: 8,
        font: regular,
        color: TEXT,
      }),
    );
    page.drawText(String(row.quantity ?? ""), {
      x: 345,
      y: y - 12,
      size: 8,
      font: regular,
      color: TEXT,
    });
    page.drawText(text(row.unit), { x: 390, y: y - 12, size: 8, font: regular, color: TEXT });
    const rate = rateValue(row.rate);
    page.drawText(rate === 0 && typeof row.rate === "string" ? "INCLUDED" : money(rate), {
      x: 430,
      y: y - 12,
      size: 8,
      font: regular,
      color: TEXT,
    });
    page.drawText(money(lineTotal(item)), {
      x: 510,
      y: y - 12,
      size: 8,
      font: regular,
      color: TEXT,
    });
    y -= rowHeight;
  }

  if (y < 180) {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawPageHeader();
    y = PAGE_HEIGHT - 124;
  }
  const boxX = 330;
  const boxWidth = 229;
  page.drawRectangle({
    x: boxX,
    y: y - 92,
    width: boxWidth,
    height: 98,
    borderColor: BORDER,
    borderWidth: 1,
    color: LIGHT,
  });
  page.drawText("NET SUBTOTAL", { x: boxX + 12, y: y - 22, size: 8, font: bold, color: MUTED });
  page.drawText(money(financials.netTotal), {
    x: boxX + 150,
    y: y - 22,
    size: 9,
    font: regular,
    color: TEXT,
  });
  page.drawText(`VAT (${financials.vatRate}%)`, {
    x: boxX + 12,
    y: y - 45,
    size: 8,
    font: bold,
    color: MUTED,
  });
  page.drawText(money(financials.vatTotal), {
    x: boxX + 150,
    y: y - 45,
    size: 9,
    font: regular,
    color: TEXT,
  });
  page.drawLine({
    start: { x: boxX + 10, y: y - 57 },
    end: { x: boxX + boxWidth - 10, y: y - 57 },
    thickness: 0.7,
    color: BORDER,
  });
  page.drawText("TOTAL", { x: boxX + 12, y: y - 78, size: 9, font: bold, color: TEXT });
  page.drawText(money(financials.grossTotal), {
    x: boxX + 145,
    y: y - 78,
    size: 11,
    font: bold,
    color: TEXT,
  });
  y -= 125;

  page.drawText("STANDARD TERMS & POUR CONDITIONS", {
    x: MARGIN,
    y,
    size: 8,
    font: bold,
    color: ACCENT,
  });
  y -= 14;
  const terms = [
    "Assumed total pours up to 1; additional pours shall be charged minimum of £3,500.",
    "Cancelled pours with less than 24hrs notice shall be charged.",
    "Day rate per operative is £240 per day and Supervisor rate is £280 per day.",
    `All materials, telehandler and pump to be provided by ${text(client.entity, "Client")}.`,
  ];
  for (const term of terms) {
    if (y < 75) break;
    page.drawCircle({ x: MARGIN + 3, y: y + 2, size: 1.5, color: ACCENT });
    y -=
      drawWrapped(
        page,
        term,
        MARGIN + 12,
        y + 5,
        PAGE_WIDTH - MARGIN * 2 - 12,
        regular,
        7.5,
        MUTED,
        10,
      ) + 3;
  }
  page.drawRectangle({ x: MARGIN, y: 28, width: PAGE_WIDTH - MARGIN * 2, height: 28, color: DARK });
  page.drawText("Opus Form Ltd  ·  Company No. 17228356", {
    x: MARGIN + 10,
    y: 39,
    size: 7.5,
    font: regular,
    color: rgb(0.65, 0.63, 0.6),
  });
  page.drawText("Bank: Tide  ·  Account: Opus Form Ltd  ·  Sort: 04-06-05  ·  Account: 31840773", {
    x: 220,
    y: 39,
    size: 6.5,
    font: regular,
    color: rgb(0.65, 0.63, 0.6),
  });

  const bytes = await pdf.save();
  const hash = await sha256(bytes);
  const kindLabel = input.kind === "final_bill" ? "final-bill" : input.kind;
  const safeFilenameReference =
    safeReference.replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 80) || "document";
  return {
    bytes,
    base64: base64(bytes),
    sha256: hash,
    byteSize: bytes.byteLength,
    filename: `OpusForm_${kindLabel}_${safeFilenameReference}.pdf`,
    financials,
  };
}
