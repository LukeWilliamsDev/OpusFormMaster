import React, { useEffect, useRef, useState } from "react";
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
  formatSafeAuditDetail,
  getActorName,
  getAuditCategory,
  getAuditCategoryLabel,
  getAuditDetails,
  getAuditEventSentence,
  getAuditActorIdentifier,
  getAuditFieldLabel,
  getAuditOutcomeSummary,
  getAuditRecordLabel,
  getAuditSourceLabel,
  getAuditTargetLabel,
  getEventLabel,
  getRevertibleDiff,
  isDerivedAuditRecord,
} from "../utils/auditDiff";

type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

interface AuditEventCardProps {
  log: AuditLogRow;
  targetName?: string;
  canRevert?: boolean;
  reverting?: boolean;
  onRevert?: (log: AuditLogRow) => void;
  extraActions?: React.ReactNode;
  selected?: boolean;
  onSelect?: () => void;
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

function formatEventTime(createdAt: string | null): string {
  if (!createdAt) return "Time not recorded";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Time not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
    timeZoneName: "short",
  }).format(date);
}

interface AuditInspectorProps {
  log: AuditLogRow;
  targetName?: string;
  canRevert: boolean;
  reverting: boolean;
  onClose: () => void;
  onRevert?: (log: AuditLogRow) => void;
  inline?: boolean;
  responsive?: boolean;
}

