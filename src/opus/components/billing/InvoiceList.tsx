import React, { useEffect, useState } from "react";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  onSelectInvoice: (id: string) => void;
  onCreateNew: () => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  jobId,
  refreshKey,
  selectedIds,
  onToggleSelect,
  onSelectInvoice,
  onCreateNew,
}) => {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Quotes
        </h3>
        <Button size="sm" onClick={onCreateNew} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Quote
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No quotes yet for this job.</p>
      ) : (
        <div className="divide-y border rounded-lg">
          {invoices.map((inv) => {
            const totals = computeTotals(inv.items || [], inv.vat_rate);
            return (
              <div
                key={inv.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-accent/40 cursor-pointer"
                onClick={() => onSelectInvoice(inv.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(inv.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onToggleSelect(inv.id)}
                  className="shrink-0"
                />
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium flex-1">#{inv.reference}</span>
                <span className="text-xs text-muted-foreground">{inv.date}</span>
                <span className="text-sm font-semibold">
                  £{totals.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {inv.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
