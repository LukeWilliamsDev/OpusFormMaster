import React, { useEffect, useState } from "react";
import { Plus, FileText, Loader, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "../../../integrations/supabase/client";
import { BillItem, BillClientInfo, computeTotals } from "../../lib/billing";
import { generateQuotePdfBlob } from "../../lib/quotePdf";

export interface InvoiceRow {
  id: string;
  reference: string;
  date: string;
  status: string;
  items: BillItem[];
  vat_rate: number;
  client_info: BillClientInfo;
}

interface InvoiceListProps {
  jobId: string;
  refreshKey: number;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onCreateNew: () => void;
  onCreateInvoice: () => void;
  embedded?: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-secondary border-border text-muted-foreground",
  sent: "bg-primary/10 border-primary/20 text-primary",
  billed: "bg-success/10 border-success/20 text-success",
};

export const InvoiceList: React.FC<InvoiceListProps> = ({
  jobId,
  refreshKey,
  selectedIds,
  onToggleSelect,
  onCreateNew,
  onCreateInvoice,
  embedded = false,
}) => {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("invoices")
      .select("id, reference, date, status, items, vat_rate, client_info")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setInvoices(data as unknown as InvoiceRow[]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId, refreshKey]);

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const downloadPdf = async (invoice: InvoiceRow) => {
    setDownloadingPdf(true);
    try {
      const totals = computeTotals(invoice.items || [], invoice.vat_rate);
      const { blob, filename } = await generateQuotePdfBlob({
        reference: invoice.reference,
        clientInfo: invoice.client_info,
        items: invoice.items,
        totals,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Couldn't generate PDF", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground leading-tight">Quotes</h3>
          <p className="text-xs text-muted-foreground leading-tight">
            Select any not yet billed to create an invoice
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedIds.length > 0 && (
            <>
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
                {selectedIds.length} selected
              </span>
              <Button size="sm" onClick={onCreateInvoice} className="gap-1.5 shrink-0">
                Create Invoice
              </Button>
            </>
          )}
          <Button size="sm" onClick={onCreateNew} variant="secondary" className="gap-1.5 shrink-0">
            <Plus className="w-3.5 h-3.5" /> New Quote
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Loader className="w-4 h-4 animate-spin text-primary" />
          <span>Loading quotes...</span>
        </div>
      ) : invoices.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted-foreground text-sm font-semibold">
          No quotes yet for this job
        </div>
      ) : (
        <div className="divide-y divide-border">
          {invoices.map((inv) => {
            const totals = computeTotals(inv.items || [], inv.vat_rate);
            const badgeColor = STATUS_BADGE[inv.status] || STATUS_BADGE.draft;
            return (
              <div
                key={inv.id}
                className="py-2.5 grid grid-cols-[24px_24px_88px_auto_1fr_100px_100px] items-center gap-x-2.5 cursor-pointer hover:bg-accent/40 -mx-4 px-4"
                onClick={() => setPreviewInvoice(inv)}
              >
                <label
                  className={`w-6 h-6 flex items-center justify-center ${
                    inv.status === "billed" ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                  onClick={(e) => e.stopPropagation()}
                  title={inv.status === "billed" ? "Already billed" : undefined}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(inv.id)}
                    disabled={inv.status === "billed"}
                    onChange={() => onToggleSelect(inv.id)}
                    className="w-5 h-5 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </label>
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                </div>
                <span
                  className={`w-fit px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize border ${badgeColor}`}
                >
                  {inv.status}
                </span>
                <span className="text-sm font-semibold truncate">#{inv.reference}</span>
                <span aria-hidden />
                <span className="text-xs text-muted-foreground">{inv.date}</span>
                <span className="text-sm font-bold text-right">
                  £{totals.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <div
      className={embedded ? "space-y-4" : "bg-card border border-border rounded-xl p-4 space-y-4"}
    >
      {content}

      <Dialog open={!!previewInvoice} onOpenChange={(next) => !next && setPreviewInvoice(null)}>
        <DialogContent className="lg:max-w-lg">
          {previewInvoice && (
            <>
              <DialogHeader>
                <DialogTitle>#{previewInvoice.reference}</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-between gap-3 -mt-2">
                <span className="text-xs text-muted-foreground">
                  {previewInvoice.date} · {previewInvoice.status.toUpperCase()}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 shrink-0"
                  disabled={downloadingPdf}
                  onClick={() => downloadPdf(previewInvoice)}
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </Button>
              </div>
              <div className="divide-y border rounded-lg">
                {(previewInvoice.items || []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="flex-1">{item.description}</span>
                    <span className="text-muted-foreground w-20 text-right">
                      {item.quantity} {item.unit}
                    </span>
                    <span className="w-24 text-right">
                      £{Number(item.rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end text-sm pt-2 border-t">
                {(() => {
                  const totals = computeTotals(previewInvoice.items || [], previewInvoice.vat_rate);
                  return (
                    <div className="text-right">
                      <div>
                        Net: £
                        {totals.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div className="font-bold">
                        Gross: £
                        {totals.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
