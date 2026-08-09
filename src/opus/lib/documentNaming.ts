export type DocumentKind = "quote" | "invoice";

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
