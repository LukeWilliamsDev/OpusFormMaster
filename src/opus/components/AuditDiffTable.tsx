import React from "react";
import { formatSafeAuditFieldValue, getAuditFieldLabel } from "../utils/auditDiff";

interface DiffItem {
  field: string;
  before: unknown;
  after: unknown;
}

interface AuditDiffTableProps {
  diff: DiffItem[];
}

export const AuditDiffTable: React.FC<AuditDiffTableProps> = ({ diff }) => {
  if (!diff || diff.length === 0) {
    return (
      <span className="text-[10px] text-muted-foreground uppercase font-mono">
        No changes detected in business fields
      </span>
    );
  }

  const renderValue = (field: string, val: unknown) => {
    if (val === undefined || val === null || val === "") {
      return (
        <span className="text-muted-foreground font-mono italic text-[10px]">&lt;empty&gt;</span>
      );
    }
    return <span className="break-all">{formatSafeAuditFieldValue(field, val)}</span>;
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background my-2 max-w-full">
      <table className="w-full text-left border-collapse text-[10px]">
        <thead>
          <tr className="border-b border-border bg-secondary text-muted-foreground uppercase font-bold tracking-wider">
            <th scope="col" className="py-2 px-3 w-1/4">
              Field
            </th>
            <th scope="col" className="py-2 px-3 w-3/8 text-destructive bg-destructive/5">
              Before
            </th>
            <th scope="col" className="py-2 px-3 w-3/8 text-success bg-success/5">
              After
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border font-medium">
          {diff.map((item) => (
            <tr key={item.field} className="hover:bg-secondary/50 transition-colors">
              <td className="py-2 px-3 font-mono text-muted-foreground uppercase text-[9px] tracking-wide align-top">
                {getAuditFieldLabel(item.field)}
              </td>
              <td className="py-2 px-3 bg-destructive/10 text-destructive line-through align-top">
                {renderValue(item.field, item.before)}
              </td>
              <td className="py-2 px-3 bg-success/10 text-success align-top">
                {renderValue(item.field, item.after)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
