import React, { useEffect, useState, useMemo } from "react";
import { CardGrid } from "../components/CardGrid";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  Search,
  Clock,
  User,
  Database,
  ArrowRight,
  X,
  FileJson,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { computeDiff } from "../utils/auditDiff";
import { AuditDiffTable } from "../components/AuditDiffTable";
import { usePortal } from "../context/PortalContext";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { handleError } from "../utils/errorHandler";
import type { Database as SupabaseDatabase } from "@/integrations/supabase/types";

type TableName = keyof SupabaseDatabase["public"]["Tables"];

// Exact, plain-English label for each action code — falls back to a
// title-cased version of the raw action for anything not explicitly mapped,
// rather than a vague catch-all like "System Event".
const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Signed in",
  LOGIN_FAIL: "Sign-in failed",
  LOGOUT: "Signed out",
  PASSWORD_RESET_REQUEST: "Password reset requested",
  PASSWORD_RESET_SUCCESS: "Password changed",
  PROFILE_UPDATE: "Profile updated",
  COMPLIANCE_REMINDER_SENT: "Compliance reminder sent",
  INSPECT: "Record viewed",
  VIEW_DOCUMENT: "Document viewed",
  REMOVE_DOCUMENT: "Document removed",
  CREATE_DOCUMENT_REQUEST: "Document request created",
  RESEND_DOCUMENT_REQUEST: "Document request resent",
  DELETE_NOTE: "Note deleted",
  APPROVE_DOCUMENT: "Document approved",
  REJECT_DOCUMENT: "Document rejected",
  SUBMIT_DOCUMENTS: "Documents submitted",
  CREATE: "Record created",
  UPDATE: "Record updated",
  DELETE: "Record deleted",
};

function getEventLabel(action: string): string {
  return (
    ACTION_LABELS[action] ??
    action
      .toLowerCase()
      .split("_")
      .map((word) => word[0]?.toUpperCase() + word.slice(1))
      .join(" ")
  );
}

interface AuditLog {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown> | null;
}

