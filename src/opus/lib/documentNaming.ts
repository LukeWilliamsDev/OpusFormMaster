export type DocumentKind = "quote" | "invoice";

export function formatJobReference(number: number, year = new Date().getFullYear()): string {
  return `JOB-${String(year).slice(-2)}-${String(number).padStart(4, "0")}`;
}

export function formatQuoteReference(number: number, year = new Date().getFullYear()): string {
  return `Q-${String(year).slice(-2)}-${String(number).padStart(4, "0")}`;
}

export function formatInvoiceReference(number: number, year = new Date().getFullYear()): string {
  return `INV-${String(year).slice(-2)}-${String(number).padStart(4, "0")}`;
}

export function formatReferenceForJob(
  kind: "quote" | "invoice",
  jobRef: string | null | undefined,
): string | null {
  const match = jobRef?.match(/^JOB-(\d{2})-(\d{4})$/i);
  if (!match) return null;
  return `${kind === "quote" ? "Q" : "INV"}-${match[1]}-${match[2]}`;
}

export function computeDocSequenceLabel(kind: DocumentKind, sequence: number): string {
  const prefix = kind === "quote" ? "Quote" : "Invoice";
  const padded = String(sequence).padStart(2, "0");
  return `${prefix}-${padded}`;
}

export function computeDocumentLabel(opts: {
  jobRef: string;
  kind: DocumentKind;
  sequence: number;
}): string {
  return `${computeDocSequenceLabel(opts.kind, opts.sequence)}_${opts.jobRef}`;
}

export function documentPdfFilename(label: string): string {
  return `OpusForm_${label}.pdf`;
}
