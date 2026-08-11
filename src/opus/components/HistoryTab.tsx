import React, { useState } from "react";
import { CardGrid } from "../components/CardGrid";
import { Loader, Search, PencilLine, Layers, FileCheck2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Database } from "@/integrations/supabase/types";
import { computeDiff, DiffEntry, getEventLabel, getActorName } from "../utils/auditDiff";

const ITEMS_PER_PAGE = 8;

type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

interface JobAuditDetails {
  old?: Record<string, unknown>;
  new?: Record<string, unknown>;
  pour_number?: number;
  mix_type?: string;
  volume_m3?: number;
  date?: string;
  worker_name?: string;
  attachment_type?: string;
  file_name?: string;
  note_body?: string;
  reference?: string;
}

// Only these job columns count as a real "job detail change" worth surfacing
// an audit entry + Revert button for — same convention as the staff dossier.
export const JOB_REVERTIBLE_FIELDS = [
  "site_name",
  "main_contractor",
  "postcode",
  "contract_max_pours",
  "status",
];
interface HistoryTabProps {
  jobAuditLogs: AuditLogRow[];
  loadingJobAuditLogs: boolean;
  auditSearch: string;
  setAuditSearch: (value: string) => void;
}

export function HistoryTab({
  jobAuditLogs,
  loadingJobAuditLogs,
  auditSearch,
  setAuditSearch,
}: HistoryTabProps) {
  const [page, setPage] = useState(1);

  return (
    <div className="space-y-4">
      {(() => {
        const events = jobAuditLogs
          .map((l) => {
            const details = (l.details ?? undefined) as JobAuditDetails | undefined;
            const diff: DiffEntry[] =
              l.action === "UPDATE" && details?.old ? computeDiff(details.old, details.new) : [];
            return { ...l, details, diff };
          })
          .filter((event) => {
            if (event.action === "UPDATE") {
              return event.diff.some((d) => JOB_REVERTIBLE_FIELDS.includes(d.field));
            }
            return true;
          })
          .filter((event) => {
            const searchLower = auditSearch.trim().toLowerCase();
            if (!searchLower) return true;
            return (event.user_email || "").toLowerCase().includes(searchLower);
          });

        const totalPages = Math.max(1, Math.ceil(events.length / ITEMS_PER_PAGE));
        const currentPage = Math.min(page, totalPages);
        const paginatedEvents = events.slice(
          (currentPage - 1) * ITEMS_PER_PAGE,
          currentPage * ITEMS_PER_PAGE,
        );

        return (
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={auditSearch}
                onChange={(e) => {
                  setAuditSearch(e.target.value);
                  setPage(1);
                }}
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
              <CardGrid
                items={paginatedEvents}
                className="grid grid-cols-1 gap-4"
                renderCard={(event) => {
                  const pourLabel = event.details?.pour_number
                    ? `Pour #${event.details.pour_number} (${event.details.mix_type}, ${event.details.volume_m3}m³)`
                    : "";

                  let badgeColor = "bg-secondary border-border text-muted-foreground";
                  if (event.action === "CREATE" || event.action === "UPDATE") {
                    badgeColor = "bg-primary/10 border-primary/20 text-primary";
                  } else if (
                    event.action === "SCHEDULE_POUR" ||
                    event.action === "ASSIGN_STAFF" ||
                    event.action === "UPLOAD_ATTACHMENT" ||
                    event.action === "EXTERNAL_UPLOAD" ||
                    event.action === "ADD_NOTE"
                  ) {
                    badgeColor = "bg-primary/10 border-primary/20 text-primary";
                  } else if (
                    event.action === "COMPLETE_POUR" ||
                    event.action === "INVOICE_SENT" ||
                    event.action === "QUOTE_SENT"
                  ) {
                    badgeColor = "bg-success/10 border-success/20 text-success";
                  } else if (
                    event.action === "REVERT_POUR" ||
                    event.action === "REALLOCATE_STAFF"
                  ) {
                    badgeColor = "bg-warning/10 border-warning/20 text-warning";
                  } else if (
                    event.action === "REMOVE_POUR" ||
                    event.action === "REMOVE_STAFF" ||
                    event.action === "DELETE_ATTACHMENT" ||
                    event.action === "DELETE_NOTE"
                  ) {
                    badgeColor = "bg-destructive/10 border-destructive/20 text-destructive";
                  }

                  const summaryText = `${getEventLabel(event.action)} · ${getActorName(event.user_email)}`;
                  const isPourEvent = pourLabel !== "";

                  return (
                    <div key={event.id} className="space-y-1.5">
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-x-2.5 gap-y-1.5">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          {event.action === "INVOICE_SENT" || event.action === "QUOTE_SENT" ? (
                            <FileCheck2 className="w-3.5 h-3.5 text-primary" />
                          ) : isPourEvent ? (
                            <Layers className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <PencilLine className="w-3.5 h-3.5 text-primary" />
                          )}
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-widest border shrink-0 ${badgeColor}`}
                        >
                          {getEventLabel(event.action)}
                        </span>
                        <p className="flex-1 min-w-0 basis-full sm:basis-auto order-3 sm:order-none truncate sm:whitespace-normal text-[13px] text-foreground/90">
                          {summaryText}
                        </p>
                        <span className="text-[12px] text-muted-foreground shrink-0 whitespace-nowrap">
                          {event.created_at
                            ? new Date(event.created_at).toLocaleString("en-GB")
                            : ""}
                        </span>
                      </div>
                    </div>
                  );
                }}
                emptyMessage="No audit history for this job"
                emptyIcon={
                  <span className="p-8 text-center border border-dashed border-border rounded-xl text-muted-foreground text-[13px] font-bold uppercase tracking-wider" />
                }
              />
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3.5 py-1.5 bg-card/60 border border-border text-[10px] font-bold uppercase tracking-wider rounded-lg text-muted-foreground hover:text-foreground transition-all disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3.5 py-1.5 bg-card/60 border border-border text-[10px] font-bold uppercase tracking-wider rounded-lg text-muted-foreground hover:text-foreground transition-all disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
