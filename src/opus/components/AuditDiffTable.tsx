import React from "react";

interface DiffItem {
  field: string;
  before: any;
  after: any;
}

interface AuditDiffTableProps {
  diff: DiffItem[];
}

export const AuditDiffTable: React.FC<AuditDiffTableProps> = ({ diff }) => {
  if (!diff || diff.length === 0) {
    return (
      <span className="text-[10px] text-zinc-500 uppercase font-mono">
        No changes detected in business fields
      </span>
    );
  }

  const renderValue = (val: any) => {
    if (val === undefined || val === null) {
      return <span className="text-zinc-500 font-mono italic text-[10px]">&lt;empty&gt;</span>;
    }
    if (typeof val === "object") {
      return (
        <span className="font-mono text-[10px] text-zinc-400 break-all">{JSON.stringify(val)}</span>
      );
    }
    return <span className="break-all">{String(val)}</span>;
  };

  const getFriendlyFieldName = (field: string) => {
    return field.replace(/_/g, " ");
  };

  return (
    <div className="border border-white/5 rounded-lg overflow-hidden bg-black/15 my-2 max-w-full">
      <table className="w-full text-left border-collapse text-[10px]">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.02] text-[#666] uppercase font-bold tracking-wider">
            <th className="py-2 px-3 w-1/4">Field</th>
            <th className="py-2 px-3 w-3/8 text-red-400/90 bg-red-950/5">Before</th>
            <th className="py-2 px-3 w-3/8 text-emerald-400/90 bg-emerald-950/5">After</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 font-medium">
          {diff.map((item) => (
            <tr key={item.field} className="hover:bg-white/[0.01] transition-colors">
              <td className="py-2 px-3 font-mono text-zinc-400 uppercase text-[9px] tracking-wide align-top">
                {getFriendlyFieldName(item.field)}
              </td>
              <td className="py-2 px-3 bg-red-950/10 text-red-400 line-through align-top">
                {renderValue(item.before)}
              </td>
              <td className="py-2 px-3 bg-emerald-950/10 text-emerald-300 align-top">
                {renderValue(item.after)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
