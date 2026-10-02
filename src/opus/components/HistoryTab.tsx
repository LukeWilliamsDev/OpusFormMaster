import React, { useMemo, useState } from "react";
import { Loader, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { usePortal } from "../context/PortalContext";
import { AuditEventCard } from "./AuditEventCard";
import { AuditDiffTable } from "./AuditDiffTable";
import { computeDiff, getAuditDetails, getRevertibleDiff } from "../utils/auditDiff";
import { toast } from "sonner";
import { handleError } from "../utils/errorHandler";

const ITEMS_PER_PAGE = 8;
type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

interface HistoryTabProps {
  jobAuditLogs: AuditLogRow[];
  loadingJobAuditLogs: boolean;
  auditSearch: string;
  setAuditSearch: (value: string) => void;
  jobName?: string;
  onAuditRefresh?: () => Promise<void> | void;
  onJobReverted?: (oldDetails: Record<string, unknown>) => void;
}

export function HistoryTab({
  jobAuditLogs,
  loadingJobAuditLogs,
  auditSearch,
  setAuditSearch,
  jobName,
  onAuditRefresh,
  onJobReverted,
}: HistoryTabProps) {
  const { role } = usePortal();
  const [page, setPage] = useState(1);
  const [revertTarget, setRevertTarget] = useState<AuditLogRow | null>(null);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const canRevert = role === "admin" || role === "director";

  const events = useMemo(() => {
    const searchLower = auditSearch.trim().toLowerCase();
    return jobAuditLogs.filter((event) => {
      if (!searchLower) return true;
      return [
        event.user_email,
        event.action,
        event.target_type,
        event.target_id,
        JSON.stringify(event.details),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchLower);
    });
  }, [auditSearch, jobAuditLogs]);

  const totalPages = Math.max(1, Math.ceil(events.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedEvents = events.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const executeRevert = async () => {
    if (!revertTarget) return;
    setRevertingId(revertTarget.id);
    const { error } = await supabase.rpc("revert_audit_log", {
      p_audit_log_id: revertTarget.id,
    });
    setRevertingId(null);
    if (error) {
      const { message } = handleError(error, { message: "This record could not be reverted" });
      toast.error("Revert failed", { description: message });
      return;
    }
    toast.success("Change reverted", {
      description: "The corrective update was recorded in this job's history.",
    });
    const oldDetails = getAuditDetails(revertTarget.details)?.old;
    if (oldDetails && typeof oldDetails === "object" && !Array.isArray(oldDetails)) {
      onJobReverted?.(oldDetails as Record<string, unknown>);
    }
    setRevertTarget(null);
    await onAuditRefresh?.();
  };

  const selectedDiff = revertTarget
    ? computeDiff(
        getAuditDetails(revertTarget.details)?.old,
        getAuditDetails(revertTarget.details)?.new,
      )
    : [];
  const selectedRevertibleDiff = revertTarget
    ? getRevertibleDiff(revertTarget.target_type, selectedDiff)
    : [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={auditSearch}
            onChange={(event) => {
              setAuditSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search this history by person, action, or detail…"
            aria-label="Search job history"
            className="pl-9"
          />
        </div>

        <div className="mt-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {events.length} {events.length === 1 ? "event" : "events"}
        </div>

        {loadingJobAuditLogs ? (
          <div className="flex items-center gap-2 py-8 text-xs text-muted-foreground">
            <Loader className="h-4 w-4 animate-spin text-primary" />
            <span>Loading job history…</span>
          </div>
        ) : events.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            No audit history for this job
          </div>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {paginatedEvents.map((event) => (
              <AuditEventCard
                key={event.id}
                log={event}
                targetName={jobName}
                canRevert={canRevert}
                reverting={revertingId === event.id}
                onRevert={setRevertTarget}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-border bg-background px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-border bg-background px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!revertTarget}
        onOpenChange={(open) => {
          if (!open && !revertingId) setRevertTarget(null);
        }}
        tone="neutral"
        title="Revert this job change?"
        confirmLabel={revertingId ? "Reverting…" : "Revert change"}
        onConfirm={executeRevert}
        message={
          revertTarget && (
            <div className="space-y-3 text-sm">
              <p>
                Restore the supported site fields from this event. Newer changes are protected: if
                the job has changed since this event, the revert will be refused.
              </p>
              {selectedRevertibleDiff.length > 0 && (
                <AuditDiffTable diff={selectedRevertibleDiff} />
              )}
            </div>
          )
        }
      />
    </div>
  );
}