export const AuditLogPage: React.FC = () => {
  const { profile } = usePortal();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [logPendingRestore, setLogPendingRestore] = useState<AuditLog | null>(null);

  const requestRestore = (log: AuditLog) => {
    setLogPendingRestore(log);
    setRestoreConfirmOpen(true);
  };

  const handleRestore = async (log: AuditLog) => {
    setRestoring(true);
    try {
      const table = log.target_type;
      const targetId = log.target_id;

      let error = null;

      if (log.action === "CREATE") {
        // Restoring a creation means deleting the record
        const { error: err } = await supabase
          .from(table as TableName)
          .delete()
          .eq("id", targetId);
        error = err;
      } else if (log.action === "DELETE") {
        // Restoring a deletion means inserting the details payload
        const restorePayload = { ...log.details, tenant_id: profile?.tenant_id };
        const { error: err } = await supabase
          .from(table as TableName)
          .upsert(restorePayload as unknown as never);
        error = err;
      } else if (log.action === "UPDATE") {
        // Restoring an update means applying the "old" values
        const oldState = log.details?.old;
        if (!oldState || typeof oldState !== "object") {
          throw new Error("No old state payload found in this audit log.");
        }
        const restorePayload = { ...oldState, tenant_id: profile?.tenant_id };
        const { error: err } = await supabase
          .from(table as TableName)
          .upsert(restorePayload as unknown as never);
        error = err;
      }

      if (error) {
        throw error;
      }

      toast.success("Record restored", {
        description: "Record successfully restored to its previous state!",
      });
      setSelectedLog(null);
      fetchLogs();
    } catch (err) {
      console.error("Error restoring log:", err);
      const { message } = handleError(err, { message: "Failed to restore log" });
      toast.error(message);
    } finally {
      setRestoring(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const isMobile = window.innerWidth < 768;
    if (!isMobile) {
      setSelectedLog(null);
    }
  };

  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);

  const fetchLogs = async () => {
    setLoading(true);
    const [logsRes, staffRes] = await Promise.all([
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }),
      supabase.from("staff").select("id, name"),
    ]);

    if (logsRes.error) {
      console.error("Error fetching audit logs:", logsRes.error);
      const { message } = handleError(logsRes.error, { message: "Failed to fetch audit logs" });
      toast.error(message);
    } else {
      setLogs((logsRes.data as AuditLog[]) || []);
    }

    if (staffRes.error) {
      console.error("Error fetching staff list for mapping:", staffRes.error);
      const { message } = handleError(staffRes.error, { message: "Failed to fetch staff list" });
      toast.error(message);
    } else {
      setStaffList(staffRes.data || []);
    }
    setLoading(false);
  };

  const getTargetDisplayName = (
    targetType: string,
    targetId: string,
    details?: Record<string, unknown> | null,
  ) => {
    if (targetType === "staff") {
      const match = staffList.find((s) => s.id === targetId);
      if (match) return match.name;

      // Fallback strategies for archived or deleted workers
      const newName = (details?.new as Record<string, unknown> | undefined)?.name;
      if (newName) return newName as string;
      const oldName = (details?.old as Record<string, unknown> | undefined)?.name;
      if (oldName) return oldName as string;
      if (details?.name) return details.name as string;
    }
    return targetId;
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, actionFilter, typeFilter]);

  const filteredLogs = logs.filter((log) => {
    // 1. Text Search Filter
    const term = search.toLowerCase();
    const textMatches =
      (log.user_email || "").toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.target_type.toLowerCase().includes(term) ||
      log.target_id.toLowerCase().includes(term);

    // 2. Action Filter
    const actionMatches = actionFilter === "ALL" || log.action === actionFilter;

    // 3. Type Filter
    const typeMatches =
      typeFilter === "ALL" || log.target_type.toLowerCase() === typeFilter.toLowerCase();

    return textMatches && actionMatches && typeMatches;
  });

  // Paginated Slicing
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
      case "LOGIN_SUCCESS":
      case "PASSWORD_RESET_SUCCESS":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "UPDATE":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "INSPECT":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "DELETE":
      case "LOGIN_FAILURE":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "LOGOUT":
      case "PASSWORD_RESET_REQUEST":
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="pt-24 pb-12 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto space-y-8 animate-fade-in text-foreground flex flex-col min-h-[calc(100vh-4rem)] bg-background">
      {/* Header matching 2d */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-archivo tracking-tight">
            Audit Trail
          </h1>
        </div>

        {/* Toggle Tags for filters */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActionFilter("ALL");
              setTypeFilter("ALL");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              actionFilter === "ALL"
                ? "bg-secondary text-foreground"
                : "bg-card border border-border text-muted-foreground"
            }`}
          >
            All Events
          </button>
          <button
            onClick={() => {
              setActionFilter("LOGIN_SUCCESS");
              setTypeFilter("ALL");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              actionFilter === "LOGIN_SUCCESS"
                ? "bg-secondary text-foreground"
                : "bg-card border border-border text-muted-foreground"
            }`}
          >
            Logins
          </button>
          <button
            onClick={() => {
              setActionFilter("APPROVE_DOCUMENT");
              setTypeFilter("ALL");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              actionFilter === "APPROVE_DOCUMENT"
                ? "bg-secondary text-foreground"
                : "bg-card border border-border text-muted-foreground"
            }`}
          >
            Approvals
          </button>
        </div>
      </div>

      {/* Timeline timeline entries layout container */}
      <div className="flex-grow flex flex-col justify-between bg-background rounded-xl overflow-hidden min-h-[480px]">
        <div>
          {loading ? (
            <div className="py-20 text-center text-xs font-mono text-muted-foreground">
              Loading audit trail...
            </div>
          ) : paginatedLogs.length === 0 ? (
            <div className="py-20 text-center text-xs font-mono text-muted-foreground">
              No logs matching filters.
            </div>
          ) : (
            <CardGrid
              items={paginatedLogs}
              className="flex flex-col divide-y divide-border"
              renderCard={(log) => {
                // Colored severity bullets for timeline matching 2d
                let bulletColor = "bg-primary";
                if (log.action.includes("LOGIN_SUCCESS") || log.action.includes("APPROVE")) {
                  bulletColor = "bg-success";
                } else if (log.action.includes("CREATE") || log.action.includes("UPDATE")) {
                  bulletColor = "bg-primary";
                } else if (
                  log.action.includes("FAIL") ||
                  log.action.includes("DELETE") ||
                  log.action.includes("REJECT")
                ) {
                  bulletColor = "bg-destructive";
                } else {
                  bulletColor = "bg-warning";
                }

                const friendlyEventName = getEventLabel(log.action);

                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="flex gap-4 py-4 cursor-pointer hover:bg-foreground/10 transition-all px-2 rounded-lg"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${bulletColor} mt-1.5 shrink-0`} />
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-x-4 gap-y-1 min-w-0">
                      <div className="text-[14px] font-semibold text-white truncate">
                        {log.action === "APPROVE_DOCUMENT" ? (
                          <span>
                            Approved for{" "}
                            <b>
                              {getTargetDisplayName(log.target_type, log.target_id, log.details)}
                            </b>
                          </span>
                        ) : log.action === "CREATE" && log.target_type === "quotes" ? (
                          <span>
                            Quote{" "}
                            <span className="font-mono text-primary">
                              {(log.details?.reference as string | undefined) || log.target_id}
                            </span>{" "}
                            saved as draft
                          </span>
                        ) : (
                          <span>
                            {friendlyEventName} · {log.target_type}
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-muted-foreground shrink-0">
                        {log.user_email || "system"} ·{" "}
                        {new Date(log.created_at).toLocaleString("en-GB")}
                      </div>
                    </div>
                  </div>
                );
              }}
              emptyMessage="No logs matching filters."
              emptyIcon={
                <span className="py-20 text-center text-xs font-mono text-muted-foreground" />
              }
            />
          )}
        </div>

        {/* Pagination Controls - Always Locked to the Bottom of this container */}
        <div className="border-t border-border px-4 py-3 flex items-center justify-between bg-muted/30 mt-auto">
          <span className="text-[10px] font-mono text-muted-foreground">
            Showing{" "}
            <span className="text-foreground">
              {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredLogs.length)}
            </span>{" "}
            of <span className="text-foreground">{filteredLogs.length}</span> actions
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded bg-secondary border border-border text-muted-foreground hover:text-white disabled:opacity-30 disabled:hover:text-muted-foreground transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono text-foreground px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded bg-secondary border border-border text-muted-foreground hover:text-white disabled:opacity-30 disabled:hover:text-muted-foreground transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Details Drawer */}
      {selectedLog && (
        <div
          onClick={handleBackdropClick}
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in text-white"
        >
          <div className="w-full max-w-2xl bg-card border-l border-border h-full p-6 flex flex-col justify-between shadow-2xl animate-slide-in-right">
            <div className="space-y-6 overflow-y-auto pr-1">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${getActionColor(selectedLog.action)}`}
                    >
                      {selectedLog.action}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                      {selectedLog.target_type}
                    </span>
                  </div>
                  <h3 className="text-lg font-black font-archivo tracking-tight">
                    {getEventLabel(selectedLog.action)}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 hover:bg-foreground/10 rounded-lg text-muted-foreground hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-4 bg-foreground/5 border border-border rounded-xl p-4 text-[11px] font-mono">
                <div>
                  <p className="text-muted-foreground uppercase font-black text-[9px] tracking-wider">
                    Timestamp
                  </p>
                  <p className="text-foreground mt-0.5">
                    {new Date(selectedLog.created_at).toLocaleString("en-GB")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase font-black text-[9px] tracking-wider">
                    Operator
                  </p>
                  <p className="text-foreground mt-0.5">
                    {selectedLog.user_email || "System / Automated"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground uppercase font-black text-[9px] tracking-wider">
                    Target Resource
                  </p>
                  <p className="text-foreground mt-0.5 select-all font-sans font-bold text-sm">
                    {getTargetDisplayName(
                      selectedLog.target_type,
                      selectedLog.target_id,
                      selectedLog.details,
                    )}
                  </p>
                  {/* Use optional chaining to safely check target_id prefix if it is null */}
                  {selectedLog.target_type === "staff" &&
                    selectedLog.target_id?.startsWith("worker-") && (
                      <span className="text-[9px] text-muted-foreground font-mono tracking-normal block mt-0.5">
                        ID: {selectedLog.target_id}
                      </span>
                    )}
                </div>
              </div>

              {/* Data Diff */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                  <FileJson className="w-3.5 h-3.5" />
                  <span>Payload Details</span>
                </div>

                {selectedLog.action === "UPDATE" && selectedLog.details?.old ? (
                  <AuditDiffTable
                    diff={computeDiff(selectedLog.details.old, selectedLog.details.new)}
                  />
                ) : (
                  <pre className="p-4 bg-muted/30 border border-border rounded-xl text-[10px] font-mono text-foreground overflow-x-auto max-h-[400px]">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-4 mt-6 flex justify-between gap-4">
              <button
                onClick={() => requestRestore(selectedLog)}
                disabled={restoring}
                className="px-4 py-2 bg-primary/80 hover:bg-primary text-xs font-mono font-bold uppercase rounded-lg transition-all text-primary-foreground disabled:opacity-50"
              >
                {restoring ? "Restoring..." : "Restore to this State"}
              </button>
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-secondary hover:bg-muted text-xs font-mono font-bold uppercase rounded-lg border border-border transition-all text-foreground"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={restoreConfirmOpen}
        onOpenChange={setRestoreConfirmOpen}
        tone="destructive"
        title="Restore Record"
        message={`Are you sure you want to restore the state of the ${logPendingRestore?.target_type ?? "selected"} record? This action will overwrite current data.`}
        confirmLabel="Restore"
        onConfirm={() => {
          if (logPendingRestore) {
            handleRestore(logPendingRestore);
          }
        }}
      />
    </div>
  );
};
