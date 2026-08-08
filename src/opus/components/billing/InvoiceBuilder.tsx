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
import { BillItemsEditor } from "./BillItemsEditor";
import {
  BillItem,
  BillClientInfo,
  computeTotals,
  emptyClientInfo,
  generateBillReference,
} from "../../lib/billing";

interface InvoiceBuilderProps {
  jobId: string;
  invoiceId?: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const InvoiceBuilder: React.FC<InvoiceBuilderProps> = ({
  jobId,
  invoiceId,
  open,
  onClose,
  onSaved,
}) => {
  const [reference, setReference] = useState("");
  const [clientInfo, setClientInfo] = useState<BillClientInfo>(emptyClientInfo());
  const [items, setItems] = useState<BillItem[]>([]);
  const [vatRate, setVatRate] = useState(20);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (invoiceId) {
      supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            handleError(error, { message: "Failed to load invoice" });
            return;
          }
          setReference(data.reference);
          setClientInfo((data.client_info as unknown as BillClientInfo) || emptyClientInfo());
          setItems((data.items as unknown as BillItem[]) || []);
          setVatRate(data.vat_rate);
        });
    } else {
      setReference(generateBillReference("INV"));
      setClientInfo(emptyClientInfo());
      setItems([]);
      setVatRate(20);
    }
  }, [open, invoiceId]);

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error("Add at least one line item before saving.");
      return;
    }
    setSaving(true);
    try {
      const row = {
        id: invoiceId,
        job_id: jobId,
        reference,
        client_info: clientInfo as unknown as Json,
        items: items as unknown as Json,
        vat_rate: vatRate,
        totals: totals as unknown as Json,
      };
      const { error } = await supabase.from("invoices").upsert(row);
      if (error) throw error;
      toast.success(invoiceId ? "Invoice updated" : "Invoice saved");
      onSaved();
      onClose();
    } catch (err) {
      const { message } = handleError(err, { message: "Failed to save invoice" });
      toast.error("SAVE FAILED", { description: message });
    } finally {
      setSaving(false);
    }
  };

  const totals = computeTotals(items, vatRate);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {invoiceId ? "Edit Invoice" : "New Invoice"} #{reference}
          </DialogTitle>
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
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
