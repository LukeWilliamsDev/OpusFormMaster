// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  Trash2,
  ShieldAlert,
  X,
  Phone,
  Mail,
  FileText,
  UploadCloud,
  Download,
  FilePlus,
  AlertTriangle,
  UserPlus,
  Calendar,
  MapPin,
  ChevronLeft,
  Edit,
  Send,
  LayoutGrid,
  List,
  RefreshCw,
  CheckCircle2,
  Clock,
  Link2,
  Copy,
} from "lucide-react";
import { Worker, Ticket, Job } from "../types/erp";
import { getTicketStatus } from "../utils/workerValidation";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { RequestCredentialsModal } from "./RequestCredentialsModal";
import { supabase } from "../../integrations/supabase/client";
import { workerToRow, usePortal } from "../context/PortalContext";
import { computeDiff } from "../utils/auditDiff";
import { AuditDiffTable } from "./AuditDiffTable";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

interface RosterViewProps {
  workers: Worker[];
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  setShifts: React.Dispatch<React.SetStateAction<any[]>>;
  shifts?: any[];
  jobs?: Job[];
  selectedWorkerDetailsId?: string | null;
  setSelectedWorkerDetailsId?: (id: string | null) => void;
  autoOpenAddWorker?: boolean;
}

export const ON_SITE_CERTIFICATIONS = [
  "Abrasive Wheels Certification",
  "Blue CPCS Competence Card",
  "Blue CSCS Skilled Worker Card",
  "CITB Health Safety and Environment Test",
  "COSHH Wet Concrete Awareness",
  "CPCS A73 Plant Signaller Vehicle Marshaller",
  "CPCS Category A06 Concrete Placing Boom",
  "CPCS Category A17 Telescopic Handler",
  "CPCS Category A44 Trailer Mounted Concrete Pump",
  "CSCS Labourer Card",
  "Emergency First Aid at Work",
  "Face Fit Testing Respirable Crystalline Silica",
  "Harness Awareness Inspection Ticket",
  "Manual Handling",
  "Site Supervisor Safety Training Scheme",
  "Suspended Loads Endorsement",
  "Working at Heights Certification",
];

export const STAFF_ROLES = [
  "Concrete Finisher",
  "Concrete Operative",
  "Concrete Pour Supervisor",
  "Concrete Pump Operator",
  "Decking Assistant",
  "Director",
  "Ganger",
  "General Construction Labourer",
  "Inbound Sales Representative",
  "IT",
  "Logistics and Operations Coordinator",
  "Material Handler",
  "Telehandler Operator",
];

export const OFFICE_ROLES = [
  "Director",
  "IT",
  "Inbound Sales Representative",
  "Logistics and Operations Coordinator",
];

