import React, { useMemo, useState } from "react";
import { Loader, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { usePortal } from "../context/PortalContext";
import { AuditEventCard } from "./AuditEventCard";
import { AuditDiffTable } from "./AuditDiffTable";
import {
  AUDIT_CATEGORY_LABELS,
  computeDiff,
  getAuditCategory,
  getAuditDetails,
  getAuditSearchText,
  getRevertibleDiff,
  type AuditCategory,
} from "../utils/auditDiff";
import { toast } from "sonner";
import { handleError } from "../utils/errorHandler";

const ITEMS_PER_PAGE = 8;
type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];
type RevertedJobRow = Pick<
  Database["public"]["Tables"]["jobs"]["Row"],
  | "id"
  | "job_ref"
  | "site_name"
  | "main_contractor"
  | "postcode"
  | "email"
  | "current_pours"
  | "contract_max_pours"
  | "status"
  | "schedule_value"
  | "updated_at"
>;

interface HistoryTabProps {
  jobAuditLogs: AuditLogRow[];
  loadingJobAuditLogs: boolean;
  auditSearch: string;
  setAuditSearch: (value: string) => void;
  jobName?: string;
  onAuditRefresh?: () => Promise<void> | void;
  onJobReverted?: (job: RevertedJobRow) => void;
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
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory | "all">("changes");
  const canRevert = role === "admin" || role === "director";

  const events = useMemo(() => {
    const searchLower = auditSearch.trim().toLowerCase();
    return jobAuditLogs.filter((event) => {
      if (categoryFilter !== "all" && getAuditCategory(event.action) !== categoryFilter)
        return false;
      if (!searchLower) return true;
      return getAuditSearchText(event, jobName).includes(searchLower);
    });
  }, [auditSearch, categoryFilter, jobAuditLogs, jobName]);

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
    const { data: revertedJob, error: refreshError } = await supabase
      .from("jobs")
      .select(
        "id, job_ref, site_name, main_contractor, postcode, email, current_pours, contract_max_pours, status, schedule_value, updated_at",
      )
      .eq("id", revertTarget.target_id)
      .maybeSingle();
    if (refreshError || !revertedJob) {
      toast.error("Change reverted, but the job could not be refreshed", {
        description: "Reload the job before making another change.",
      });
    } else {
      toast.success("Change reverted", {
        description: "The corrective update was recorded in this job's history.",
      });
      onJobReverted?.(revertedJob);
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
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
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
              placeholder="Search changes and decisions…"
              aria-label="Search job history"
              className="pl-9"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value as AuditCategory | "all");
              setPage(1);
            }}
            aria-label="Filter job history by category"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="changes">{AUDIT_CATEGORY_LABELS.changes}</option>
            <option value="compliance">{AUDIT_CATEGORY_LABELS.compliance}</option>
            <option value="access">{AUDIT_CATEGORY_LABELS.access}</option>
            <option value="system">{AUDIT_CATEGORY_LABELS.system}</option>
            <option value="all">All activity</option>
          </select>
        </div>

        <div
          className="mt-3 flex items-center justify-between text-xs text-muted-foreground"
          aria-live="polite"
        >
          {events.length} {events.length === 1 ? "event" : "events"}
          <span>
            {categoryFilter === "changes" ? "Changes and decisions" : "Filtered evidence"}
          </span>
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
          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <div>
              <div className="hidden items-center gap-3 bg-background/60 px-3 py-2 text-xs font-semibold text-muted-foreground lg:grid lg:grid-cols-[120px_118px_minmax(180px,1.3fr)_minmax(150px,1fr)_150px_24px]">
                <span>When</span>
                <span>Action</span>
                <span>Record</span>
                <span>Summary</span>
                <span>Actor</span>
                <span />
              </div>
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
