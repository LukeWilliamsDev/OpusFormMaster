export type DocumentKind = "quote" | "invoice";

export function computeDocumentLabel(opts: {
  jobRef: string;
  kind: DocumentKind;
  sequence: number;
}): string {
  const prefix = opts.kind === "quote" ? "Quote" : "Invoice";
  const padded = String(opts.sequence).padStart(2, "0");
  return `${prefix}-${padded}_${opts.jobRef}`;
}

export function documentPdfFilename(label: string): string {
  return `OpusForm_${label}.pdf`;
}