export const RosterView: React.FC<RosterViewProps> = ({
  workers,
  setWorkers,
  setShifts,
  shifts = [],
  jobs = [],
  selectedWorkerDetailsId: propSelectedWorkerDetailsId,
  setSelectedWorkerDetailsId: propSetSelectedWorkerDetailsId,
  autoOpenAddWorker = false,
}) => {
  const { profile, role } = usePortal();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddWorkerForm, setShowAddWorkerForm] = useState(false);

  useEffect(() => {
    if (autoOpenAddWorker) setShowAddWorkerForm(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenAddWorker]);

  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerRole, setNewWorkerRole] = useState<string>("Concrete Operative");
  const [newWorkerPhone, setNewWorkerPhone] = useState("");
  const [newWorkerEmail, setNewWorkerEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submittingWorker, setSubmittingWorker] = useState(false);

  const [localSelectedWorkerDetailsId, setLocalSelectedWorkerDetailsId] = useState<string | null>(
    null,
  );

  const selectedWorkerDetailsId =
    propSelectedWorkerDetailsId !== undefined
      ? propSelectedWorkerDetailsId
      : localSelectedWorkerDetailsId;

  const setSelectedWorkerDetailsId =
    propSetSelectedWorkerDetailsId !== undefined
      ? propSetSelectedWorkerDetailsId
      : setLocalSelectedWorkerDetailsId;

  const [selectedWorkerToDelete, setSelectedWorkerToDelete] = useState<Worker | null>(null);
  const [ticketToRemove, setTicketToRemove] = useState<Ticket | null>(null);
  const [selectedWorkerToPermanentDelete, setSelectedWorkerToPermanentDelete] =
    useState<Worker | null>(null);
  const [selectedWorkerToRestore, setSelectedWorkerToRestore] = useState<Worker | null>(null);
  const [revertConfirmTarget, setRevertConfirmTarget] = useState<{
    oldDetails: any;
    currentDetails: any;
    workerId: string;
  } | null>(null);

  const [workerToEdit, setWorkerToEdit] = useState<Worker | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<string>("Concrete Operative");

  const [rosterMode, setRosterMode] = useState<"active" | "archived">("active");
  const [showAllHistory, setShowAllHistory] = useState(false);

  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTickets, setEditTickets] = useState<Ticket[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [showReminderConfirm, setShowReminderConfirm] = useState(false);

  const [activeDossierTab, setActiveDossierTab] = useState<"general" | "assignments" | "audit_log">(
    "general",
  );
  const [dossierAuditLogs, setDossierAuditLogs] = useState<any[]>([]);
  const [dossierDocRequests, setDossierDocRequests] = useState<any[]>([]);
  const [loadingDossierLogs, setLoadingDossierLogs] = useState(false);
  const [resendingRequestMap, setResendingRequestMap] = useState<Record<string, boolean>>({});
  const [auditLogPage, setAuditLogPage] = useState(1);
  const [copiedRequestId, setCopiedRequestId] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedRequestId(id);
    setTimeout(() => setCopiedRequestId(null), 2000);
  };

  useEffect(() => {
    setShowAllHistory(false);
    setActiveDossierTab("general");
    setAuditLogPage(1);
    setExpandedEventId(null);

    // If a staff member is selected, log an INSPECT action to the audit logs
    if (selectedWorkerDetailsId) {
      // Fetch the authenticated user email from Supabase to dynamically log the actor
      supabase.auth.getUser().then(({ data: { user } }) => {
        supabase
          .rpc("log_anonymous_audit", {
            p_user_email: user?.email || "admin@opusform.co.uk",
            p_action: "INSPECT",
            p_target_type: "staff",
            p_target_id: selectedWorkerDetailsId,
            p_details: { inspected: true },
          })
          .catch((err) => console.error("Failed to log INSPECT audit event:", err));
      });
    }
  }, [selectedWorkerDetailsId]);

  const fetchLogsAndRequests = async () => {
    if (!selectedWorkerDetailsId) return;
    setLoadingDossierLogs(true);
    try {
      const [logsRes, reqsRes] = await Promise.all([
        supabase
          .from("audit_logs")
          .select("*")
          .eq("target_type", "staff")
          .eq("target_id", selectedWorkerDetailsId)
          .order("created_at", { ascending: false }),
        supabase
          .from("document_requests")
          .select("*")
          .eq("worker_id", selectedWorkerDetailsId)
          .order("created_at", { ascending: false }),
      ]);

      if (logsRes.error) console.error("Error loading audit logs:", logsRes.error);
      if (reqsRes.error) console.error("Error loading document requests:", reqsRes.error);

      setDossierAuditLogs(logsRes.data || []);
      setDossierDocRequests(reqsRes.data || []);
    } catch (err) {
      console.error("Fetch logs error:", err);
    } finally {
      setLoadingDossierLogs(false);
    }
  };

  useEffect(() => {
    if (selectedWorkerDetailsId) {
      fetchLogsAndRequests();
    } else {
      setDossierAuditLogs([]);
      setDossierDocRequests([]);
    }
  }, [selectedWorkerDetailsId, activeDossierTab, showReminderConfirm, workerToEdit]);

  const handleResendRequest = async (request: any) => {
    if (resendingRequestMap[request.id]) return;
    setResendingRequestMap((prev) => ({ ...prev, [request.id]: true }));

    try {
      const worker = workers.find((w) => w.id === selectedWorkerDetailsId);
      if (!worker || !worker.email) {
        toast.error("Worker email is missing", { description: "Cannot resend request." });
        return;
      }

      const newExpiresAt = new Date();
      newExpiresAt.setHours(newExpiresAt.getHours() + 48);

      const { data, error: updateError } = await supabase
        .from("document_requests")
        .update({
          expires_at: newExpiresAt.toISOString(),
          completed_at: null,
        })
        .eq("id", request.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Expire other pending requests for the same worker
      await supabase
        .from("document_requests")
        .update({ expires_at: new Date().toISOString() })
        .eq("worker_id", selectedWorkerDetailsId)
        .neq("id", request.id)
        .is("completed_at", null);

      const uploadUrl = `${window.location.origin}/#/submit-credentials?token=${request.id}`;

      const { error: emailError } = await supabase.functions.invoke("send-compliance-email", {
        body: {
          toEmail: worker.email,
          workerName: worker.name,
          requestedCerts: request.requested_certs,
          uploadUrl: uploadUrl,
          expiresAt: newExpiresAt.toISOString(),
        },
      });

      const emailSentResult = !emailError;
      const emailErrorResult = emailError ? emailError.message : "";

      await supabase.rpc("log_anonymous_audit", {
        p_user_email: "admin@opusform.co.uk",
        p_action: "RESEND_DOCUMENT_REQUEST",
        p_target_type: "staff",
        p_target_id: worker.id,
        p_details: {
          request_id: request.id,
          requested_certs: request.requested_certs,
          email_sent: emailSentResult,
          email_error: emailErrorResult || undefined,
        },
      });

      // Refresh data
      const [updatedReqs, updatedLogs] = await Promise.all([
        supabase
          .from("document_requests")
          .select("*")
          .eq("worker_id", selectedWorkerDetailsId)
          .order("created_at", { ascending: false }),
        supabase
          .from("audit_logs")
          .select("*")
          .eq("target_type", "staff")
          .eq("target_id", selectedWorkerDetailsId)
          .order("created_at", { ascending: false }),
      ]);

      setDossierDocRequests(updatedReqs.data || []);
      setDossierAuditLogs(updatedLogs.data || []);
    } catch (e: any) {
      console.error("Failed to resend request:", e);
      toast.error("Failed to resend request", { description: e.message || String(e) });
    } finally {
      setResendingRequestMap((prev) => ({ ...prev, [request.id]: false }));
    }
  };

  const handleViewDocument = async (documentUrl: string) => {
    if (!documentUrl) return;

    if (documentUrl.includes("/compliance-documents/")) {
      try {
        const parts = documentUrl.split("/compliance-documents/");
        const filePath = parts[1];

        const { data, error } = await supabase.storage
          .from("compliance-documents")
          .createSignedUrl(filePath, 60);

        if (error) throw error;
        if (data?.signedUrl) {
          window.open(data.signedUrl, "_blank");
          return;
        }
      } catch (err) {
        console.error("Failed to generate signed URL:", err);
        window.open(documentUrl, "_blank");
        return;
      }
    }

    window.open(documentUrl, "_blank");
  };

  const executeRevertUpdate = async (oldDetails: any, workerId: string) => {
    if (!oldDetails || !workerId) return;
    try {
      const name = oldDetails.name;
      const role = oldDetails.role;
      const phone = oldDetails.phone ?? null;
      const email = oldDetails.email ?? null;
      const postcode = oldDetails.postcode ?? null;
      const tickets = oldDetails.tickets ?? [];
      const uploaded_certificates = oldDetails.uploaded_certificates ?? [];
      const is_archived = oldDetails.is_archived ?? false;

      const { error } = await supabase
        .from("staff")
        .update({
          name,
          role,
          phone,
          email,
          postcode,
          tickets,
          uploaded_certificates,
          is_archived,
        })
        .eq("id", workerId);

      if (error) throw error;

      setWorkers((prev) =>
        prev.map((w) =>
          w.id === workerId
            ? {
                ...w,
                name,
                role,
                phone: phone ?? undefined,
                email: email ?? undefined,
                postcode: postcode ?? undefined,
                tickets,
                uploadedCertificates: uploaded_certificates,
                isArchived: is_archived,
              }
            : w,
        ),
      );

      setRevertConfirmTarget(null);

      setTimeout(() => {
        fetchLogsAndRequests();
      }, 150);
    } catch (err: any) {
      console.error("Failed to revert staff changes:", err);
      toast.error("Error reverting changes", { description: err.message });
    }
  };

  const verifyTicket = async (workerId: string, ticketId: string, approve: boolean) => {
    const worker = workers.find((w) => w.id === workerId);
    if (!worker) return;

    let updatedTickets = [];
    if (approve) {
      updatedTickets = worker.tickets.map((t) =>
        t.id === ticketId ? { ...t, verified: true } : t,
      );
    } else {
      updatedTickets = worker.tickets.filter((t) => t.id !== ticketId);
    }

    const updatedWorker = {
      ...worker,
      tickets: updatedTickets,
    };

    setWorkers((prev) => prev.map((w) => (w.id === workerId ? updatedWorker : w)));

    try {
      const { error: dbError } = await supabase
        .from("staff")
        .update({ tickets: updatedTickets })
        .eq("id", workerId);

      if (dbError) throw dbError;

      const ticket = worker.tickets.find((t) => t.id === ticketId);
      await supabase.rpc("log_anonymous_audit", {
        p_user_email: "admin@opusform.co.uk",
        p_action: approve ? "APPROVE_DOCUMENT" : "REJECT_DOCUMENT",
        p_target_type: "staff",
        p_target_id: workerId,
        p_details: {
          ticket_id: ticketId,
          ticket_type: ticket?.type,
          ticket_number: ticket?.ticketNumber,
        },
      });

      fetchLogsAndRequests();
    } catch (e) {
      console.error("Failed to update tickets or log audit:", e);
    }
  };

  const removeTicket = async (workerId: string, ticket: Ticket) => {
    const worker = workers.find((w) => w.id === workerId);
    if (!worker) return;

    const updatedTickets = worker.tickets.filter((t) => t.id !== ticket.id);
    const updatedWorker = { ...worker, tickets: updatedTickets };

    setWorkers((prev) => prev.map((w) => (w.id === workerId ? updatedWorker : w)));

    try {
      const { error: dbError } = await supabase
        .from("staff")
        .update({ tickets: updatedTickets })
        .eq("id", workerId);

      if (dbError) throw dbError;

      await supabase.rpc("log_anonymous_audit", {
        p_user_email: "admin@opusform.co.uk",
        p_action: "REMOVE_DOCUMENT",
        p_target_type: "staff",
        p_target_id: workerId,
        p_details: {
          ticket_id: ticket.id,
          ticket_type: ticket.type,
          ticket_number: ticket.ticketNumber,
        },
      });

      fetchLogsAndRequests();
      toast.success(`${ticket.type} removed from compliance record`);
    } catch (e: any) {
      console.error("Failed to remove ticket or log audit:", e);
      toast.error("Failed to remove compliance record", { description: e.message });
      // Roll back the optimistic update
      setWorkers((prev) => prev.map((w) => (w.id === workerId ? worker : w)));
    }
  };

  const handleSendReminder = () => {
    if (selectedWorkerDetails) {
      console.log(
        `[DISPATCH] Compliance update requested for worker ${selectedWorkerDetails.name}. Automated SMS sent to ${selectedWorkerDetails.phone || "N/A"} and Email sent to ${selectedWorkerDetails.email || "N/A"}.`,
      );
    }
    setShowReminderConfirm(false);
  };

  const handleAddWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newWorkerName.trim()) {
      setFormError("Please enter worker name");
      return;
    }

    const newId = `worker-${Date.now()}`;
    const trimmedEmail = newWorkerEmail.trim();

    const createdWorker: Worker = {
      id: newId,
      name: newWorkerName,
      role: newWorkerRole,
      phone: newWorkerPhone.trim() || undefined,
      email: trimmedEmail || undefined,
      postcode: undefined,
      tickets: [],
      uploadedCertificates: [],
    };

    setSubmittingWorker(true);
    try {
      const { error: insertError } = await supabase
        .from("staff")
        .insert(workerToRow(createdWorker, profile?.tenant_id));
      if (insertError) {
        setFormError("Failed to save worker. Please try again.");
        return;
      }

      // Site roles (everything except the office roles) automatically get an
      // open-ended compliance request so they can self-upload every cert they hold.
      if (!OFFICE_ROLES.includes(newWorkerRole) && trimmedEmail) {
        try {
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 48);

          const { data: requestRow, error: requestError } = await supabase
            .from("document_requests")
            .insert({
              worker_id: newId,
              requested_certs: [],
              expires_at: expiresAt.toISOString(),
              tenant_id: profile?.tenant_id,
            })
            .select()
            .single();

          if (!requestError && requestRow) {
            const uploadUrl = `${window.location.origin}/#/submit-credentials?token=${requestRow.id}`;

            const { error: emailError } = await supabase.functions.invoke("send-compliance-email", {
              body: {
                toEmail: trimmedEmail,
                workerName: createdWorker.name,
                requestedCerts: [],
                uploadUrl,
                expiresAt: expiresAt.toISOString(),
              },
            });
            if (emailError) console.error("Failed to send compliance email:", emailError);

            const { error: auditError } = await supabase.rpc("log_anonymous_audit", {
              p_user_email: "admin@opusform.co.uk",
              p_action: "CREATE_DOCUMENT_REQUEST",
              p_target_type: "staff",
              p_target_id: newId,
              p_details: {
                request_id: requestRow.id,
                requested_certs: [],
                email_sent: !emailError,
              },
            });
            if (auditError) console.error("Failed to log audit:", auditError);
          } else if (requestError) {
            console.error("Failed to create document request:", requestError);
          }
        } catch (err) {
          console.error("Compliance request flow failed:", err);
        }
      }

      setWorkers((prev) => [createdWorker, ...prev]);
      setSelectedWorkerDetailsId(newId);

      // Reset form
      setNewWorkerName("");
      setNewWorkerPhone("");
      setNewWorkerEmail("");
      setShowAddWorkerForm(false);
    } finally {
      setSubmittingWorker(false);
    }
  };

  const filteredWorkersList = workers
    .filter((w) => {
      const query = searchQuery.toLowerCase();

      // Check if worker's scheduled jobs match the query
      const workerJobMatches = (shifts || [])
        .filter((s) => s.workerId === w.id)
        .some((s) => {
          const job = (jobs || []).find((j) => j.id === s.jobId);
          return job && job.siteName.toLowerCase().includes(query);
        });

      const matchesSearch =
        !query ||
        w.name.toLowerCase().includes(query) ||
        (w.phone || "").toLowerCase().includes(query) ||
        (w.email || "").toLowerCase().includes(query) ||
        workerJobMatches;

      const matchesMode = rosterMode === "active" ? !w.isArchived : w.isArchived;
      return matchesSearch && matchesMode;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedWorkerDetails = workers.find((w) => w.id === selectedWorkerDetailsId) || null;
  const anchorDate = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const renderMobileWorkerCard = (worker: Worker) => {
    const expiredCount =
      worker.tickets?.filter((t) => getTicketStatus(t) === "EXPIRED").length || 0;
    const expiringCount =
      worker.tickets?.filter((t) => getTicketStatus(t) === "EXPIRING_SOON").length || 0;
    const ticketCount = worker.tickets?.length || 0;

    let statusText = "ALL CLEAR";
    let badgeColorClasses =
      "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold";
    let avatarBorderColorClasses = "border-emerald-500/30 text-emerald-400 bg-emerald-500/5";
    if (expiredCount > 0) {
      statusText = `${expiredCount} EXPIRED`;
      badgeColorClasses = "bg-red-500/20 border border-red-500/30 text-red-400 font-bold";
      avatarBorderColorClasses = "border-red-500/30 text-red-400 bg-red-500/5";
    } else if (expiringCount > 0) {
      statusText = "EXPIRING";
      badgeColorClasses = "bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold";
      avatarBorderColorClasses = "border-amber-500/30 text-amber-400 bg-amber-500/5";
    }

    const nameParts = worker.name.split(" ");
    const initials =
      nameParts.length > 1 ? `${nameParts[0][0]}${nameParts[1][0]}` : `${nameParts[0][0] || ""}`;

    return (
      <div
        key={worker.id}
        onClick={() => setSelectedWorkerDetailsId(worker.id)}
        className="bg-card hover:bg-secondary border border-border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all duration-150"
      >
        <div className="flex items-center space-x-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-full border flex items-center justify-center font-semibold text-[12px] tracking-wide shrink-0 ${avatarBorderColorClasses}`}
          >
            {initials.toUpperCase()}
          </div>
          <div className="min-w-0">
            <h4 className="text-[14px] font-bold text-foreground tracking-wide truncate">
              {worker.name}
            </h4>
            <span className="text-[11px] text-zinc-400 font-medium block mt-0.5">
              {worker.role}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0 space-y-1">
          <span
            className={`px-2 py-0.5 rounded text-[9.5px] font-semibold tracking-wider uppercase ${badgeColorClasses}`}
          >
            {statusText}
          </span>
          <span className="text-[10px] text-zinc-500 font-medium tracking-wide">
            {ticketCount} {ticketCount === 1 ? "ticket" : "tickets"}
          </span>
        </div>
      </div>
    );
  };

  const renderEditForm = () => {
    if (!workerToEdit) return null;
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setEditError(null);
          if (!editName.trim()) {
            setEditError("Please enter worker name");
            return;
          }

          // Validate tickets if any
          for (const ticket of editTickets) {
            if (!ticket.type.trim()) {
              setEditError("Ticket Type cannot be empty");
              return;
            }
            if (!ticket.expiryDate) {
              setEditError("Expiry Date cannot be empty");
              return;
            }
          }

          const updatedWorker: Worker = {
            ...workerToEdit,
            name: editName.trim(),
            role: editRole,
            phone: editPhone.trim() || undefined,
            email: editEmail.trim() || undefined,
            postcode: workerToEdit.postcode,
            tickets: editTickets,
          };

          // Save to Supabase to trigger automatic audit log capturing
          supabase
            .from("staff")
            .update({
              name: updatedWorker.name,
              role: updatedWorker.role,
              phone: updatedWorker.phone,
              email: updatedWorker.email,
              postcode: updatedWorker.postcode,
              tickets: updatedWorker.tickets,
            })
            .eq("id", workerToEdit.id)
            .then(({ error }) => {
              if (error) {
                console.error("Failed to persist staff changes to Supabase:", error);
                // Trigger toast on DB failure
                toast.error("Failed to save staff changes", { description: "Please try again." });
              } else {
                // Update UI state and close modal only after successful persistence
                setWorkers((prev) =>
                  prev.map((w) => (w.id === workerToEdit.id ? updatedWorker : w)),
                );
                setWorkerToEdit(null);
                fetchLogsAndRequests();
              }
            });
        }}
        className="space-y-6"
      >
        {editError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 uppercase tracking-wider">
            {editError}
          </div>
        )}

        {/* Form Content Grid */}
        <div className="grid grid-cols-1 gap-6">
          {/* General Info */}
          <div className="flex flex-col">
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xl flex-1 flex flex-col h-full">
              <div className="p-5 pb-4 border-b border-white/5 bg-secondary flex items-center space-x-3 shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                  General Information
                </span>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-[11px] font-medium text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                      Role
                    </label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-[11px] font-medium text-foreground focus:outline-none focus:border-primary transition-colors uppercase font-bold"
                    >
                      {STAFF_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-[11px] font-medium text-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-[11px] font-medium text-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tickets Info */}
          <div className="flex flex-col">
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xl flex-1 flex flex-col h-full">
              <div className="p-5 pb-4 border-b border-white/5 bg-secondary flex items-center space-x-3 shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                  Tickets & Certifications
                </span>
              </div>
              <div className="p-5 space-y-3">
                {editTickets.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className="grid grid-cols-12 gap-2 bg-secondary p-2 rounded-xl border border-border"
                  >
                    <div className="col-span-5">
                      <input
                        type="text"
                        value={ticket.type}
                        onChange={(e) => {
                          const newTickets = [...editTickets];
                          newTickets[index].type = e.target.value;
                          setEditTickets(newTickets);
                        }}
                        className="w-full bg-transparent border-none text-[10px] font-bold text-foreground uppercase px-1 py-1 focus:ring-0"
                        placeholder="Ticket Type"
                      />
                    </div>
                    <div className="col-span-5">
                      <input
                        type="date"
                        value={ticket.expiryDate}
                        onChange={(e) => {
                          const newTickets = [...editTickets];
                          newTickets[index].expiryDate = e.target.value;
                          setEditTickets(newTickets);
                        }}
                        className="w-full bg-transparent border-none text-[10px] text-muted-foreground px-1 py-1 focus:ring-0"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditTickets(editTickets.filter((_, i) => i !== index))}
                      className="col-span-2 text-red-500 hover:text-red-400 flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setEditTickets([
                      ...editTickets,
                      { id: `new-${Date.now()}`, type: "", expiryDate: "", ticketNumber: "" },
                    ])
                  }
                  className="w-full py-2 border border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                >
                  + Add New Ticket
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => setWorkerToEdit(null)}
            className="w-full sm:flex-1 py-3.5 border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all rounded-xl text-[11px] font-bold uppercase tracking-wider"
          >
            Discard Changes
          </button>
          <button
            type="submit"
            className="w-full sm:flex-1 py-3.5 bg-primary hover:bg-primary text-white transition-all rounded-xl text-[11px] font-bold uppercase tracking-wider shadow-lg shadow-primary/20"
          >
            Save & Apply
          </button>
        </div>
      </form>
    );
  };

  const renderDetailsDossier = () => {
    if (!selectedWorkerDetails) return null;
    const isShiftHistory = (shift: any) => {
      const job = (jobs || []).find((j) => j.id === shift.jobId);
      const isJobCompleted = job?.status === "completed";

      const shiftDate = new Date(shift.date);
      shiftDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return shiftDate < today || isJobCompleted;
    };

    const activeWorkerShifts = (shifts || []).filter(
      (s) => s.workerId === selectedWorkerDetails.id && !isShiftHistory(s),
    );
    const historyWorkerShifts = (shifts || []).filter(
      (s) => s.workerId === selectedWorkerDetails.id && isShiftHistory(s),
    );

    const groupShifts = (shiftsList: any[]) => {
      const grouped = shiftsList.reduce(
        (acc, shift) => {
          if (!acc[shift.jobId]) {
            acc[shift.jobId] = [];
          }
          acc[shift.jobId].push(shift.date);
          return acc;
        },
        {} as Record<string, string[]>,
      );

      Object.keys(grouped).forEach((jobId) => {
        grouped[jobId].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      });

      return grouped;
    };

    const groupedShifts = groupShifts(activeWorkerShifts);
    const groupedHistoryShifts = groupShifts(historyWorkerShifts);

    const formatDateRange = (dates: string[]) => {
      if (dates.length === 0) return "No dates scheduled";
      if (dates.length === 1) return getDayName(dates[0]);

      const start = dates[0];
      const end = dates[dates.length - 1];
      return `${getDayName(start)} - ${getDayName(end)}`;
    };

    const getDayName = (dateStr: string) => {
      try {
        const parts = dateStr.split("-");
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const date = new Date(Date.UTC(year, month, day));

          const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];
          const dayIndex = date.getUTCDay();
          return `${dayNames[dayIndex]}, ${monthNames[month]} ${day}`;
        }
        return dateStr;
      } catch {
        return dateStr;
      }
    };

    // Prepare events feed for Audit Log tab
    const requestEvents = dossierDocRequests.map((r) => {
      const isExpired = new Date(r.expires_at) < new Date();
      const isCompleted = !!r.completed_at;
      let status = "pending";
      if (isCompleted) status = "completed";
      else if (isExpired) status = "expired";

      // If the request was resent, expires_at is renewed to now + 48 hours.
      // So effective date of the action is expires_at - 48 hours.
      const effectiveDate = new Date(new Date(r.expires_at).getTime() - 48 * 60 * 60 * 1000);
      const isResent = effectiveDate.getTime() > new Date(r.created_at).getTime();
      const actionDate = isResent ? effectiveDate.toISOString() : r.created_at;

      return {
        id: `req-${r.id}`,
        rawId: r.id,
        type: "request",
        action: "CREATE_DOCUMENT_REQUEST",
        created_at: actionDate,
        actor: "admin@opusform.co.uk",
        details: {
          requested_certs: r.requested_certs,
          expires_at: r.expires_at,
          completed_at: r.completed_at,
          status,
          uploadUrl: `${window.location.origin}/#/submit-credentials?token=${r.id}`,
        },
        rawRecord: r,
      };
    });

    const auditEvents = dossierAuditLogs
      .map((l) => ({
        id: `audit-${l.id}`,
        rawId: l.id,
        type: "audit",
        action: l.action,
        created_at: l.created_at,
        actor: l.user_email || "System / Operative",
        details: l.details,
        rawRecord: l,
      }))
      .filter((event) => {
        if (event.action === "CREATE_DOCUMENT_REQUEST") {
          return false;
        }
        if (event.action === "UPDATE") {
          const diff = event.details?.old ? computeDiff(event.details.old, event.details.new) : [];
          return diff.length > 0;
        }
        return true;
      });

    const allEvents = [...requestEvents, ...auditEvents].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const ITEMS_PER_PAGE = 10;
    const totalPages = Math.ceil(allEvents.length / ITEMS_PER_PAGE) || 1;
    const startIndex = (auditLogPage - 1) * ITEMS_PER_PAGE;
    const paginatedEvents = allEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        {/* Tab Buttons */}
        <div className="flex border-b border-zinc-800 pb-0 gap-6 mb-4">
          <button
            type="button"
            onClick={() => setActiveDossierTab("general")}
            className={`pb-3 text-[11px] font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeDossierTab === "general"
                ? "border-brand-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Compliance
          </button>
          <button
            type="button"
            onClick={() => setActiveDossierTab("assignments")}
            className={`pb-3 text-[11px] font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeDossierTab === "assignments"
                ? "border-brand-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Site Assignments
          </button>
          <button
            type="button"
            onClick={() => setActiveDossierTab("audit_log")}
            className={`pb-3 text-[11px] font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeDossierTab === "audit_log"
                ? "border-brand-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Audit Log
          </button>
        </div>

        {/* Tab 1: Compliance */}
        {activeDossierTab === "general" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {selectedWorkerDetails.tickets.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-xl text-neutral-500 text-[11px] font-bold uppercase tracking-wider">
                No compliance certificates or tickets registered
              </div>
            ) : (
              selectedWorkerDetails.tickets.map((ticket) => {
                const status = getTicketStatus(ticket);
                const isPending = ticket.verified === false;
                const expiryDate = new Date(ticket.expiryDate);
                const isExpired = status === "EXPIRED";
                const isExpiringSoon = status === "EXPIRING_SOON";

                let cardBg = "bg-[#0e1612] border-[#1b2b22] hover:bg-[#121c17]";
                let iconBox = "border-[#1b2b22] bg-[#121c17] text-[#2ecc71]";
                let badgeClass = "bg-[#1b2b22] border-[#223d2e] text-[#2ecc71]";
                let statusText = "ACTIVE";
                let LeftIcon = CheckCircle2;

                if (isExpired) {
                  cardBg = "bg-[#1a0e0e] border-[#381c1c] hover:bg-[#201212]";
                  iconBox = "border-[#381c1c] bg-[#201212] text-[#e74c3c]";
                  badgeClass = "bg-[#381c1c] border-[#552727] text-[#e74c3c]";
                  statusText = "EXPIRED";
                  LeftIcon = ShieldAlert;
                } else if (isPending) {
                  cardBg = "bg-[#18140e] border-[#2d2215] hover:bg-[#1e1912]";
                  iconBox = "border-[#2d2d33] bg-[#1e1912] text-[#f1c40f]";
                  badgeClass = "bg-[#2d2d33] border-[#3e301d] text-[#f1c40f]";
                  statusText = "PENDING APPROVAL";
                  LeftIcon = Clock;
                } else if (isExpiringSoon) {
                  cardBg = "bg-[#1c160e] border-[#382a17] hover:bg-[#221c12]";
                  iconBox = "border-[#382a17] bg-[#221c12] text-[#e67e22]";
                  badgeClass = "bg-[#382a17] border-[#503d22] text-[#e67e22]";
                  LeftIcon = Clock;

                  const anchorDate = new Date();
                  anchorDate.setHours(0, 0, 0, 0);
                  const diffTime = expiryDate.getTime() - anchorDate.getTime();
                  const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
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
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border gap-3 ${cardBg} transition-all duration-150`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${iconBox}`}
                      >
                        <LeftIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-bold text-white tracking-wide">
                            {ticket.type}
                          </h4>
                          <span
                            className={`px-2 py-0.5 text-[9.5px] font-semibold rounded-xl uppercase tracking-wider border ${badgeClass}`}
                          >
                            {statusText}
                          </span>
                        </div>
                        <p className="text-[10px] font-medium text-neutral-500 mt-1">
                          Ref: {ticket.ticketNumber || "N/A"} &bull;{" "}
                          {isExpired ? "Expired" : "Expires"}: {formattedDate}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:justify-end">
                      {isExpired ? (
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => setShowReminderConfirm(true)}
                            className="w-full sm:w-auto px-3.5 py-1.5 bg-red-950/20 border border-red-900/30 hover:bg-red-950/40 text-red-400 rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                          >
                            Request Update
                          </button>
                          {role === "admin" && (
                            <button
                              type="button"
                              onClick={() => setTicketToRemove(ticket)}
                              className="w-full sm:w-auto px-3.5 py-1.5 border border-zinc-800 hover:bg-zinc-800 text-neutral-400 hover:text-red-400 rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() =>
                              ticket.documentUrl
                                ? handleViewDocument(ticket.documentUrl)
                                : toast("No document attached")
                            }
                            className="w-full sm:w-auto px-3.5 py-1.5 border border-zinc-800 hover:bg-zinc-800 text-white rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                          >
                            View File
                          </button>
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  verifyTicket(selectedWorkerDetails.id, ticket.id, true)
                                }
                                className="w-full sm:w-auto px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  verifyTicket(selectedWorkerDetails.id, ticket.id, false)
                                }
                                className="w-full sm:w-auto px-3.5 py-1.5 bg-[#4a1a1a] hover:bg-[#6b2121] text-[#ef4444] border border-[#6b2121] rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {!isPending && role === "admin" && (
                            <button
                              type="button"
                              onClick={() => setTicketToRemove(ticket)}
                              className="w-full sm:w-auto px-3.5 py-1.5 border border-zinc-800 hover:bg-zinc-800 text-neutral-400 hover:text-red-400 rounded-xl text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
        {/* Tab 2: Site Assignments */}
        {activeDossierTab === "assignments" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Active Deployments */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                <Calendar className="h-4 w-4 text-[#facc15]" />
                <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
                  Active Site Deployments
                </h3>
              </div>
              {Object.keys(groupedShifts).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(groupedShifts).map(([jobId, shiftDates]) => {
                    const job = (jobs || []).find((j) => j.id === jobId);
                    if (!job) return null;
                    return (
                      <div
                        key={jobId}
                        className="p-3.5 rounded-xl border border-border bg-card/60 hover:bg-secondary hover:border-zinc-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-foreground tracking-wide flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-[#facc15]" />
                            {job.siteName}
                          </h4>
                          <p className="text-[10px] font-medium text-gray-500 leading-none mt-0.5">
                            Contractor: {job.mainContractor} &bull; Ref: {job.jobRef} &bull;
                            Postcode: {job.postcode || "N/A"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(shiftDates as string[]).map((dateStr) => (
                            <span
                              key={dateStr}
                              className="px-2 py-0.5 rounded-xl bg-secondary border border-border text-[10px] font-semibold text-zinc-300 tracking-wide"
                            >
                              {getDayName(dateStr)}
                            </span>
                          ))}
                          <span
                            className={`px-2 py-0.5 rounded-xl text-[9px] font-semibold tracking-wider uppercase border ${
                              job.status === "active" || job.status === "in-progress"
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : "bg-secondary border-border text-muted-foreground"
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider py-2">
                  No active site assignments found
                </p>
              )}
            </div>

            {/* Deployment History */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                <Clock className="h-4 w-4 text-zinc-400" />
                <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
                  Deployment History
                </h3>
              </div>
              {Object.keys(groupedHistoryShifts).length > 0 ? (
                <div className="space-y-2">
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {(showAllHistory
                      ? Object.entries(groupedHistoryShifts)
                      : Object.entries(groupedHistoryShifts).slice(0, 5)
                    ).map(([jobId, shiftDates]) => {
                      const job = (jobs || []).find((j) => j.id === jobId);
                      if (!job) return null;
                      return (
                        <div
                          key={jobId}
                          className="p-3.5 rounded-xl border border-border bg-card/40 hover:bg-card/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-zinc-400 tracking-wide flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-zinc-600" />
                              {job.siteName}
                            </h4>
                            <p className="text-[10px] font-medium text-zinc-600 leading-none mt-0.5">
                              Contractor: {job.mainContractor} &bull; Ref: {job.jobRef}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(shiftDates as string[]).map((dateStr) => (
                              <span
                                key={dateStr}
                                className="px-2 py-0.5 rounded-xl bg-secondary border border-zinc-900 text-[10px] font-semibold text-zinc-500 tracking-wide"
                              >
                                {getDayName(dateStr)}
                              </span>
                            ))}
                            <span className="px-2 py-0.5 rounded-xl text-[9px] font-semibold tracking-wider border border-zinc-900 text-zinc-600 uppercase">
                              Completed
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {Object.keys(groupedHistoryShifts).length > 5 && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAllHistory(!showAllHistory)}
                        className="text-[10px] font-bold text-[#facc15] hover:text-[#eab308] uppercase tracking-wider px-3.5 py-2 rounded-xl bg-card border border-border transition-all hover:bg-secondary active:scale-95"
                      >
                        {showAllHistory
                          ? "Show Less History"
                          : `View All History (${Object.keys(groupedHistoryShifts).length} total)`}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider py-2">
                  No completed or archived shifts found
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Audit & Requests Log */}
        {activeDossierTab === "audit_log" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {loadingDossierLogs && allEvents.length === 0 ? (
              <div className="text-center py-12 border border-border bg-card rounded-xl">
                <RefreshCw className="w-8 h-8 text-[#facc15]/60 animate-spin mx-auto mb-3" />
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Loading history log...
                </p>
              </div>
            ) : allEvents.length > 0 ? (
              <div className="divide-y divide-border px-1">
                {paginatedEvents.map((event) => {
                  const date = new Date(event.created_at).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const isExpanded = expandedEventId === event.id;

                  // Colored severity bullets matching Audit Trail
                  let bulletColor = "bg-primary";
                  let logTitle = "System Event";

                  if (event.type === "request") {
                    const status = event.details?.status;
                    if (status === "completed") {
                      bulletColor = "bg-success";
                    } else if (status === "expired") {
                      bulletColor = "bg-destructive";
                    } else {
                      bulletColor = "bg-warning"; // pending
                    }
                    logTitle = "Document Request Sent";
                  } else {
                    const action = event.action;
                    if (action === "APPROVE_DOCUMENT" || action === "SUBMIT_DOCUMENTS") {
                      bulletColor = "bg-success";
                    } else if (action === "REJECT_DOCUMENT") {
                      bulletColor = "bg-destructive";
                    } else if (action === "CREATE" || action === "UPDATE") {
                      bulletColor = "bg-primary";
                    } else {
                      bulletColor = "bg-warning";
                    }

                    if (action === "APPROVE_DOCUMENT") {
                      logTitle = "Compliance Document Approved";
                    } else if (action === "REJECT_DOCUMENT") {
                      logTitle = "Compliance Document Rejected/Purged";
                    } else if (action === "SUBMIT_DOCUMENTS") {
                      logTitle = "Operative Documents Uploaded";
                    } else if (action === "RESEND_DOCUMENT_REQUEST") {
                      logTitle = "Document Request Link Resent";
                    } else if (action === "CREATE" || action === "UPDATE") {
                      logTitle = "Staff Profile Change";
                    } else if (action === "INSPECT") {
                      logTitle = "Staff Dossier Inspected";
                    } else {
                      logTitle = "System Action Logged";
                    }
                  }

                  // Compute diff & summaries beforehand for the expanded panel
                  let summaryText = "";
                  let diff: any[] = [];
                  let badgeColor = "bg-zinc-900/40 border-zinc-800 text-zinc-500";

                  if (event.type !== "request") {
                    const action = event.action;
                    if (action === "APPROVE_DOCUMENT") {
                      badgeColor = "bg-emerald-950/20 border-emerald-900/30 text-emerald-400";
                      summaryText = `${event.details?.ticket_type || "Certificate"} (Ref: ${event.details?.ticket_number || "N/A"})`;
                    } else if (action === "REJECT_DOCUMENT") {
                      badgeColor = "bg-red-950/20 border-red-900/30 text-red-400";
                      summaryText = `${event.details?.ticket_type || "Certificate"} (Ref: ${event.details?.ticket_number || "N/A"})`;
                    } else if (action === "SUBMIT_DOCUMENTS") {
                      badgeColor = "bg-emerald-950/20 border-emerald-900/30 text-emerald-400";
                      const submittedCerts = event.details?.tickets_submitted || [];
                      summaryText = `Submitted: ${submittedCerts.map((c: any) => c.type).join(", ")}`;
                    } else if (action === "RESEND_DOCUMENT_REQUEST") {
                      badgeColor = "bg-brand-accent/5 border-brand-accent/20 text-brand-accent";
                      summaryText = "Document request email renewed and dispatched to operative.";
                    } else if (action === "CREATE" || action === "UPDATE") {
                      badgeColor = "bg-zinc-900/40 border-zinc-800 text-zinc-400";
                      if (action === "CREATE") {
                        summaryText = "Initial database record created for staff member";
                      } else {
                        summaryText = "Administrative updates applied to database record";
                        diff = event.details?.old
                          ? computeDiff(event.details.old, event.details.new)
                          : [];
                      }
                    } else if (action === "INSPECT") {
                      badgeColor = "bg-purple-950/20 border-purple-900/30 text-purple-400";
                      summaryText = "Staff dossier profile viewed by administrator";
                    } else {
                      summaryText =
                        typeof event.details === "string"
                          ? event.details
                          : JSON.stringify(event.details || {});
                    }
                  }

                  return (
                    <div key={event.id} className="py-3.5 transition-all">
                      <div
                        onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                        className="flex gap-4 cursor-pointer hover:bg-white/[0.02] px-2.5 py-2.5 rounded-xl transition-all"
                      >
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${bulletColor} mt-1.5 shrink-0`}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13px] font-semibold text-foreground uppercase tracking-wider leading-tight">
                            {logTitle}
                          </h4>
                          <p className="text-[11px] text-zinc-500 mt-1.5 uppercase tracking-wide">
                            {event.actor} · {date}
                          </p>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="pl-[26px] pr-2.5 pt-2 pb-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                          {event.type === "request" ? (
                            <div className="space-y-3 bg-card/60 border border-zinc-800 rounded-xl p-3.5 mt-1">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`px-2 py-0.5 text-[8.5px] font-black uppercase rounded border tracking-widest ${
                                    event.details?.status === "completed"
                                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                      : event.details?.status === "expired"
                                        ? "bg-red-500/10 border-red-500/30 text-red-400"
                                        : "bg-[#2c2100] border-[#facc15]/20 text-[#ffd666]"
                                  }`}
                                >
                                  Status: {event.details?.status}
                                </span>
                                <div
                                  className={`flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wider ${
                                    event.details?.status === "completed"
                                      ? "text-emerald-400"
                                      : event.details?.status === "expired"
                                        ? "text-red-400"
                                        : "text-[#ffd666]"
                                  }`}
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>
                                    {event.details?.status === "pending"
                                      ? `Expires: ${new Date(event.details?.expires_at).toLocaleString("en-GB")}`
                                      : event.details?.status === "completed"
                                        ? `Completed: ${new Date(event.details?.completed_at).toLocaleString("en-GB")}`
                                        : "Link Expired"}
                                  </span>
                                </div>
                              </div>

                              <div>
                                <h5 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">
                                  Requested Certifications
                                </h5>
                                <div className="flex flex-wrap gap-1.5">
                                  {(event.details?.requested_certs || []).map((c: string) => (
                                    <span
                                      key={c}
                                      className="px-2.5 py-1 bg-secondary text-[9.5px] font-semibold text-zinc-300 rounded border border-border"
                                    >
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {event.details?.status === "pending" && (
                                <div className="flex gap-2 pt-2 border-t border-zinc-800">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopyLink(event.details?.uploadUrl, event.id)
                                    }
                                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded text-[9px] font-bold uppercase border border-border cursor-pointer text-foreground"
                                  >
                                    {copiedRequestId === event.id ? (
                                      <>
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                        <span>Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3.5 w-3.5 text-zinc-500" />
                                        <span>Copy Link</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleResendRequest(event.rawRecord)}
                                    disabled={resendingRequestMap[event.rawRecord.id]}
                                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded text-[9px] font-bold uppercase border border-border disabled:opacity-50 cursor-pointer text-foreground"
                                  >
                                    {resendingRequestMap[event.rawRecord.id] ? (
                                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <RefreshCw className="h-3.5 w-3.5 text-zinc-500" />
                                    )}
                                    <span>Resend Email</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3 bg-card/60 border border-zinc-800 rounded-xl p-3.5 mt-1">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-widest border ${badgeColor}`}
                                >
                                  Action: {event.action}
                                </span>
                                {event.action === "UPDATE" && diff.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRevertConfirmTarget({
                                        oldDetails: event.details?.old,
                                        currentDetails: {
                                          name: selectedWorkerDetails?.name,
                                          role: selectedWorkerDetails?.role,
                                          phone: selectedWorkerDetails?.phone,
                                          email: selectedWorkerDetails?.email,
                                          postcode: selectedWorkerDetails?.postcode,
                                        },
                                        workerId:
                                          event.rawRecord?.target_id ||
                                          selectedWorkerDetailsId ||
                                          "",
                                      })
                                    }
                                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-[#facc15]/10 text-zinc-300 hover:text-[#facc15] border border-zinc-700 hover:border-[#facc15]/30 text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                                  >
                                    Revert Changes
                                  </button>
                                )}
                              </div>

                              <div className="space-y-2">
                                {event.action === "RESEND_DOCUMENT_REQUEST" &&
                                event.details?.requested_certs ? (
                                  <div className="space-y-2">
                                    <p className="text-[10.5px] font-bold text-zinc-400 font-sans leading-relaxed">
                                      {summaryText}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {event.details.requested_certs.map((c: string) => (
                                        <span
                                          key={c}
                                          className="px-2.5 py-1 bg-secondary text-[9.5px] font-semibold text-zinc-300 rounded border border-border whitespace-nowrap"
                                        >
                                          {c}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ) : diff.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <AuditDiffTable diff={diff} />
                                  </div>
                                ) : summaryText ? (
                                  <p className="text-[10.5px] font-bold text-zinc-400 font-sans leading-relaxed">
                                    {summaryText}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-900">
                    <button
                      type="button"
                      onClick={() => setAuditLogPage((prev) => Math.max(1, prev - 1))}
                      disabled={auditLogPage === 1}
                      className="px-3.5 py-1.5 bg-card/60 border border-border text-[10px] font-bold uppercase tracking-wider rounded-lg text-zinc-400 hover:text-foreground transition-all disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      Page {auditLogPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAuditLogPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={auditLogPage === totalPages}
                      className="px-3.5 py-1.5 bg-card/60 border border-border text-[10px] font-bold uppercase tracking-wider rounded-lg text-zinc-400 hover:text-foreground transition-all disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/10">
                <FileText className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  No audit or request events logged
                </p>
              </div>
            )}
          </div>
        )}

        {/* Request Compliance Update Modal */}
        {selectedWorkerDetails && (
          <RequestCredentialsModal
            isOpen={showReminderConfirm}
            onClose={() => setShowReminderConfirm(false)}
            worker={selectedWorkerDetails}
          />
        )}

        {/* Archive Confirmation Modal */}
        <ConfirmDialog
          open={!!selectedWorkerToDelete}
          onOpenChange={(open) => {
            if (!open) setSelectedWorkerToDelete(null);
          }}
          tone="destructive"
          title="Archive Staff Profile"
          message={
            selectedWorkerToDelete && (
              <>
                Are you sure you want to archive the profile of{" "}
                <span className="font-bold text-foreground">{selectedWorkerToDelete.name}</span> (
                {selectedWorkerToDelete.role})?
                <br />
                <br />
                This worker will be soft-deleted and removed from the active roster and shift
                planner. However, their historic deployments and records will be preserved.
              </>
            )
          }
          confirmLabel="Archive Profile"
          onConfirm={async () => {
            if (!selectedWorkerToDelete) return;
            const targetId = selectedWorkerToDelete.id;
            try {
              const { error } = await supabase
                .from("staff")
                .update({ is_archived: true })
                .eq("id", targetId);
              if (error) throw error;

              setWorkers((prev) =>
                prev.map((w) => (w.id === targetId ? { ...w, isArchived: true } : w)),
              );
              setSelectedWorkerDetailsId(null);
              setSelectedWorkerToDelete(null);
            } catch (err: any) {
              console.error("Failed to archive staff profile:", err);
              toast.error("Failed to archive profile", { description: err.message });
            }
          }}
        />

        {/* Remove Compliance Ticket Confirmation Modal */}
        <ConfirmDialog
          open={!!ticketToRemove}
          onOpenChange={(open) => {
            if (!open) setTicketToRemove(null);
          }}
          tone="destructive"
          title="Remove Compliance Record"
          message={
            ticketToRemove &&
            selectedWorkerDetails && (
              <>
                Are you sure you want to remove{" "}
                <span className="font-bold text-foreground">{ticketToRemove.type}</span> from{" "}
                <span className="font-bold text-foreground">{selectedWorkerDetails.name}</span>'s
                compliance record?
                <br />
                <br />
                This permanently deletes the ticket entry. This cannot be undone from here — the
                worker will need to re-upload the document if it's still required.
              </>
            )
          }
          confirmLabel="Remove Record"
          onConfirm={async () => {
            if (!ticketToRemove || !selectedWorkerDetails) return;
            await removeTicket(selectedWorkerDetails.id, ticketToRemove);
            setTicketToRemove(null);
          }}
        />

        {/* Revert Changes Confirmation Modal */}
        <ConfirmDialog
          open={!!revertConfirmTarget}
          onOpenChange={(open) => {
            if (!open) setRevertConfirmTarget(null);
          }}
          tone="neutral"
          title="Revert Profile Changes"
          message={
            revertConfirmTarget && (
              <>
                The following values will be restored to the staff profile:
                <div className="bg-muted/40 border border-border rounded-lg divide-y divide-border text-[12px] mt-3">
                  {(() => {
                    const { oldDetails: old, currentDetails: cur } = revertConfirmTarget;
                    const fields: { key: keyof typeof old; label: string }[] = [
                      { key: "name", label: "Name" },
                      { key: "role", label: "Role" },
                      { key: "phone", label: "Phone" },
                      { key: "email", label: "Email" },
                      { key: "postcode", label: "Postcode" },
                    ];
                    return fields
                      .filter((f) => old?.[f.key])
                      .map((f) => {
                        const oldVal = old?.[f.key];
                        const curVal = cur?.[f.key];
                        const changed = oldVal !== curVal;
                        return (
                          <div
                            key={f.key}
                            className={`flex items-center justify-between px-4 py-2.5 ${
                              changed ? "bg-amber-500/5 border-l-2 border-amber-500/40" : ""
                            }`}
                          >
                            <span
                              className={`font-semibold uppercase tracking-wider text-[10px] ${
                                changed ? "text-amber-400/70" : "text-muted-foreground"
                              }`}
                            >
                              {f.label}
                            </span>
                            <div className="flex items-center gap-2 text-right">
                              {changed && curVal && (
                                <span className="line-through text-muted-foreground text-[11px]">
                                  {curVal}
                                </span>
                              )}
                              {changed && curVal && (
                                <span className="text-muted-foreground text-[10px]">→</span>
                              )}
                              <span
                                className={`font-bold ${
                                  changed ? "text-amber-300" : "text-foreground"
                                }`}
                              >
                                {oldVal}
                              </span>
                            </div>
                          </div>
                        );
                      });
                  })()}
                </div>
              </>
            )
          }
          confirmLabel="Revert Profile"
          onConfirm={() => {
            if (!revertConfirmTarget) return;
            executeRevertUpdate(revertConfirmTarget.oldDetails, revertConfirmTarget.workerId);
          }}
        />

        {/* Permanent Delete Confirmation Modal */}
        <ConfirmDialog
          open={!!selectedWorkerToPermanentDelete}
          onOpenChange={(open) => {
            if (!open) setSelectedWorkerToPermanentDelete(null);
          }}
          tone="destructive"
          title="Delete Staff Member"
          message={
            selectedWorkerToPermanentDelete && (
              <>
                Are you absolutely sure you want to permanently delete{" "}
                <span className="font-bold text-foreground">
                  {selectedWorkerToPermanentDelete.name}
                </span>
                ?
                <br />
                <br />
                WARNING: This action is irreversible. All records, compliance certificates, and
                schedules associated with this staff member will be permanently purged from the
                database.
              </>
            )
          }
          confirmLabel="Purge Record"
          onConfirm={async () => {
            if (!selectedWorkerToPermanentDelete) return;
            const targetId = selectedWorkerToPermanentDelete.id;
            try {
              const { error } = await supabase.from("staff").delete().eq("id", targetId);
              if (error) throw error;

              setWorkers((prev) => prev.filter((w) => w.id !== targetId));
              setSelectedWorkerDetailsId(null);
              setSelectedWorkerToPermanentDelete(null);
            } catch (err: any) {
              console.error("Failed to permanently delete staff member:", err);
              toast.error("Failed to delete staff member", { description: err.message });
            }
          }}
        />

        {/* Restore Confirmation Modal */}
        <ConfirmDialog
          open={!!selectedWorkerToRestore}
          onOpenChange={(open) => {
            if (!open) setSelectedWorkerToRestore(null);
          }}
          tone="neutral"
          title="Restore Staff Member"
          message={
            selectedWorkerToRestore && (
              <>
                Are you sure you want to restore{" "}
                <span className="font-bold text-foreground">{selectedWorkerToRestore.name}</span> to
                the active staff roster?
                <br />
                <br />
                This staff member will be returned to the active staff roster and made available for
                site assignments.
              </>
            )
          }
          confirmLabel="Restore Record"
          onConfirm={() => {
            if (!selectedWorkerToRestore) return;
            setWorkers((prev) =>
              prev.map((w) =>
                w.id === selectedWorkerToRestore.id ? { ...w, isArchived: false } : w,
              ),
            );
            setSelectedWorkerToRestore(null);
          }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {selectedWorkerDetails ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Navigation Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 mb-2">
            <button
              type="button"
              onClick={() => {
                setSelectedWorkerDetailsId(null);
                setWorkerToEdit(null);
              }}
              className="flex items-center gap-2 text-zinc-400 hover:text-foreground transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer self-start"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-400" />
              <span>Back to Staff</span>
            </button>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-start sm:justify-end">
              {!workerToEdit ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setWorkerToEdit(selectedWorkerDetails);
                      setEditName(selectedWorkerDetails.name);
                      setEditRole(selectedWorkerDetails.role);
                      setEditPhone(selectedWorkerDetails.phone || "");
                      setEditEmail(selectedWorkerDetails.email || "");
                      setEditTickets([...selectedWorkerDetails.tickets]);
                      setEditError(null);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 border border-zinc-800 hover:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-300 uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Edit className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReminderConfirm(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border border-primary whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Request Docs</span>
                  </button>
                  {selectedWorkerDetails.isArchived ? (
                    <button
                      type="button"
                      onClick={() => setSelectedWorkerToRestore(selectedWorkerDetails)}
                      className="px-3.5 py-2 bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-900/30 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedWorkerToDelete(selectedWorkerDetails)}
                      className="px-3 py-2 bg-red-950/30 hover:bg-red-950/60 border border-red-900/30 text-red-400 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap"
                    >
                      Archive
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setWorkerToEdit(null)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Back to Dossier
                </button>
              )}
            </div>
          </div>

          {workerToEdit ? (
            <div className="bg-card border border-border rounded-xl p-6 shadow-2xl">
              {renderEditForm()}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-zinc-900 pb-5">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-full border border-[#1B4D3E] bg-[#0E2E25] flex items-center justify-center font-bold text-xs text-[#2ECC71] shrink-0 uppercase tracking-wider font-archivo">
                    {(() => {
                      const nameParts = selectedWorkerDetails.name.split(" ");
                      return nameParts.length > 1
                        ? `${nameParts[0][0]}${nameParts[1][0]}`
                        : `${nameParts[0][0] || ""}`;
                    })().toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-foreground tracking-wide leading-tight">
                      {selectedWorkerDetails.name}
                    </h2>
                    <p className="text-[11px] font-medium text-zinc-400 mt-0.5 tracking-wide">
                      {selectedWorkerDetails.role}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 md:gap-6 shrink-0">
                  {selectedWorkerDetails.phone && (
                    <div className="flex flex-col md:items-end">
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                        Phone
                      </span>
                      <a
                        href={`tel:${selectedWorkerDetails.phone}`}
                        className="text-xs font-medium text-primary hover:underline mt-0.5 tracking-wide font-mono"
                      >
                        {selectedWorkerDetails.phone}
                      </a>
                    </div>
                  )}
                  {selectedWorkerDetails.phone && selectedWorkerDetails.email && (
                    <div className="hidden md:block w-px h-6 bg-zinc-800" />
                  )}
                  {selectedWorkerDetails.email && (
                    <div className="flex flex-col md:items-end">
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                        Email
                      </span>
                      <a
                        href={`mailto:${selectedWorkerDetails.email}`}
                        className="text-xs font-medium text-primary hover:underline mt-0.5"
                      >
                        {selectedWorkerDetails.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Tab Content */}
              <div>{renderDetailsDossier()}</div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Search & Actions Header */}
          <div className="flex items-center justify-between gap-3 mb-4 w-full">
            <div className="flex-1 max-w-xl relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by name, role, site..."
                className="w-full bg-background border border-border text-xs text-foreground rounded-xl pl-11 pr-4 py-2.5 focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground shadow-inner font-medium tracking-wide"
              />
            </div>
            <button
              onClick={() => setShowAddWorkerForm(!showAddWorkerForm)}
              className="p-2.5 md:px-4 md:py-2.5 bg-primary hover:bg-primary text-primary-foreground rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-[11.5px] font-semibold tracking-wider whitespace-nowrap cursor-pointer shrink-0"
            >
              {showAddWorkerForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span className="hidden md:inline">
                {showAddWorkerForm ? "Cancel Registration" : "Register Staff"}
              </span>
            </button>
          </div>

          {/* Active vs Archived Selector */}
          <div className="flex items-center gap-3.5 mb-5 mt-2">
            <button
              type="button"
              onClick={() => setRosterMode("active")}
              className={`px-4 py-2 rounded-xl text-[12px] font-semibold tracking-wide transition-all duration-150 border cursor-pointer ${
                rosterMode === "active"
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-card/60 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setRosterMode("archived")}
              className={`px-4 py-2 rounded-xl text-[12px] font-semibold tracking-wide transition-all duration-150 border cursor-pointer ${
                rosterMode === "archived"
                  ? "bg-amber-600 border-amber-600 text-white"
                  : "bg-card/60 border-border text-muted-foreground hover:text-amber-500"
              }`}
            >
              Archived
            </button>
          </div>

          {/* Add Worker Modal */}
          {showAddWorkerForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setShowAddWorkerForm(false)}
              />
              <form
                onSubmit={handleAddWorkerSubmit}
                className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground">
                    <UserPlus className="w-4 h-4 text-primary" />
                    Register Staff
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddWorkerForm(false)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-3.5">
                  {formError && (
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {formError}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={newWorkerName}
                      onChange={(e) => setNewWorkerName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-secondary border border-border rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={newWorkerEmail}
                      onChange={(e) => setNewWorkerEmail(e.target.value)}
                      placeholder="e.g. john.doe@opusform.co.uk"
                      className="w-full bg-secondary border border-border rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={newWorkerPhone}
                      onChange={(e) => setNewWorkerPhone(e.target.value)}
                      placeholder="e.g. 07700900123"
                      className="w-full bg-secondary border border-border rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Role
                    </label>
                    <select
                      value={newWorkerRole}
                      onChange={(e) => setNewWorkerRole(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-lg px-3.5 py-2 text-[11px] font-bold tracking-widest text-foreground uppercase outline-none focus:border-primary transition-colors appearance-none"
                    >
                      {STAFF_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!OFFICE_ROLES.includes(newWorkerRole) && (
                    <div className="flex items-start gap-1.5 text-[9px] font-bold uppercase tracking-widest text-primary/90 pt-0.5">
                      <UploadCloud className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {newWorkerEmail.trim()
                          ? "An automated email will be sent so this worker can upload their own on-site certifications."
                          : "Add an email address to automatically request this worker's on-site certifications."}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddWorkerForm(false)}
                      className="px-5 py-2 bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingWorker}
                      className="px-6 py-2 bg-primary hover:bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingWorker ? "Registering..." : "Register"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Staff Roster Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredWorkersList.length === 0 ? (
              <div className="col-span-full bg-card border border-border rounded-2xl px-6 py-16 text-center">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <div className="text-[11.5px] font-black uppercase tracking-widest text-muted-foreground">
                  No matching staff found
                </div>
              </div>
            ) : (
              filteredWorkersList.map((worker) => renderMobileWorkerCard(worker))
            )}
          </div>
        </>
      )}
    </div>
  );
};
