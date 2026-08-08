import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "../../../integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { handleError } from "../../utils/errorHandler";
import { generateBillPdf } from "../../lib/quotePdf";
import { BillItemsEditor } from "./BillItemsEditor";
import {
  BillItem,
  BillClientInfo,
  computeTotals,
  emptyClientInfo,
  generateBillReference,
} from "../../lib/billing";

interface FinalBillBuilderProps {
  jobId: string;
  sourceInvoiceIds: string[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const FinalBillBuilder: React.FC<FinalBillBuilderProps> = ({
  jobId,
  sourceInvoiceIds,
  open,
  onClose,
  onSaved,
}) => {
  const [finalBillId, setFinalBillId] = useState<string | undefined>(undefined);
  const [reference, setReference] = useState("");
  const [clientInfo, setClientInfo] = useState<BillClientInfo>(emptyClientInfo());
  const [items, setItems] = useState<BillItem[]>([]);
  const [vatRate, setVatRate] = useState(20);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      // Look for an existing draft final bill built from these exact invoices
      const { data: existing } = await supabase
        .from("final_bills")
        .select("*")
        .eq("job_id", jobId)
        .eq("status", "draft")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setFinalBillId(existing.id);
        setReference(existing.reference);
        setClientInfo((existing.client_info as unknown as BillClientInfo) || emptyClientInfo());
        setItems((existing.items as unknown as BillItem[]) || []);
        setVatRate(existing.vat_rate);
        return;
      }

      // Merge line items from the selected invoices
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select("id, client_info, items")
        .in("id", sourceInvoiceIds);

      if (error || !invoices) {
        handleError(error, { message: "Failed to load invoices for merge" });
        return;
      }

      const mergedItems: BillItem[] = invoices.flatMap((inv) =>
        ((inv.items as unknown as BillItem[]) || []).map((item) => ({
          ...item,
          id: crypto.randomUUID(),
          sourceInvoiceId: inv.id,
        })),
      );
      const firstClientInfo =
        (invoices[0]?.client_info as unknown as BillClientInfo) || emptyClientInfo();

      setFinalBillId(undefined);
      setReference(generateBillReference("BILL"));
      setClientInfo(firstClientInfo);
      setItems(mergedItems);
      setVatRate(20);
    })();
  }, [open, jobId, sourceInvoiceIds]);

  const totals = computeTotals(items, vatRate);

  const saveDraft = async (): Promise<string | null> => {
    const row = {
      id: finalBillId,
      job_id: jobId,
      reference,
      client_info: clientInfo as unknown as Json,
      items: items as unknown as Json,
      source_invoice_ids: sourceInvoiceIds,
      vat_rate: vatRate,
      totals: totals as unknown as Json,
    };
    const { data, error } = await supabase.from("final_bills").upsert(row).select("id").single();
    if (error || !data) throw error;
    setFinalBillId(data.id);
    return data.id;
  };

  const handleSaveDraft = async () => {
    if (items.length === 0) {
      toast.error("No line items to save.");
      return;
    }
    setSaving(true);
    try {
      await saveDraft();
      toast.success("Final bill draft saved");
      onSaved();
    } catch (err) {
      const { message } = handleError(err, { message: "Failed to save final bill" });
      toast.error("SAVE FAILED", { description: message });
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!clientInfo.email.trim()) {
      toast.error("Client email is required to send the final bill.");
      return;
    }
    if (items.length === 0) {
      toast.error("No line items to send.");
      return;
    }
    setSending(true);
    const sendingToastId = toast.loading("SENDING FINAL BILL", {
      description: "Generating PDF and sending...",
    });
    try {
      const id = await saveDraft();

      const { blob } = await generateBillPdf(
        { reference, clientInfo, items, totals },
        { documentTitle: "FINAL BILL", filenamePrefix: "FinalBill" },
      );
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const base64 = await base64Promise;

      const { error } = await supabase.functions.invoke("send-final-bill", {
        body: {
          finalBillId: id,
          clientName: clientInfo.entity,
          siteName: clientInfo.site,
          postcode: clientInfo.postcode,
          billRef: reference,
          pdfBase64: base64,
          netTotal: totals.netTotal,
          grossTotal: totals.grossTotal,
        },
      });
      if (error) {
        let errMsg = error.message;
        try {
          const errBody = await error.context?.json();
          if (errBody?.error) errMsg = errBody.error;
        } catch (_) {
          // fallback to default message
        }
        throw new Error(errMsg);
      }

      toast.success("FINAL BILL SENT", {
        id: sendingToastId,
        description: "Email sent successfully.",
      });
      onSaved();
      onClose();
    } catch (err) {
      const { message } = handleError(err, { message: "Failed to send final bill" });
      toast.error("SEND FAILED", { id: sendingToastId, description: message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Final Bill #{reference}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Client name"
            value={clientInfo.entity}
            onChange={(e) => setClientInfo({ ...clientInfo, entity: e.target.value })}
          />
          <Input
            placeholder="Client email"
            value={clientInfo.email}
            onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
          />
          <Input
            placeholder="Site"
            value={clientInfo.site}
            onChange={(e) => setClientInfo({ ...clientInfo, site: e.target.value })}
          />
          <Input
            placeholder="Postcode"
            value={clientInfo.postcode}
            onChange={(e) => setClientInfo({ ...clientInfo, postcode: e.target.value })}
          />
        </div>

        <BillItemsEditor items={items} onChange={setItems} />

        <div className="flex items-center justify-end gap-4 border-t pt-3">
          <label className="flex items-center gap-2 text-sm">
            VAT %
            <Input
              type="number"
              className="w-20"
              value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value) || 0)}
            />
          </label>
          <div className="text-right text-sm">
            <div>
              Net: £{totals.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="font-bold">
              Gross: £{totals.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleSaveDraft} disabled={saving || sending}>
            {saving ? "Saving..." : "Save Draft"}
          </Button>
          <Button onClick={handleSend} disabled={saving || sending}>
            {sending ? "Sending..." : "Send Final Bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
