import React, { useEffect, useMemo, useState } from "react";
import { Activity, Search } from "lucide-react";
import { AuditEventCard } from "../components/AuditEventCard";
import { AuditDiffTable } from "../components/AuditDiffTable";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { usePortal } from "../context/PortalContext";
import {
  AUDIT_CATEGORY_LABELS,
  computeDiff,
  getAuditCategory,
  getAuditDetails,
  getAuditSearchText,
  getAuditTargetLabel,
  getRevertibleDiff,
  type AuditCategory,
} from "../utils/auditDiff";
import { toast } from "sonner";
import { handleError } from "../utils/errorHandler";

const ITEMS_PER_PAGE = 12;
type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

export const AuditLogPage: React.FC = () => {
  const { role } = usePortal();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory | "all">("changes");
  const [targetFilter, setTargetFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [targetNames, setTargetNames] = useState<Record<string, string>>({});
  const [revertTarget, setRevertTarget] = useState<AuditLog | null>(null);
  const [revertingId, setRevertingId] = useState<string | null>(null);

  const canRevert = role === "admin" || role === "director";

  const fetchLogs = async () => {
    setLoading(true);
    const [logsRes, staffRes, jobsRes, quotesRes] = await Promise.all([
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }),
      supabase.from("staff").select("id, name"),
      supabase.from("jobs").select("id, site_name, job_ref"),
      supabase.from("quotes").select("id, reference"),
    ]);

    if (logsRes.error) {
      console.error("Error fetching audit logs:", logsRes.error);
      const { message } = handleError(logsRes.error, { message: "Failed to fetch audit logs" });
      toast.error(message);
    } else {
      setLogs((logsRes.data as AuditLog[]) || []);
    }

    const names: Record<string, string> = {};
    (staffRes.data || []).forEach((row) => {
      names[`staff:${row.id}`] = row.name;
    });
    (jobsRes.data || []).forEach((row) => {
      names[`jobs:${row.id}`] = `${row.site_name} · ${row.job_ref}`;
    });
    (quotesRes.data || []).forEach((row) => {
      names[`quotes:${row.id}`] = row.reference || "Unnamed quote";
    });
    setTargetNames(names);

    for (const response of [staffRes, jobsRes, quotesRes]) {
      if (response.error) {
        console.error("Error fetching audit target names:", response.error);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const targetOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.target_type))).sort(),
    [logs],
  );

  const searchLower = search.trim().toLowerCase();
  const filteredLogs = logs.filter((log) => {
    if (categoryFilter !== "all" && getAuditCategory(log.action) !== categoryFilter) return false;
    if (targetFilter !== "all" && log.target_type !== targetFilter) return false;
    if (!searchLower) return true;
    const targetName = targetNames[`${log.target_type}:${log.target_id}`] || "";
    return getAuditSearchText(log, targetName).includes(searchLower);
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));
  const currentPageClamped = Math.min(currentPage, totalPages);
  const paginatedLogs = filteredLogs.slice(
    (currentPageClamped - 1) * ITEMS_PER_PAGE,
    currentPageClamped * ITEMS_PER_PAGE,
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
      description: "The corrective update was recorded in the audit trail.",
    });
    setRevertTarget(null);
    await fetchLogs();
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
    <div className="mx-auto flex w-full max-w-[2200px] animate-fade-in flex-col space-y-6 bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8 lg:py-8 2xl:px-10 2xl:py-10">
      <header className="border-b border-border pb-6">
        <div className="flex items-center gap-2 text-primary">
          <Activity className="h-4 w-4" aria-hidden="true" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Site records</span>
        </div>
        <h1 className="mt-2 font-archivo text-2xl font-extrabold tracking-tight sm:text-3xl">
          Audit trail
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Recorded changes and decisions across your organisation. Access and system activity can be
          included when you need the wider investigation trail.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-2 lg:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search changes and decisions…"
              aria-label="Search audit trail"
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value as AuditCategory | "all");
              setCurrentPage(1);
            }}
            aria-label="Filter by audit category"
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="changes">{AUDIT_CATEGORY_LABELS.changes}</option>
            <option value="compliance">{AUDIT_CATEGORY_LABELS.compliance}</option>
            <option value="access">{AUDIT_CATEGORY_LABELS.access}</option>
            <option value="system">{AUDIT_CATEGORY_LABELS.system}</option>
            <option value="all">All activity</option>
          </select>
          <select
            value={targetFilter}
            onChange={(event) => {
              setTargetFilter(event.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by record type"
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All record types</option>
            {targetOptions.map((target) => (
              <option key={target} value={target}>
                {getAuditTargetLabel(target)}
              </option>
            ))}
          </select>
        </div>

        <div
          className="mt-4 flex items-center justify-between text-xs text-muted-foreground"
          aria-live="polite"
        >
          {filteredLogs.length} {filteredLogs.length === 1 ? "entry" : "entries"}
          <span>
            {categoryFilter === "changes"
              ? "Meaningful changes and decisions"
              : "Filtered evidence"}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-muted-foreground">
            Loading audit trail…
          </div>
        ) : paginatedLogs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-20 text-center text-xs text-muted-foreground">
            No audit entries match these filters.
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
              {paginatedLogs.map((log) => (
                <AuditEventCard
                  key={log.id}
                  log={log}
                  targetName={targetNames[`${log.target_type}:${log.target_id}`]}
                  canRevert={canRevert}
                  reverting={revertingId === log.id}
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
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPageClamped === 1}
              className="rounded-lg border border-border bg-background px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Page {currentPageClamped} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPageClamped === totalPages}
              className="rounded-lg border border-border bg-background px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!revertTarget}
        onOpenChange={(open) => {
          if (!open && !revertingId) setRevertTarget(null);
        }}
        tone="neutral"
        title="Revert this change?"
        confirmLabel={revertingId ? "Reverting…" : "Revert change"}
        onConfirm={executeRevert}
        message={
          revertTarget && (
            <div className="space-y-3 text-sm">
              <p>
                Restore the supported fields from this {revertTarget.target_type} audit entry. The
                corrective update will be recorded as a new audit event.
              </p>
              {selectedRevertibleDiff.length > 0 && (
                <AuditDiffTable diff={selectedRevertibleDiff} />
              )}
              <p className="text-xs text-muted-foreground">
                If the record has changed since this entry, the revert will be refused rather than
                overwriting newer work.
              </p>
            </div>
          )
        }
      />
    </div>
  );
};
