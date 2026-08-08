import React, { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
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
  onClose: () => void;
  onSaved: () => void;
}

export const InvoiceBuilder: React.FC<InvoiceBuilderProps> = ({
  jobId,
  invoiceId,
  onClose,
  onSaved,
}) => {
  const [reference, setReference] = useState("");
  const [clientInfo, setClientInfo] = useState<BillClientInfo>(emptyClientInfo());
  const [items, setItems] = useState<BillItem[]>([]);
  const [vatRate, setVatRate] = useState(20);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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
  }, [invoiceId]);

  const totals = computeTotals(items, vatRate);

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Invoices
        </button>
        <h2 className="text-lg font-bold">
          {invoiceId ? "Edit Invoice" : "New Invoice"} #{reference}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-2xl">
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

      <div className="flex items-center justify-end gap-4 border-t pt-4">
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
          <div>Net: £{totals.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="font-bold">
            Gross: £{totals.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Invoice"}
        </Button>
      </div>
    </div>
  );
};