export function AuditInspector({
  log,
  targetName,
  canRevert,
  reverting,
  onClose,
  onRevert,
  inline = false,
  responsive = false,
}: AuditInspectorProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [desktopLayout, setDesktopLayout] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
  );
  const details = getAuditDetails(log.details);
  const isDerivedRequest = isDerivedAuditRecord(log);
  const diff = log.action === "UPDATE" ? computeDiff(details?.old, details?.new) : [];
  const revertibleDiff = getRevertibleDiff(log.target_type, diff);
  const presentation = getActionPresentation(log.action);
  const LogIcon = presentation.icon;
  const actor = log.user_email ? getActorName(log.user_email) : "System / Automated";
  const actorIdentifier = getAuditActorIdentifier(log.user_email);
  const targetLabel = getAuditRecordLabel(log, targetName);
  const targetTypeLabel = getAuditTargetLabel(log.target_type);
  const detailEntries = Object.entries(details ?? {}).filter(
    ([key]) =>
      key !== "old" &&
      key !== "new" &&
      key !== "uploadUrl" &&
      key !== "is_derived_request" &&
      key !== "audit_source",
  );

  useEffect(() => {
    if (!responsive) return;
    const media = window.matchMedia("(min-width: 1024px)");
    const syncLayout = () => setDesktopLayout(media.matches);
    syncLayout();
    media.addEventListener("change", syncLayout);
    return () => media.removeEventListener("change", syncLayout);
  }, [responsive]);

  useEffect(() => {
    const shouldTrapFocus = !inline && (!responsive || !desktopLayout);
    if (!shouldTrapFocus) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => !element.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [desktopLayout, inline, onClose, responsive]);

  return (
    <div
      className={
        inline
          ? "relative flex h-full min-h-[520px] w-full justify-end"
          : responsive
            ? "fixed inset-0 z-[180] flex justify-end bg-black/40 backdrop-blur-[2px] lg:relative lg:inset-auto lg:z-auto lg:min-h-[520px] lg:bg-transparent lg:backdrop-blur-0"
            : "fixed inset-0 z-[180] flex justify-end bg-black/40 backdrop-blur-[2px]"
      }
      role="presentation"
    >
      {!inline && (
        <button
          type="button"
          aria-label="Close audit details"
          tabIndex={-1}
          className={
            responsive
              ? "absolute inset-0 cursor-default lg:hidden"
              : "absolute inset-0 cursor-default"
          }
          onClick={onClose}
        />
      )}
      <aside
        ref={dialogRef}
        className={`relative z-10 flex h-full w-full flex-col bg-card ${inline || responsive ? "max-w-none border-0 shadow-none lg:max-w-none" : "max-w-xl border-l border-border shadow-2xl animate-in slide-in-from-right duration-200"} ${responsive ? "lg:relative lg:h-full" : ""}`}
        role="dialog"
        {...(!inline && !responsive ? { "aria-modal": "true" } : {})}
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
              <span className="text-xs font-semibold text-muted-foreground">
                {getAuditCategoryLabel(getAuditCategory(log.action))}
              </span>
              <h2 className="mt-1 text-xl font-bold text-foreground">
                {isDerivedRequest ? "Request status" : getEventLabel(log.action)}
              </h2>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {targetTypeLabel} · {targetLabel}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {isDerivedRequest
                  ? "This status is derived from the current compliance request, not a separate audit event."
                  : getAuditEventSentence(log, targetName)}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close audit details"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-4 rounded-xl border border-border bg-background/60 p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Actor</p>
              <p className="mt-1 font-semibold text-foreground">{actor}</p>
              {log.user_email && (
                <p className="mt-0.5 break-all text-xs text-muted-foreground">{actorIdentifier}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">When (Europe/London)</p>
              <p className="mt-1 font-semibold text-foreground">
                {formatEventTime(log.created_at)}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-muted-foreground">Outcome</p>
              <p className="mt-1 font-semibold text-foreground">{getAuditOutcomeSummary(log)}</p>
            </div>
          </div>

          {diff.length > 0 ? (
            <section>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <PencilLine className="h-4 w-4 text-muted-foreground" />
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
            <details className="rounded-xl border border-border bg-background/60 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">
                Additional evidence
              </summary>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                {detailEntries.map(([key, value]) => (
                  <div key={key} className="min-w-0">
                    <dt className="text-xs font-semibold text-muted-foreground">
                      {getAuditFieldLabel(key)}
                    </dt>
                    <dd className="mt-1 break-words text-foreground">
                      {formatSafeAuditDetail(key, value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          )}

          <div className="rounded-xl border border-border bg-background/60 p-4">
            <p className="text-sm font-semibold text-foreground">Evidence source</p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-muted-foreground">Source</dt>
                <dd className="mt-1 text-foreground">{getAuditSourceLabel(log)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted-foreground">Evidence status</dt>
                <dd className="mt-1 text-foreground">
                  {isDerivedRequest
                    ? "Derived status; source event may be unavailable"
                    : "Recorded event"}
                </dd>
              </div>
            </dl>
          </div>

          {details?.reverted_audit_log_id != null && (
            <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
              This event is a corrective update linked to an earlier audit entry.
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
          <p className="text-xs text-muted-foreground">
            {canRevert && revertibleDiff.length > 0
              ? "Revert creates a new corrective event."
              : "Read-only evidence"}
          </p>
          {canRevert && revertibleDiff.length > 0 && onRevert && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRevert(log);
              }}
              disabled={reverting}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-semibold text-warning transition-colors hover:bg-warning/20 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {reverting ? "Reverting…" : "Revert this change"}
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
  selected = false,
  onSelect,
}) => {
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const presentation = getActionPresentation(log.action);
  const LogIcon = presentation.icon;
  const actor = log.user_email ? getActorName(log.user_email) : "System";
  const actorIdentifier = getAuditActorIdentifier(log.user_email);
  const targetLabel = getAuditRecordLabel(log, targetName);
  const isDerivedRequest = isDerivedAuditRecord(log);
  const closeInspector = () => {
    setInspectorOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };
  const handleSelect = () => {
    if (onSelect) {
      onSelect();
      return;
    }
    setInspectorOpen(true);
  };

  return (
    <article className="border-b border-border last:border-b-0">
      <div className="flex items-stretch gap-2 py-1">
        <button
          ref={triggerRef}
          id={`audit-event-${log.id}`}
          type="button"
          className={`group grid min-w-0 flex-1 grid-cols-[84px_minmax(0,1fr)_24px] items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-secondary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary lg:grid-cols-[112px_118px_minmax(160px,1.2fr)_minmax(130px,1fr)_120px_24px] lg:py-3 ${selected ? "bg-secondary/50" : ""}`}
          onClick={handleSelect}
          aria-label={`View audit details: ${isDerivedRequest ? "Compliance request status" : getAuditEventSentence(log, targetName)}`}
        >
          <span className="text-xs text-muted-foreground">{formatEventTime(log.created_at)}</span>
          <span className="hidden items-center gap-2 lg:flex">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${presentation.iconBg}`}
            >
              <LogIcon className={`h-3.5 w-3.5 ${presentation.iconClass}`} aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-foreground">
              {isDerivedRequest ? "Request status" : getEventLabel(log.action)}
            </span>
          </span>
          <span className="col-start-2 min-w-0 lg:col-start-3">
            <span className="block truncate text-sm font-semibold text-foreground">
              {targetLabel}
            </span>
            <span className="block truncate text-xs text-muted-foreground lg:hidden">
              {isDerivedRequest ? "Request status" : getEventLabel(log.action)} ·{" "}
              {getAuditOutcomeSummary(log)}
            </span>
            <span className="hidden truncate text-xs text-muted-foreground lg:block">
              {getAuditTargetLabel(log.target_type)}
            </span>
          </span>
          <span className="hidden truncate text-sm text-muted-foreground lg:block">
            {getAuditOutcomeSummary(log)}
          </span>
          <span
            className="hidden truncate text-sm text-muted-foreground lg:block"
            title={actorIdentifier}
          >
            <User className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
            {actor}
          </span>
          <ChevronRight
            className="col-start-3 h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground lg:col-start-6"
            aria-hidden="true"
          />
        </button>
        {extraActions && (
          <div className="flex shrink-0 items-center" onClick={(event) => event.stopPropagation()}>
            {extraActions}
          </div>
        )}
      </div>
      {inspectorOpen && !onSelect && (
        <AuditInspector
          log={log}
          targetName={targetName}
          canRevert={canRevert}
          reverting={reverting}
          onClose={closeInspector}
          onRevert={onRevert}
        />
      )}
    </article>
  );
};
