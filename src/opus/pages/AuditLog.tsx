import React, { useEffect, useState } from "react";
import { CardGrid } from "../components/CardGrid";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  Search,
  LogIn,
  LogOut,
  KeyRound,
  UserX,
  PencilLine,
  Plus,
  CheckCircle2,
  XCircle,
  Send,
  Eye,
} from "lucide-react";
import { computeDiff, getEventLabel } from "../utils/auditDiff";
import { toast } from "sonner";
import { handleError } from "../utils/errorHandler";

const ITEMS_PER_PAGE = 15;

function summarizeChangedFields(details: Record<string, unknown> | null | undefined): string {
  const diff = computeDiff(details?.old, details?.new);
  if (diff.length === 0) return "";
  const names = diff.map((d) => d.field.replace(/_/g, " ")).slice(0, 2);
  const rest = diff.length - names.length;
  return `${names.join(", ")}${rest > 0 ? ` +${rest} more` : ""} changed`;
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
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
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

  const actionOptions = Array.from(new Set(logs.map((l) => l.action))).sort();

  const searchLower = search.trim().toLowerCase();
  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    if (!searchLower) return true;
    return (
      (log.user_email || "").toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.target_type.toLowerCase().includes(searchLower) ||
      log.target_id.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));
  const currentPageClamped = Math.min(currentPage, totalPages);
  const paginatedLogs = filteredLogs.slice(
    (currentPageClamped - 1) * ITEMS_PER_PAGE,
    currentPageClamped * ITEMS_PER_PAGE,
  );

  return (
    <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto space-y-6 animate-fade-in text-foreground flex flex-col bg-background">
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-archivo tracking-tight">
          Site Log
        </h1>
      </div>

      <div className="flex-grow flex flex-col justify-between bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search actor or action..."
                className="w-full pl-7 pr-2 py-1.5 bg-card/60 border border-border rounded-lg text-[10.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-accent/50"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1.5 bg-card/60 border border-border rounded-lg text-[10.5px] text-foreground focus:outline-none focus:border-brand-accent/50 cursor-pointer"
            >
              <option value="all">All Actions</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

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
              className="divide-y divide-border"
              renderCard={(log) => {
                // Icon + color matching the event's action, same convention as the staff dossier
                let badgeColor = "bg-secondary border-border text-muted-foreground";
                let iconBg = "bg-primary/10";
                let iconColor = "text-primary";
                let LogIcon = Activity;
                if (log.action === "LOGIN_SUCCESS") {
                  badgeColor = "bg-success/10 border-success/20 text-success";
                  iconBg = "bg-success/10";
                  iconColor = "text-success";
                  LogIcon = LogIn;
                } else if (log.action === "LOGOUT") {
                  iconBg = "bg-secondary";
                  iconColor = "text-muted-foreground";
                  LogIcon = LogOut;
                } else if (log.action.includes("PASSWORD")) {
                  badgeColor = "bg-warning/10 border-warning/20 text-warning";
                  iconBg = "bg-warning/10";
                  iconColor = "text-warning";
                  LogIcon = KeyRound;
                } else if (log.action.includes("LOGIN_FAIL")) {
                  badgeColor = "bg-destructive/10 border-destructive/20 text-destructive";
                  iconBg = "bg-destructive/10";
                  iconColor = "text-destructive";
                  LogIcon = XCircle;
                } else if (log.action === "USER_DELETED" || log.action.includes("DELETE")) {
                  badgeColor = "bg-destructive/10 border-destructive/20 text-destructive";
                  iconBg = "bg-destructive/10";
                  iconColor = "text-destructive";
                  LogIcon = UserX;
                } else if (log.action.includes("REJECT")) {
                  badgeColor = "bg-destructive/10 border-destructive/20 text-destructive";
                  iconBg = "bg-destructive/10";
                  iconColor = "text-destructive";
                  LogIcon = XCircle;
                } else if (log.action.includes("APPROVE")) {
                  badgeColor = "bg-success/10 border-success/20 text-success";
                  iconBg = "bg-success/10";
                  iconColor = "text-success";
                  LogIcon = CheckCircle2;
                } else if (log.action === "CREATE") {
                  badgeColor = "bg-primary/10 border-primary/20 text-primary";
                  iconBg = "bg-primary/10";
                  iconColor = "text-primary";
                  LogIcon = Plus;
                } else if (log.action === "UPDATE") {
                  badgeColor = "bg-primary/10 border-primary/20 text-primary";
                  iconBg = "bg-primary/10";
                  iconColor = "text-primary";
                  LogIcon = PencilLine;
                } else if (log.action === "INSPECT") {
                  iconBg = "bg-purple-500/10";
                  iconColor = "text-purple-600 dark:text-purple-400";
                  LogIcon = Eye;
                } else {
                  LogIcon = Send;
                }

                const friendlyEventName = getEventLabel(log.action);
                const oldVal = log.details?.old as Record<string, unknown> | undefined;
                const newVal = log.details?.new as Record<string, unknown> | undefined;
                const isQuoteSent =
                  log.action === "UPDATE" &&
                  log.target_type === "quotes" &&
                  oldVal?.is_sent === false &&
                  newVal?.is_sent === true;
                const changeSummary =
                  log.action === "UPDATE" && !isQuoteSent
                    ? summarizeChangedFields(log.details)
                    : "";

                return (
                  <div
                    key={log.id}
                    className="flex flex-wrap sm:flex-nowrap items-center gap-x-2.5 gap-y-1.5 py-2.5 px-2.5 -mx-2.5"
                  >
                    <div
                      className={`w-6 h-6 rounded-full ${iconBg} flex items-center justify-center shrink-0`}
                    >
                      <LogIcon className={`w-3.5 h-3.5 ${iconColor}`} />
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-widest border shrink-0 ${badgeColor}`}
                    >
                      {friendlyEventName}
                    </span>
                    <p className="flex-1 min-w-0 basis-full sm:basis-auto order-3 sm:order-none truncate sm:whitespace-normal text-[13px] text-foreground/90">
                      {log.action === "APPROVE_DOCUMENT" ? (
                        <span>
                          Approved for{" "}
                          <b>{getTargetDisplayName(log.target_type, log.target_id, log.details)}</b>
                        </span>
                      ) : log.action === "CREATE" && log.target_type === "quotes" ? (
                        <span>
                          Quote{" "}
                          <span className="font-mono text-primary">
                            {(log.details?.reference as string | undefined) || log.target_id}
                          </span>{" "}
                          saved as draft
                        </span>
                      ) : isQuoteSent ? (
                        <span>
                          Quote{" "}
                          <span className="font-mono text-primary">
                            {(newVal?.reference as string | undefined) || log.target_id}
                          </span>{" "}
                          sent to client
                        </span>
                      ) : changeSummary ? (
                        <span>
                          {getTargetDisplayName(log.target_type, log.target_id, log.details)} ·{" "}
                          {changeSummary}
                        </span>
                      ) : log.details?.target_email ? (
                        <span>
                          {friendlyEventName}: <b>{log.details.target_email as string}</b>
                        </span>
                      ) : log.target_type === "auth" ? (
                        <span>{friendlyEventName}</span>
                      ) : (
                        <span>
                          {friendlyEventName} ·{" "}
                          {getTargetDisplayName(log.target_type, log.target_id, log.details)}
                        </span>
                      )}
                    </p>
                    <span className="text-[12px] text-muted-foreground shrink-0">
                      {new Date(log.created_at).toLocaleString("en-GB")}
                    </span>
                  </div>
                );
              }}
              emptyMessage="No logs matching filters."
              emptyIcon={
                <span className="py-20 text-center text-xs font-mono text-muted-foreground" />
              }
            />
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPageClamped === 1}
                className="px-3.5 py-1.5 bg-card/60 border border-border text-[10px] font-bold uppercase tracking-wider rounded-lg text-muted-foreground hover:text-foreground transition-all disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Page {currentPageClamped} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPageClamped === totalPages}
                className="px-3.5 py-1.5 bg-card/60 border border-border text-[10px] font-bold uppercase tracking-wider rounded-lg text-muted-foreground hover:text-foreground transition-all disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
