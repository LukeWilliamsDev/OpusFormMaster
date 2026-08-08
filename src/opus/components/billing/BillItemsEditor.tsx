import React from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BillItem, getLineTotal, newBillItem } from "../../lib/billing";

interface BillItemsEditorProps {
  items: BillItem[];
  onChange: (items: BillItem[]) => void;
}

export const BillItemsEditor: React.FC<BillItemsEditorProps> = ({ items, onChange }) => {
  const updateItem = (id: string, patch: Partial<BillItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };
  const removeItem = (id: string) => onChange(items.filter((item) => item.id !== id));
  const addItem = () => onChange([...items, newBillItem()]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_80px_80px_100px_100px_32px] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Description</span>
        <span>Qty</span>
        <span>Unit</span>
        <span>Rate</span>
        <span>Total</span>
        <span />
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          className="grid grid-cols-[1fr_80px_80px_100px_100px_32px] gap-2 items-center"
        >
          <Input
            value={item.description}
            placeholder="Description"
            onChange={(e) => updateItem(item.id, { description: e.target.value })}
          />
          <Input
            type="number"
            value={item.quantity}
            onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) || 0 })}
          />
          <Input
            value={item.unit}
            onChange={(e) => updateItem(item.id, { unit: e.target.value })}
          />
          <Input
            value={item.rate}
            onChange={(e) => updateItem(item.id, { rate: e.target.value })}
          />
          <span className="text-sm font-semibold text-right pr-2">
            £{getLineTotal(item).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => removeItem(item.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1.5">
        <Plus className="w-3.5 h-3.5" /> Add Line Item
      </Button>
    </div>
  );
};
