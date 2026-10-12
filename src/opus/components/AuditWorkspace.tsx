import React, { useCallback, useEffect, useState } from "react";
import type { Database } from "@/integrations/supabase/types";
import { AuditEventCard, AuditInspector } from "./AuditEventCard";

type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

interface AuditWorkspaceProps {
  logs: AuditLogRow[];
  targetName?: string | ((log: AuditLogRow) => string | undefined);
  canRevert?: boolean | ((log: AuditLogRow) => boolean);
  revertingId?: string | null;
  onRevert?: (log: AuditLogRow) => void;
  extraActions?: (log: AuditLogRow) => React.ReactNode;
  countLabel?: string;
  emptyState?: React.ReactNode;
}

export const AuditWorkspace: React.FC<AuditWorkspaceProps> = ({
  logs,
  targetName,
  canRevert = false,
  revertingId = null,
  onRevert,
  extraActions,
  countLabel,
  emptyState,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedLog = selectedId ? logs.find((log) => log.id === selectedId) : null;
  const getTargetName = (log: AuditLogRow) =>
    typeof targetName === "function" ? targetName(log) : targetName;
  const getCanRevert = (log: AuditLogRow) =>
    typeof canRevert === "function" ? canRevert(log) : canRevert;

  useEffect(() => {
    if (selectedId && logs.some((log) => log.id === selectedId)) return;
    setSelectedId(null);
  }, [logs, selectedId]);

  const closeInspector = useCallback(() => {
    const focusId = selectedId;
    setSelectedId(null);
    if (focusId) {
      window.setTimeout(() => document.getElementById(`audit-event-${focusId}`)?.focus(), 0);
    }
  }, [selectedId]);

  if (logs.length === 0) return <>{emptyState}</>;

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <section className="min-w-0 overflow-hidden rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2.5">
          <span className="text-xs font-semibold text-foreground">Activity</span>
          <span className="text-[10px] text-muted-foreground">
            {countLabel ?? `${logs.length} entries`}
          </span>
        </div>
        <div className="hidden grid-cols-[84px_minmax(0,1fr)_24px] gap-3 border-b border-border bg-background/60 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground md:grid lg:grid-cols-[112px_118px_minmax(160px,1.2fr)_minmax(130px,1fr)_120px_24px]">
          <span>When</span>
          <span className="lg:hidden">Record</span>
          <span className="hidden lg:block">Action</span>
          <span className="hidden lg:block">Record</span>
          <span className="hidden lg:block">Summary</span>
          <span className="hidden lg:block">Actor</span>
          <span />
        </div>
        {logs.map((log) => (
          <AuditEventCard
            key={log.id}
            log={log}
            targetName={getTargetName(log)}
            canRevert={getCanRevert(log)}
            reverting={revertingId === log.id}
            onRevert={onRevert}
            extraActions={extraActions?.(log)}
            selected={selectedId === log.id}
            onSelect={() => setSelectedId(log.id)}
          />
        ))}
      </section>

      {selectedLog ? (
        <div className="min-w-0 lg:col-start-2 lg:row-start-1">
          <AuditInspector
            log={selectedLog}
            targetName={getTargetName(selectedLog)}
            canRevert={getCanRevert(selectedLog)}
            reverting={revertingId === selectedLog.id}
            onClose={closeInspector}
            onRevert={onRevert}
            responsive
          />
        </div>
      ) : (
        <aside className="hidden min-h-[520px] min-w-0 items-center justify-center rounded-xl border border-border bg-card p-8 text-center text-xs text-muted-foreground lg:flex lg:col-start-2 lg:row-start-1">
          Select an audit entry to inspect its evidence.
        </aside>
      )}
    </div>
  );
};
