import React, { useEffect, useState } from "react";
import { FileText, Loader, CheckCircle2, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "../../../integrations/supabase/client";
import { BillItem, BillClientInfo, computeTotals } from "../../lib/billing";
import { generateBillPdf } from "../../lib/quotePdf";

export interface FinalBillRow {
  id: string;
  reference: string;
  date: string;
  status: string;
  items: BillItem[];
  vat_rate: number;
  client_info: BillClientInfo;
}

interface FinalBillListProps {
  jobId: string;
  refreshKey: number;
  embedded?: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-secondary border-border text-muted-foreground",
  sent: "bg-primary/10 border-primary/20 text-primary",
  paid: "bg-success/10 border-success/20 text-success",
};

export const FinalBillList: React.FC<FinalBillListProps> = ({
  jobId,
  refreshKey,
  embedded = false,
}) => {
  const [bills, setBills] = useState<FinalBillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewBill, setPreviewBill] = useState<FinalBillRow | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [billToMarkPaid, setBillToMarkPaid] = useState<FinalBillRow | null>(null);

  const markAsPaid = async (bill: FinalBillRow) => {
    setMarkingPaid(true);
    const { error } = await supabase
      .from("final_bills")
      .update({ status: "paid" })
      .eq("id", bill.id);
    setMarkingPaid(false);
    if (error) {
      toast.error("Couldn't mark as paid", { description: error.message });
      return;
    }
    setBills((prev) => prev.map((b) => (b.id === bill.id ? { ...b, status: "paid" } : b)));
    setPreviewBill((prev) => (prev && prev.id === bill.id ? { ...prev, status: "paid" } : prev));
    toast.success("Marked as paid");
  };

  const confirmMarkAsPaid = (bill: FinalBillRow) => setBillToMarkPaid(bill);

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const downloadPdf = async (bill: FinalBillRow) => {
    setDownloadingPdf(true);
    try {
      const totals = computeTotals(bill.items || [], bill.vat_rate);
      const { blob, filename } = await generateBillPdf(
        { reference: bill.reference, clientInfo: bill.client_info, items: bill.items, totals },
        { documentTitle: "INVOICE", filenamePrefix: "Invoice" },
      );
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("final_bills")
      .select("id, reference, date, status, items, vat_rate, client_info")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setBills(data as unknown as FinalBillRow[]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId, refreshKey]);

  if (!loading && bills.length === 0) return null;

  const content = (
    <>
      <div>
        <h3 className="text-sm font-bold text-foreground leading-tight">Invoices sent</h3>
        <p className="text-xs text-muted-foreground leading-tight">Already billed to the client</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Loader className="w-4 h-4 animate-spin text-primary" />
          <span>Loading invoices...</span>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {bills.map((bill) => {
            const totals = computeTotals(bill.items || [], bill.vat_rate);
            const badgeColor = STATUS_BADGE[bill.status] || STATUS_BADGE.draft;
            return (
              <div
                key={bill.id}
                className="py-2.5 grid grid-cols-[24px_24px_88px_auto_1fr_100px_100px] items-center gap-x-2.5 cursor-pointer hover:bg-accent/40 -mx-4 px-4"
                onClick={() => setPreviewBill(bill)}
              >
                <span aria-hidden className="w-6 h-6" />
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                </div>
                <span
                  className={`w-fit px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize border ${badgeColor}`}
                >
                  {bill.status}
                </span>
                <span className="text-sm font-semibold truncate">#{bill.reference}</span>
                <span aria-hidden />
                <span className="text-xs text-muted-foreground">{bill.date}</span>
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

      <Dialog open={!!previewBill} onOpenChange={(next) => !next && setPreviewBill(null)}>
        <DialogContent className="lg:max-w-lg">
          {previewBill && (
            <>
              <DialogHeader>
                <DialogTitle>#{previewBill.reference}</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-between gap-3 -mt-2">
                <span className="text-xs text-muted-foreground">
                  {previewBill.date} · {previewBill.status.toUpperCase()}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 shrink-0"
                    disabled={downloadingPdf}
                    onClick={() => downloadPdf(previewBill)}
                  >
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </Button>
                  {previewBill.status === "sent" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 shrink-0"
                      disabled={markingPaid}
                      onClick={() => confirmMarkAsPaid(previewBill)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark as Paid
                    </Button>
                  )}
                </div>
              </div>
              <div className="divide-y border rounded-lg">
                {(previewBill.items || []).map((item, i) => (
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
                  const totals = computeTotals(previewBill.items || [], previewBill.vat_rate);
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

      <ConfirmDialog
        open={!!billToMarkPaid}
        onOpenChange={(open) => {
          if (!open) setBillToMarkPaid(null);
        }}
        tone="neutral"
        tag="Please Confirm"
        title="Mark Invoice as Paid"
        message={
          <>
            Mark invoice{" "}
            <span className="font-bold text-foreground">#{billToMarkPaid?.reference}</span> as paid?
            <div className="mt-3 p-4 bg-white/5 border border-white/5 rounded-lg text-xs font-medium text-muted-foreground leading-relaxed">
              Only do this once payment has actually been received — this doesn't check your bank,
              it just records the invoice as settled.
            </div>
          </>
        }
        confirmLabel="Mark as Paid"
        onConfirm={() => {
          if (billToMarkPaid) markAsPaid(billToMarkPaid);
          setBillToMarkPaid(null);
        }}
      />
    </div>
  );
};
