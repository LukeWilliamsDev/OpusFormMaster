// @ts-nocheck
import React from "react";
import { Loader, Search, PencilLine, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { computeDiff } from "../utils/auditDiff";

// Only these job columns count as a real "job detail change" worth surfacing
// an audit entry + Revert button for — same convention as the staff dossier.
export const JOB_REVERTIBLE_FIELDS = [
  "site_name",
  "main_contractor",
  "postcode",
  "contract_max_pours",
  "status",
];
export const JOB_FIELD_LABELS: Record<string, string> = {
  site_name: "Site Name",
  main_contractor: "Main Contractor",
  postcode: "Postcode",
  contract_max_pours: "Contract Max Pours",
  status: "Project Status",
};

interface HistoryTabProps {
  jobAuditLogs: any[];
  loadingJobAuditLogs: boolean;
  auditSearch: string;
  setAuditSearch: (value: string) => void;
  formatPourDate: (date: any) => string;
  setRevertConfirmTarget: (target: any) => void;
}

export function HistoryTab({
  jobAuditLogs,
  loadingJobAuditLogs,
  auditSearch,
  setAuditSearch,
  formatPourDate,
  setRevertConfirmTarget,
}: HistoryTabProps) {
  return (
    <div className="space-y-4">
      {(() => {
        const events = jobAuditLogs
          .map((l) => {
            const diff =
              l.action === "UPDATE" && l.details?.old
                ? computeDiff(l.details.old, l.details.new)
                : [];
            return { ...l, diff };
          })
          .filter((event) => {
            if (event.action === "UPDATE") {
              return event.diff.some((d: any) => JOB_REVERTIBLE_FIELDS.includes(d.field));
            }
            return true;
          })
          .filter((event) => {
            const searchLower = auditSearch.trim().toLowerCase();
            if (!searchLower) return true;
            return (event.user_email || "").toLowerCase().includes(searchLower);
          });

        return (
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search actor..."
                className="pl-8"
              />
            </div>

            {loadingJobAuditLogs ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                <Loader className="w-4 h-4 animate-spin text-primary" />
                <span>Loading audit log...</span>
              </div>
            ) : events.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted-foreground text-[13px] font-bold uppercase tracking-wider">
                No audit history for this job
              </div>
            ) : (
              <div className="divide-y divide-border">
                {events.map((event) => {
                  const changedFields = event.diff
                    .filter((d: any) => JOB_REVERTIBLE_FIELDS.includes(d.field))
                    .map((d: any) => JOB_FIELD_LABELS[d.field] || d.field);

                  const pourLabel = event.details?.pour_number
                    ? `Pour #${event.details.pour_number} (${event.details.mix_type}, ${event.details.volume_m3}m³)`
                    : "";

                  let badgeColor = "bg-secondary border-border text-muted-foreground";
                  let summaryText = "";
                  if (event.action === "CREATE") {
                    badgeColor = "bg-primary/10 border-primary/20 text-primary";
                    summaryText = "Job record created";
                  } else if (event.action === "UPDATE") {
                    summaryText = changedFields.length
                      ? `Job Details Updated: ${changedFields.join(", ")}`
                      : "Job Details Have Been Updated";
                  } else if (event.action === "SCHEDULE_POUR") {
                    badgeColor = "bg-primary/10 border-primary/20 text-primary";
                    summaryText = `Scheduled ${pourLabel}, expected ${formatPourDate(event.details.date)}`;
                  } else if (event.action === "COMPLETE_POUR") {
                    badgeColor = "bg-success/10 border-success/20 text-success";
                    summaryText = `Marked ${pourLabel} complete`;
                  } else if (event.action === "REVERT_POUR") {
                    badgeColor = "bg-warning/10 border-warning/20 text-warning";
                    summaryText = `Reverted ${pourLabel} back to scheduled`;
                  } else if (event.action === "REMOVE_POUR") {
                    badgeColor = "bg-destructive/10 border-destructive/20 text-destructive";
                    summaryText = `Removed ${pourLabel} from the log`;
                  } else if (event.action === "UPDATE_POUR_NOTES") {
                    badgeColor = "bg-secondary border-border text-muted-foreground";
                    summaryText = `Updated notes on ${pourLabel}`;
                  } else if (event.action === "ASSIGN_STAFF") {
                    badgeColor = "bg-primary/10 border-primary/20 text-primary";
                    summaryText = `${event.details?.worker_name || "Staff member"} assigned to site`;
                  } else if (event.action === "REALLOCATE_STAFF") {
                    badgeColor = "bg-warning/10 border-warning/20 text-warning";
                    summaryText = `${event.details?.worker_name || "Staff member"} reallocated to this job`;
                  } else if (event.action === "REMOVE_STAFF") {
                    badgeColor = "bg-destructive/10 border-destructive/20 text-destructive";
                    summaryText = `${event.details?.worker_name || "Staff member"} removed from site`;
                  } else if (event.action === "UPLOAD_ATTACHMENT") {
                    badgeColor = "bg-primary/10 border-primary/20 text-primary";
                    const attachmentLabel =
                      event.details?.attachment_type === "document"
                        ? "Document"
                        : event.details?.attachment_type === "image_after"
                          ? "After photo"
                          : "Before photo";
                    summaryText = `${attachmentLabel} uploaded: ${event.details?.file_name || ""}`;
                  } else if (event.action === "GENERATE_UPLOAD_LINK") {
                    badgeColor = "bg-secondary border-border text-muted-foreground";
                    summaryText = "External upload link generated";
                  } else if (event.action === "EXTERNAL_UPLOAD") {
                    badgeColor = "bg-primary/10 border-primary/20 text-primary";
                    summaryText = `Document submitted via external link: ${event.details?.file_name || ""}`;
                  } else if (event.action === "VIEW_ATTACHMENT") {
                    badgeColor = "bg-secondary border-border text-muted-foreground";
                    summaryText = `Accessed: ${event.details?.file_name || "attachment"}`;
                  } else if (event.action === "DELETE_ATTACHMENT") {
                    badgeColor = "bg-destructive/10 border-destructive/20 text-destructive";
                    summaryText = `Deleted: ${event.details?.file_name || "attachment"}`;
                  } else {
                    summaryText = event.action?.replace(/_/g, " ");
                  }

                  const canRevert = event.action === "UPDATE" && changedFields.length > 0;
                  const isPourEvent = pourLabel !== "";

                  return (
                    <div key={event.id} className="py-2.5 flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {isPourEvent ? (
                          <Layers className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <PencilLine className="w-3.5 h-3.5 text-primary" />
                        )}
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-widest border shrink-0 ${badgeColor}`}
                      >
                        {event.action?.replace(/_/g, " ")}
                      </span>
                      <p className="flex-1 min-w-0 truncate text-[13px] text-foreground/90">
                        {summaryText}
                      </p>
                      {canRevert && (
                        <button
                          type="button"
                          onClick={() =>
                            setRevertConfirmTarget({
                              oldDetails: event.details?.old,
                              newDetails: event.details?.new,
                            })
                          }
                          className="shrink-0 px-2.5 py-1 rounded bg-secondary hover:bg-warning/10 text-foreground/85 hover:text-warning border border-border hover:border-warning/30 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Revert
                        </button>
                      )}
                      <span className="text-[12px] text-muted-foreground shrink-0">
                        {new Date(event.created_at).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
