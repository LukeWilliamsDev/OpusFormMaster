import React, { useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  Info,
  PencilLine,
  Plus,
  RotateCcw,
  Trash2,
  User,
  X,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { AuditDiffTable } from "./AuditDiffTable";
import {
  computeDiff,
  formatAuditValue,
  getActorName,
  getAuditChangeSummary,
  getAuditDetails,
  getAuditFieldLabel,
  getEventLabel,
  getRevertibleDiff,
} from "../utils/auditDiff";

type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

interface AuditEventCardProps {
  log: AuditLogRow;
  targetName?: string;
  canRevert?: boolean;
  reverting?: boolean;
  onRevert?: (log: AuditLogRow) => void;
  extraActions?: React.ReactNode;
}

function getActionPresentation(action: string) {
  if (action === "CREATE" || action.includes("APPROVE") || action.includes("COMPLETE")) {
    return {
      badge: "bg-success/10 border-success/20 text-success",
      icon: CheckCircle2,
      iconClass: "text-success",
      iconBg: "bg-success/10",
    };
  }
  if (action === "DELETE" || action.includes("REMOVE") || action.includes("REJECT")) {
    return {
      badge: "bg-destructive/10 border-destructive/20 text-destructive",
      icon: Trash2,
      iconClass: "text-destructive",
      iconBg: "bg-destructive/10",
    };
  }
  if (action === "INSPECT" || action.includes("VIEW")) {
    return {
      badge: "bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300",
      icon: Eye,
      iconClass: "text-purple-700 dark:text-purple-300",
      iconBg: "bg-purple-500/10",
    };
  }
  if (action === "UPDATE" || action.includes("REVERT") || action.includes("RENAME")) {
    return {
      badge: "bg-warning/10 border-warning/20 text-warning",
      icon: action.includes("REVERT") ? RotateCcw : PencilLine,
      iconClass: "text-warning",
      iconBg: "bg-warning/10",
    };
  }
  if (action === "CREATE_DOCUMENT_REQUEST" || action.includes("UPLOAD")) {
    return {
      badge: "bg-primary/10 border-primary/20 text-primary",
      icon: Plus,
      iconClass: "text-primary",
      iconBg: "bg-primary/10",
    };
  }
  return {
    badge: "bg-secondary border-border text-muted-foreground",
    icon: Activity,
    iconClass: "text-primary",
    iconBg: "bg-primary/10",
  };
}

function getTargetTypeLabel(targetType: string): string {
  return (
    {
      auth: "Account",
      jobs: "Site",
      quotes: "Quote",
      staff: "Staff",
    }[targetType] || targetType.replace(/_/g, " ")
  );
}

function formatEventTime(createdAt: string | null): string {
  if (!createdAt) return "Time not recorded";
  return new Date(createdAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface AuditInspectorProps {
  log: AuditLogRow;
  targetName?: string;
  canRevert: boolean;
  reverting: boolean;
  onClose: () => void;
  onRevert?: (log: AuditLogRow) => void;
}

function AuditInspector({
  log,
  targetName,
  canRevert,
  reverting,
  onClose,
  onRevert,
}: AuditInspectorProps) {
  const details = getAuditDetails(log.details);
  const diff = log.action === "UPDATE" ? computeDiff(details?.old, details?.new) : [];
  const revertibleDiff = getRevertibleDiff(log.target_type, diff);
  const presentation = getActionPresentation(log.action);
  const LogIcon = presentation.icon;
  const actor = log.user_email ? getActorName(log.user_email) : "System / Automated";
  const targetLabel = targetName
    ? `${getTargetTypeLabel(log.target_type)} · ${targetName}`
    : getTargetTypeLabel(log.target_type);
  const detailEntries = Object.entries(details ?? {}).filter(
    ([key]) => key !== "old" && key !== "new",
  );

  return (
    <div
      className="fixed inset-0 z-[180] flex justify-end bg-black/40 backdrop-blur-[2px]"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close audit details"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <aside
        className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Audit event details"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${presentation.iconBg}`}
            >
              <LogIcon className={`h-4 w-4 ${presentation.iconClass}`} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span
                className={`inline-flex rounded border px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-widest ${presentation.badge}`}
              >
                {getEventLabel(log.action)}
              </span>
              <h2 className="mt-2 truncate text-lg font-bold text-foreground">{targetLabel}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {getAuditChangeSummary(log, targetName)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close audit details"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-3 rounded-xl border border-border bg-background/60 p-4 text-xs sm:grid-cols-2">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Who
              </p>
              <p className="mt-1 font-semibold text-foreground" title={log.user_email || undefined}>
                {actor}
              </p>
              {log.user_email && (
                <p className="mt-0.5 break-all text-[11px] text-muted-foreground">
                  {log.user_email}
                </p>
              )}
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                When
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {formatEventTime(log.created_at)}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Record
              </p>
              <p className="mt-1 break-all font-mono text-[11px] text-foreground">
                {targetLabel} · {log.target_id}
              </p>
            </div>
          </div>

          {diff.length > 0 ? (
            <section>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <PencilLine className="h-3.5 w-3.5" />
                Field changes
              </div>
              <AuditDiffTable diff={diff} />
            </section>
          ) : (
            <section className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No before-and-after field snapshot was recorded for this event.
            </section>
          )}

          {detailEntries.length > 0 && (
            <section>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                Event details
              </div>
              <dl className="mt-2 grid gap-3 rounded-xl border border-border bg-background/60 p-4 text-xs sm:grid-cols-2">
                {detailEntries.map(([key, value]) => (
                  <div key={key} className="min-w-0">
                    <dt className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                      {getAuditFieldLabel(key)}
                    </dt>
                    <dd className="mt-1 break-words font-medium text-foreground">
                      {formatAuditValue(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {details?.reverted_audit_log_id != null && (
            <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
              This update reverted audit entry {String(details.reverted_audit_log_id)}.
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
          <p className="text-[10px] text-muted-foreground">
            {canRevert && revertibleDiff.length > 0
              ? "Reverts are recorded as a new audit event."
              : "This event remains read-only."}
          </p>
          {canRevert && revertibleDiff.length > 0 && onRevert && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRevert(log);
              }}
              disabled={reverting}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-warning transition-colors hover:bg-warning/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" />
              {reverting ? "Reverting…" : "Revert change"}
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}

export const AuditEventCard: React.FC<AuditEventCardProps> = ({
  log,
  targetName,
  canRevert = false,
  reverting = false,
  onRevert,
  extraActions,
}) => {
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const details = getAuditDetails(log.details);
  const diff = log.action === "UPDATE" ? computeDiff(details?.old, details?.new) : [];
  const presentation = getActionPresentation(log.action);
  const LogIcon = presentation.icon;
  const actor = log.user_email ? getActorName(log.user_email) : "System / Automated";
  const actorTitle = log.user_email || "System / Automated";
  const targetLabel = targetName
    ? `${getTargetTypeLabel(log.target_type)} · ${targetName}`
    : getTargetTypeLabel(log.target_type);
  const eventLabel = getEventLabel(log.action);
  const fullSummary = getAuditChangeSummary(log, targetName);
  const rowSummary = fullSummary.startsWith(`${eventLabel} · `)
    ? fullSummary.slice(eventLabel.length + 3)
    : fullSummary;

  return (
    <>
      <div
        className="group flex min-h-[68px] cursor-pointer items-center gap-3 px-1 py-3 transition-colors hover:bg-secondary/40"
        role="button"
        tabIndex={0}
        onClick={() => setInspectorOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setInspectorOpen(true);
          }
        }}
      >
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${presentation.iconBg}`}
        >
          <LogIcon className={`h-3.5 w-3.5 ${presentation.iconClass}`} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`rounded border px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-widest ${presentation.badge}`}
            >
              {eventLabel}
            </span>
            <span className="truncate text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              {targetLabel}
            </span>
          </div>
          <p className="mt-1 truncate text-[13px] font-semibold text-foreground">{rowSummary}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1" title={actorTitle}>
              <User className="h-3 w-3" aria-hidden="true" />
              By {actor}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3 w-3" aria-hidden="true" />
              {formatEventTime(log.created_at)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {extraActions}
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-foreground">
            Details
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
      {inspectorOpen && (
        <AuditInspector
          log={log}
          targetName={targetName}
          canRevert={canRevert}
          reverting={reverting}
          onClose={() => setInspectorOpen(false)}
          onRevert={onRevert}
        />
      )}
    </>
  );
};
