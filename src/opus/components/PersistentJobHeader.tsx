import React, { useState } from "react";
import { Phone, ShieldAlert, CheckCircle2, Clock, FileText, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Worker } from "../types/erp";
import { getTicketStatus } from "../utils/workerValidation";
import { supabase } from "../../integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PourLog {
  id: string;
  pourNumber: number;
  date: string;
  mixType: string;
  volumeM3: number;
  status: "completed" | "scheduled";
  notes?: string;
}

export function getNextScheduledPour(pourLogs: PourLog[]): PourLog | null {
  const scheduled = pourLogs.filter((p) => p.status === "scheduled");
  if (scheduled.length === 0) return null;
  return [...scheduled].sort((a, b) => (a.date || "").localeCompare(b.date || ""))[0];
}

interface PersistentJobHeaderProps {
  groupedStaff: { [key: string]: Worker[] };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

async function viewTicketDocument(documentUrl: string) {
  const newTab = window.open("", "_blank");
  if (documentUrl.includes("/compliance-documents/")) {
    try {
      const filePath = documentUrl.split("/compliance-documents/")[1];
      const { data, error } = await supabase.storage
        .from("compliance-documents")
        .createSignedUrl(filePath, 60);
      if (error) throw error;
      if (data?.signedUrl) {
        if (newTab) newTab.location.href = data.signedUrl;
        return;
      }
    } catch (err) {
      console.error("Failed to generate signed URL:", err);
    }
  }
  if (newTab) newTab.location.href = documentUrl;
}

export const PersistentJobHeader: React.FC<PersistentJobHeaderProps> = ({ groupedStaff }) => {
  const [selectedWorker, setSelectedWorker] = useState<(Worker & { roleName: string }) | null>(
    null,
  );
  const staffCount = Object.values(groupedStaff).reduce((sum, list) => sum + list.length, 0);

  const staffList = Object.entries(groupedStaff).flatMap(([roleName, workers]) =>
    workers.map((w) => ({ ...w, roleName })),
  );

  return (
    <div className="p-4">
      <div className="h-8 flex items-center gap-2 mb-3">
        <h2 className="text-sm font-bold text-foreground">Staff On Site</h2>
        <span className="text-xs font-bold text-foreground bg-secondary border border-border rounded-full px-2 py-0.5">
          {staffCount}
        </span>
      </div>

      <div className="space-y-2 max-h-[248px] overflow-y-auto pr-0.5">
        {staffList.length > 0 ? (
          staffList.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setSelectedWorker(w)}
              className="min-h-14 w-full text-left bg-background border border-border rounded-lg p-2.5 flex items-center gap-3 hover:border-primary/30 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-secondary text-foreground text-[11px] font-bold flex items-center justify-center shrink-0">
                {initials(w.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-foreground truncate">{w.name}</div>
                <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {w.roleName}
                  {w.phone && ` · ${w.phone}`}
                </div>
              </div>
              {w.phone && (
                <a
                  href={`tel:${w.phone}`}
                  aria-label={`Call ${w.name}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors shrink-0"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
            </button>
          ))
        ) : (
          <div className="text-xs text-muted-foreground py-4 text-center uppercase tracking-wider">
            No staff members scheduled to this job site.
          </div>
        )}
      </div>

      <Dialog open={!!selectedWorker} onOpenChange={(open) => !open && setSelectedWorker(null)}>
        <DialogContent className="max-w-md">
          {selectedWorker && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-secondary text-foreground text-xs font-bold flex items-center justify-center shrink-0">
                    {initials(selectedWorker.name)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{selectedWorker.name}</div>
                    <div className="text-[11px] text-muted-foreground font-normal">
                      {selectedWorker.roleName}
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {selectedWorker.tickets.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-border rounded-xl text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                    No compliance certificates or tickets registered
                  </div>
                ) : (
                  selectedWorker.tickets.map((ticket) => {
                    const status = getTicketStatus(ticket);
                    const isExpired = status === "EXPIRED";
                    const isExpiringSoon = status === "EXPIRING_SOON";
                    const expiryDate = new Date(ticket.expiryDate);

                    let iconBox = "border-success/20 bg-success/15 text-success";
                    let badgeClass = "bg-success/20 border-success/30 text-success";
                    let statusText = "ACTIVE";
                    let LeftIcon = CheckCircle2;

                    if (isExpired) {
                      iconBox = "border-destructive/20 bg-destructive/15 text-destructive";
                      badgeClass = "bg-destructive/20 border-destructive/30 text-destructive";
                      statusText = "EXPIRED";
                      LeftIcon = ShieldAlert;
                    } else if (isExpiringSoon) {
                      iconBox = "border-warning/20 bg-warning/15 text-warning";
                      badgeClass = "bg-warning/20 border-warning/30 text-warning";
                      LeftIcon = Clock;
                      const anchorDate = new Date();
                      anchorDate.setHours(0, 0, 0, 0);
                      const diffDays = Math.max(
                        0,
                        Math.ceil(
                          (expiryDate.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24),
                        ),
                      );
                      statusText = `${diffDays} DAYS LEFT`;
                    }

                    const formattedDate = expiryDate.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });

                    return (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${iconBox}`}
                          >
                            <LeftIcon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-bold text-foreground truncate">
                                {ticket.type}
                              </span>
                              {statusText !== "ACTIVE" && (
                                <span
                                  className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-md uppercase tracking-wider border ${badgeClass}`}
                                >
                                  {statusText}
                                </span>
                              )}
                            </div>
                            {!isExpired && (
                              <div className="text-[11px] text-muted-foreground">
                                Expires: {formattedDate}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            ticket.documentUrl
                              ? viewTicketDocument(ticket.documentUrl)
                              : toast("No document attached")
                          }
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
                          aria-label={`View ${ticket.type} document`}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
