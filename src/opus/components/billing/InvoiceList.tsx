import React, { useEffect, useState } from "react";
import { Plus, FileText, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "../../../integrations/supabase/client";
import { BillItem, computeTotals } from "../../lib/billing";

export interface InvoiceRow {
  id: string;
  reference: string;
  date: string;
  status: string;
  items: BillItem[];
  vat_rate: number;
}

interface InvoiceListProps {
  jobId: string;
  refreshKey: number;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onCreateNew: () => void;
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
}) => {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("invoices")
      .select("id, reference, date, status, items, vat_rate")
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

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
          Quotes
        </h3>
        <Button size="sm" onClick={onCreateNew} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Quote
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Loader className="w-4 h-4 animate-spin text-primary" />
          <span>Loading quotes...</span>
        </div>
      ) : invoices.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted-foreground text-[13px] font-bold uppercase tracking-wider">
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
                className="py-2.5 flex flex-wrap sm:flex-nowrap items-center gap-x-2.5 gap-y-1.5 cursor-pointer hover:bg-accent/40 -mx-4 px-4"
                onClick={() => setPreviewInvoice(inv)}
              >
                <label
                  className={`shrink-0 -m-2 p-2 flex items-center ${
                    inv.status === "draft" ? "cursor-pointer" : "cursor-not-allowed"
                  }`}
                  onClick={(e) => e.stopPropagation()}
                  title={inv.status !== "draft" ? "Already billed" : undefined}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(inv.id)}
                    disabled={inv.status !== "draft"}
                    onChange={() => onToggleSelect(inv.id)}
                    className="shrink-0 w-4 h-4 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </label>
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-widest border shrink-0 ${badgeColor}`}
                >
                  {inv.status}
                </span>
                <span className="text-sm font-semibold flex-1 min-w-[90px]">#{inv.reference}</span>
                <span className="text-xs text-muted-foreground">{inv.date}</span>
                <span className="text-sm font-bold">
                  £{totals.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!previewInvoice} onOpenChange={(next) => !next && setPreviewInvoice(null)}>
        <DialogContent className="max-w-lg">
          {previewInvoice && (
            <>
              <DialogHeader>
                <DialogTitle>#{previewInvoice.reference}</DialogTitle>
              </DialogHeader>
              <div className="text-xs text-muted-foreground -mt-2">
                {previewInvoice.date} · {previewInvoice.status.toUpperCase()}
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
