import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronRight,
  FileUp,
  Loader,
  MapPin,
  Plus,
  Search,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { usePortal } from "../context/PortalContext";
import { STAFF_ROLES } from "../types/erp";
import { formatUKDate } from "../utils/week";
import { getCurrentTickets, getTicketStatus } from "../utils/workerValidation";
import { supabase } from "../../integrations/supabase/client";

const db = supabase as any;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const CERTIFICATE_TYPES = [
  "CSCS",
  "CPCS",
  "NPORS",
  "Concrete Pump Operator",
  "Slinger / Signaller",
  "Banksman / Vehicle Marshal",
  "Telehandler",
  "Forward Tipping Dumper",
  "Ride-on Roller",
  "Excavator",
  "Loading Shovel",
  "NVQ Level 2 Formwork",
  "NVQ Level 2 Concrete Occupations",
  "NVQ Level 2 Groundworks",
  "NVQ Level 2 Screeding",
  "NVQ Level 3 Occupational Work Supervision",
  "SSSTS",
  "SMSTS",
  "Temporary Works Coordinator",
  "Temporary Works Supervisor",
  "Temporary Works Awareness",
  "First Aid at Work",
  "Emergency First Aid at Work",
  "Asbestos Awareness",
  "Silica Dust / Respirable Crystalline Silica Awareness",
  "COSHH Awareness",
  "Manual Handling",
  "Working at Height",
  "Harness / Fall Arrest",
  "PASMA",
  "IPAF",
  "Abrasive Wheels",
  "Confined Space",
  "Face Fit Test",
  "Fire Marshal",
  "Traffic Marshal",
  "Environmental Awareness",
  "Spill Response",
] as const;

type FormState = {
  name: string;
  role: string;
  email: string;
  phone: string;
  postcode: string;
  notes: string;
};
const EMPTY_FORM: FormState = {
  name: "",
  role: STAFF_ROLES[0],
  email: "",
  phone: "",
  postcode: "",
  notes: "",
};
type WorkerEditDraft = {
  id: string;
  name: string;
  email: string;
  phone: string;
  postcode: string;
};
type CertificatePanelMode = "add" | "replace";

export const ThirdPartyPortalPage: React.FC = () => {
  const { user, profile, workers, setWorkers, jobs, shifts, dataLoading } = usePortal();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [editingDraft, setEditingDraft] = useState<WorkerEditDraft | null>(null);
  const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null);
  const [ticketType, setTicketType] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [ticketExpiry, setTicketExpiry] = useState("");
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [uploadingTicket, setUploadingTicket] = useState(false);
  const [ticketStaffId, setTicketStaffId] = useState<string | null>(null);
  const [certificatePanelMode, setCertificatePanelMode] = useState<CertificatePanelMode>("add");
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffFilter, setStaffFilter] = useState<"all" | "attention">("all");
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  const loadSubmissions = async () => {
    const { data } = await db
      .from("third_party_staff_submissions")
      .select("id, name, role, status, approved_staff_id, created_at, review_notes")
      .order("created_at", { ascending: false });
    setSubmissions(data ?? []);
    setLastSubmissionId(
      data?.find((submission: any) => submission.status === "pending")?.id ?? null,
    );
  };
  React.useEffect(() => {
    loadSubmissions();
  }, []);
  const pendingSubmissions = useMemo(
    () => submissions.filter((submission) => submission.status === "pending"),
    [submissions],
  );
  const currentCertificateCount = workers.reduce(
    (total, worker) => total + getCurrentTickets(worker.tickets ?? []).length,
    0,
  );
  React.useEffect(() => {
    if (!workers.length) return setSelectedWorkerId(null);
    if (!selectedWorkerId || !workers.some((worker) => worker.id === selectedWorkerId)) {
      setSelectedWorkerId(workers[0].id);
    }
  }, [workers, selectedWorkerId]);
  const hasCertificateAttention = (worker: (typeof workers)[number]) =>
    getCurrentTickets(worker.tickets ?? []).some((ticket) => {
      const status = getTicketStatus(ticket);
      return status === "EXPIRED" || status === "EXPIRING_SOON";
    });
  const attentionWorkers = workers.filter(hasCertificateAttention);
  const visibleWorkers = workers.filter((worker) => {
    const matchesSearch = `${worker.name} ${worker.role} ${worker.email ?? ""}`
      .toLowerCase()
      .includes(staffSearch.toLowerCase());
    return matchesSearch && (staffFilter === "all" || hasCertificateAttention(worker));
  });
  const selectedWorker = workers.find((worker) => worker.id === selectedWorkerId) ?? null;
  const assignedJobsForWorker = (workerId: string) =>
    jobs.filter((job) =>
      shifts.some((shift) => shift.jobId === job.id && shift.workerId === workerId),
    );

  if (dataLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6 lg:py-12">
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const setField = (field: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const submitStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    const { data: submissionId, error } = await db.rpc("submit_third_party_staff", {
      p_name: form.name,
      p_role: form.role,
      p_email: form.email,
      p_phone: form.phone,
      p_postcode: form.postcode,
      p_notes: form.notes,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message || "Unable to submit staff member");
    setForm(EMPTY_FORM);
    setLastSubmissionId(submissionId);
    await loadSubmissions();
    toast.success("Staff member submitted for approval");
  };

  const openCertificatePanel = (
    staffId: string,
    mode: CertificatePanelMode,
    ticket: any | null = null,
  ) => {
    setTicketStaffId(staffId);
    setCertificatePanelMode(mode);
    setSelectedTicket(ticket);
    setTicketType(ticket?.type ?? "");
    setTicketNumber(ticket?.ticketNumber ?? "");
    setTicketExpiry("");
    setTicketFile(null);
  };

  const closeCertificatePanel = () => {
    setTicketStaffId(null);
    setSelectedTicket(null);
    setCertificatePanelMode("add");
    setTicketType("");
    setTicketNumber("");
    setTicketExpiry("");
    setTicketFile(null);
  };

  const uploadTicket = async (submissionId: string | null, staffId: string | null = null) => {
    if (!submissionId || !ticketFile || !user || !profile?.tenant_id) return;
    if (!ticketType.trim()) {
      return toast.error("Enter the certificate name");
    }
    if (ticketFile.size > MAX_UPLOAD_BYTES) {
      return toast.error("Certificate files must be 10 MB or smaller");
    }
    setUploadingTicket(true);
    const extension = ticketFile.name.split(".").pop() || "bin";
    const path = `${user.id}/${submissionId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("third-party-staff-documents")
      .upload(path, ticketFile);
    if (uploadError) {
      setUploadingTicket(false);
      return toast.error(uploadError.message || "Unable to upload certificate");
    }
    const { error } = await db.from("third_party_staff_documents").insert({
      tenant_id: profile.tenant_id,
      submission_id: submissionId,
      staff_id: staffId,
      uploaded_by: user.id,
      ticket_type: ticketType.trim(),
      ticket_number: ticketNumber || null,
      expiry_date: ticketExpiry || null,
      file_name: ticketFile.name,
      file_path: path,
      mime_type: ticketFile.type || "application/octet-stream",
      file_size_bytes: ticketFile.size,
    });
    setUploadingTicket(false);
    if (error) return toast.error(error.message || "Unable to record certificate");
    setTicketFile(null);
    setTicketType("");
    setTicketNumber("");
    setTicketExpiry("");
    closeCertificatePanel();
    if (staffId) {
      const { data: refreshedStaff } = await db
        .from("staff")
        .select("id, name, role, email, phone, postcode, tickets, uploaded_certificates")
        .eq("id", staffId)
        .single();
      if (refreshedStaff) {
        setWorkers((current) =>
          current.map((worker) =>
            worker.id === staffId
              ? {
                  ...worker,
                  tickets: refreshedStaff.tickets ?? [],
                  uploadedCertificates: refreshedStaff.uploaded_certificates ?? [],
                }
              : worker,
          ),
        );
      }
    }
    toast.success("Certificate uploaded");
  };

  const saveWorker = async () => {
    if (!editingDraft) return;
    const { error } = await db
      .from("staff")
      .update({
        name: editingDraft.name,
        email: editingDraft.email || null,
        phone: editingDraft.phone || null,
        postcode: editingDraft.postcode || null,
      })
      .eq("id", editingDraft.id);
    if (error) return toast.error(error.message || "Unable to save staff member");
    setEditingDraft(null);
    toast.success("Staff member updated");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6 lg:py-12">
      <datalist id="certificate-types">
        {CERTIFICATE_TYPES.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            People and approvals
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Your staff</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage submissions, approvals, and compliance documents in one place.
          </p>
        </div>
        <button
          onClick={() => setShowAddStaff((current) => !current)}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          {showAddStaff ? "Close" : "Add staff member"}
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Approved staff", workers.length, "visible to Opus Form"],
          ["Pending submissions", pendingSubmissions.length, "waiting for review"],
          ["Current certificates", currentCertificateCount, "latest version per type"],
        ].map(([label, value, description]) => (
          <div
            key={String(label)}
            className="rounded-2xl border-2 border-border bg-card p-5 shadow-sm"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {label}
            </p>
            <p className="mt-4 text-3xl font-black tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>

      <div className="space-y-8">
        {showAddStaff && (
          <section className="rounded-2xl border-2 border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-black uppercase tracking-widest">
                Submit staff for approval
              </h2>
            </div>
            <form onSubmit={submitStaff} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(["name", "email", "phone", "postcode"] as const).map((field) => (
                <input
                  key={field}
                  required={field === "name"}
                  value={form[field]}
                  onChange={(e) => setField(field, e.target.value)}
                  aria-label={field[0].toUpperCase() + field.slice(1)}
                  placeholder={field[0].toUpperCase() + field.slice(1)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              ))}
              <select
                value={form.role}
                onChange={(e) => setField("role", e.target.value)}
                aria-label="Staff role"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {STAFF_ROLES.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
              <input
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                aria-label="Notes"
                placeholder="Notes (optional)"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <button
                disabled={submitting}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50 sm:col-span-2 lg:col-span-1"
              >
                {submitting ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}{" "}
                Submit for approval
              </button>
            </form>
          </section>
        )}

        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                Staff directory
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {workers.length} approved staff · {attentionWorkers.length} needs attention ·{" "}
                {currentCertificateCount} current certificates
              </p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:items-start">
            <section className="min-w-0 rounded-2xl border-2 border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black">People</h3>
                <span className="text-xs text-muted-foreground">{visibleWorkers.length} shown</span>
              </div>
              {attentionWorkers.length > 0 && (
                <div className="mt-4 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-800">
                  <div className="flex items-center gap-2 font-black uppercase tracking-widest">
                    <AlertCircle className="h-3.5 w-3.5" /> Needs attention
                  </div>
                  <p className="mt-1">
                    {attentionWorkers[0].name} has a certificate expiring soon.
                  </p>
                </div>
              )}
              <label className="relative mt-4 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={staffSearch}
                  onChange={(event) => setStaffSearch(event.target.value)}
                  placeholder="Search staff by name or role"
                  aria-label="Search staff"
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
                />
              </label>
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {(
                  [
                    ["all", `All staff · ${workers.length}`],
                    ["attention", `Needs attention · ${attentionWorkers.length}`],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStaffFilter(value)}
                    className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${staffFilter === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                {visibleWorkers.map((worker) => {
                  const attention = hasCertificateAttention(worker);
                  const workerSites = assignedJobsForWorker(worker.id);
                  return (
                    <button
                      key={worker.id}
                      type="button"
                      onClick={() => setSelectedWorkerId(worker.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${selectedWorkerId === worker.id ? "border-primary ring-2 ring-primary/10" : "border-border hover:border-primary"}`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">
                        {worker.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black">{worker.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {worker.role}
                        </span>
                      </span>
                      <span className="text-right">
                        <span
                          className={`block rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest ${attention ? "bg-amber-500/10 text-amber-700" : "bg-emerald-500/10 text-emerald-700"}`}
                        >
                          {attention ? "Expiring" : "Valid"}
                        </span>
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {workerSites.length} sites
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="min-w-0 rounded-2xl border-2 border-border bg-card p-5">
              {selectedWorker ? (
                <>
                  {editingDraft?.id === selectedWorker.id ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          ["name", "Staff name"],
                          ["email", "Email"],
                          ["phone", "Phone"],
                          ["postcode", "Postcode"],
                        ] as const
                      ).map(([field, label]) => (
                        <label key={field} className="text-xs font-bold text-muted-foreground">
                          {label}
                          <input
                            aria-label={label}
                            value={editingDraft[field]}
                            onChange={(event) =>
                              setEditingDraft({ ...editingDraft, [field]: event.target.value })
                            }
                            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                          />
                        </label>
                      ))}
                      <div className="flex gap-2 sm:col-span-2">
                        <button
                          type="button"
                          onClick={saveWorker}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                        >
                          Save changes
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDraft(null)}
                          className="rounded-lg border border-border px-4 py-2 text-sm font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                          Staff record
                        </p>
                        <h3 className="mt-1 text-2xl font-black">{selectedWorker.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedWorker.role} · {selectedWorker.email || "No email"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingDraft({
                            id: selectedWorker.id,
                            name: selectedWorker.name,
                            email: selectedWorker.email ?? "",
                            phone: selectedWorker.phone ?? "",
                            postcode: selectedWorker.postcode ?? "",
                          })
                        }
                        className="rounded-lg border border-border px-3 py-2 text-[10px] font-black uppercase tracking-widest"
                      >
                        Edit details
                      </button>
                    </div>
                  )}

                  {!editingDraft && (
                    <>
                      <div className="mt-5 grid grid-cols-3 gap-2">
                        {[
                          [
                            "Certificates",
                            getCurrentTickets(selectedWorker.tickets ?? []).length,
                            hasCertificateAttention(selectedWorker) ? "needs renewal" : "current",
                          ],
                          [
                            "Assigned sites",
                            assignedJobsForWorker(selectedWorker.id).length,
                            "site records",
                          ],
                          [
                            "Files held",
                            selectedWorker.uploadedCertificates?.length ?? 0,
                            "including history",
                          ],
                        ].map(([label, value, note]) => (
                          <div key={String(label)} className="rounded-lg border border-border p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              {label}
                            </p>
                            <p className="mt-2 text-2xl font-black">{value}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground">{note}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 border-t border-border pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-black">Current certificates</h4>
                          {submissions.some(
                            (submission) => submission.approved_staff_id === selectedWorker.id,
                          ) && (
                            <button
                              type="button"
                              onClick={() => openCertificatePanel(selectedWorker.id, "add")}
                              className="text-[10px] font-black uppercase tracking-widest text-primary"
                            >
                              + Add certificate
                            </button>
                          )}
                        </div>
                        <div className="mt-3 space-y-2">
                          {getCurrentTickets(selectedWorker.tickets ?? []).length === 0 ? (
                            <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                              No certificates on file.
                            </p>
                          ) : (
                            getCurrentTickets(selectedWorker.tickets ?? []).map((ticket) => {
                              const status = getTicketStatus(ticket);
                              const document = (selectedWorker.uploadedCertificates ?? []).find(
                                (candidate) => candidate.id === ticket.id,
                              );
                              return (
                                <div
                                  key={ticket.id}
                                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-3"
                                >
                                  <div className="min-w-0">
                                    <span className="font-bold">{ticket.type}</span>
                                    <span
                                      className={`ml-2 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest ${status === "EXPIRED" ? "bg-destructive/10 text-destructive" : status === "EXPIRING_SOON" ? "bg-amber-500/10 text-amber-700" : "bg-emerald-500/10 text-emerald-700"}`}
                                    >
                                      {status === "EXPIRED"
                                        ? "Expired"
                                        : status === "EXPIRING_SOON"
                                          ? "Expiring soon"
                                          : "Valid"}
                                    </span>
                                    <p className="mt-1 truncate text-xs text-muted-foreground">
                                      {document?.name || "No file attached"}
                                      {ticket.expiryDate
                                        ? ` · expires ${formatUKDate(ticket.expiryDate)}`
                                        : ""}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openCertificatePanel(selectedWorker.id, "replace", {
                                        ...ticket,
                                        fileName: document?.name,
                                      })
                                    }
                                    className="shrink-0 text-xs font-black text-primary"
                                  >
                                    Replace
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                      <div className="mt-6 border-t border-border pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-black">Assigned sites</h4>
                          <a
                            href="#/portal/third-party/jobs"
                            className="text-[10px] font-black uppercase tracking-widest text-primary"
                          >
                            View all →
                          </a>
                        </div>
                        <div className="mt-3 space-y-2">
                          {assignedJobsForWorker(selectedWorker.id).length === 0 ? (
                            <p className="text-xs text-muted-foreground">No assigned sites.</p>
                          ) : (
                            assignedJobsForWorker(selectedWorker.id).map((job) => (
                              <Link
                                key={job.id}
                                to={`/portal/third-party/jobs/${job.id}`}
                                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3 hover:border-primary"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-xs font-bold">
                                    {job.siteName}
                                  </span>
                                  <span className="mt-1 block text-[10px] text-muted-foreground">
                                    {job.postcode}
                                  </span>
                                </span>
                                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-primary">
                                  {job.status}
                                </span>
                              </Link>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="mt-6 border-t border-border pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-black">Recent activity</h4>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Audit retained
                          </span>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          Certificate files and previous versions remain available in Opus Form’s
                          audit history.
                        </p>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a staff member to view their record.
                </p>
              )}
            </section>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Pending submissions
          </h2>
          {pendingSubmissions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No pending submissions.
            </p>
          ) : (
            pendingSubmissions.map((submission) => (
              <div
                key={submission.id}
                className="flex items-center justify-between rounded-2xl border-2 border-border bg-card p-4"
              >
                <div>
                  <p className="font-bold">{submission.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {submission.role} · {formatUKDate(submission.created_at?.slice(0, 10))}
                  </p>
                </div>
                <span className="rounded-lg border border-primary/60 bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary">
                  {submission.status}
                </span>
              </div>
            ))
          )}
        </section>

        {lastSubmissionId && (
          <section className="rounded-2xl border-2 border-border bg-card p-5">
            <div className="mb-4">
              <h2 className="text-sm font-black uppercase tracking-widest">Add certificates</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Attach compliance documents to your latest pending staff submission. Internal
                approvers will review them with the staff application.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Start typing to search the list, or enter a certificate name if it is not listed.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                list="certificate-types"
                value={ticketType}
                onChange={(e) => setTicketType(e.target.value)}
                placeholder="Type or select certificate"
                required
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                placeholder="Certificate number"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={ticketExpiry}
                onChange={(e) => setTicketExpiry(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm">
                <FileUp className="h-4 w-4" />
                {ticketFile?.name || "Choose file"}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => setTicketFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <button
              onClick={() => uploadTicket(lastSubmissionId)}
              disabled={uploadingTicket || !ticketFile}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {uploadingTicket ? "Uploading..." : "Upload certificate"}
            </button>
          </section>
        )}

        <section className="hidden space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Your approved staff
          </h2>
          {workers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No approved staff yet.
            </p>
          ) : (
            workers.map((worker) => (
              <div key={worker.id} className="rounded-2xl border-2 border-border bg-card p-4">
                {editingDraft?.id === worker.id ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      aria-label="Staff name"
                      value={editingDraft.name}
                      onChange={(e) => setEditingDraft({ ...editingDraft, name: e.target.value })}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                    <input
                      aria-label="Staff email"
                      value={editingDraft.email}
                      onChange={(e) => setEditingDraft({ ...editingDraft, email: e.target.value })}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                    <input
                      aria-label="Staff phone"
                      value={editingDraft.phone}
                      onChange={(e) => setEditingDraft({ ...editingDraft, phone: e.target.value })}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                    <input
                      aria-label="Staff postcode"
                      value={editingDraft.postcode}
                      onChange={(e) =>
                        setEditingDraft({ ...editingDraft, postcode: e.target.value })
                      }
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                    <button
                      onClick={saveWorker}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                    >
                      Save changes
                    </button>
                    <button
                      onClick={() => setEditingDraft(null)}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                          <Check className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-bold text-foreground">{worker.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {worker.role} · {worker.email || "No email"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            setEditingDraft({
                              id: worker.id,
                              name: worker.name,
                              email: worker.email ?? "",
                              phone: worker.phone ?? "",
                              postcode: worker.postcode ?? "",
                            })
                          }
                          className="rounded-lg border border-border px-3 py-2 text-[10px] font-black uppercase tracking-widest"
                        >
                          Edit
                        </button>
                        {submissions.some(
                          (submission) => submission.approved_staff_id === worker.id,
                        ) && (
                          <button
                            onClick={() => openCertificatePanel(worker.id, "add")}
                            className="rounded-lg border border-border px-3 py-2 text-[10px] font-black uppercase tracking-widest"
                          >
                            Add another certificate
                          </button>
                        )}
                      </div>
                    </div>
                    {getCurrentTickets(worker.tickets ?? []).length > 0 && (
                      <div className="space-y-2 border-t border-border pt-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Current certificates
                        </span>
                        {getCurrentTickets(worker.tickets ?? [])
                          .slice(0, 4)
                          .map((ticket) => {
                            const status = getTicketStatus(ticket);
                            const document = (worker.uploadedCertificates ?? []).find(
                              (candidate) => candidate.id === ticket.id,
                            );
                            return (
                              <div
                                key={ticket.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs"
                              >
                                <div className="min-w-0 truncate">
                                  <span className="font-bold">{ticket.type}</span>
                                  <span
                                    className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${status === "EXPIRED" ? "bg-destructive/10 text-destructive" : status === "EXPIRING_SOON" ? "bg-amber-500/10 text-amber-700" : "bg-primary/10 text-primary"}`}
                                  >
                                    {status === "EXPIRED"
                                      ? "Expired"
                                      : status === "EXPIRING_SOON"
                                        ? "Expiring"
                                        : "Valid"}
                                  </span>
                                  <p className="mt-1 truncate text-xs text-muted-foreground">
                                    {document?.name || "No file attached"}
                                    {ticket.expiryDate
                                      ? ` · expires ${formatUKDate(ticket.expiryDate)}`
                                      : ""}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openCertificatePanel(worker.id, "replace", {
                                      ...ticket,
                                      fileName: document?.name,
                                    })
                                  }
                                  className="shrink-0 font-black text-primary underline decoration-current/40 underline-offset-2 hover:decoration-current"
                                >
                                  Replace
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </section>

        {ticketStaffId && (
          <section className="rounded-2xl border-2 border-primary/60 bg-card p-5 shadow-sm ring-4 ring-primary/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Certificate update
                </p>
                <h2 className="mt-1 text-xl font-black">
                  {certificatePanelMode === "replace"
                    ? `Replace ${ticketType} certificate`
                    : `Add a certificate for ${workers.find((worker) => worker.id === ticketStaffId)?.name}`}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {certificatePanelMode === "replace"
                    ? `The new file will become the current ${ticketType} record.`
                    : "Add a new certificate type to this staff record."}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close certificate panel"
                onClick={closeCertificatePanel}
                className="text-2xl leading-none text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
            {certificatePanelMode === "replace" && selectedTicket && (
              <div className="mt-4 rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">
                <p className="font-black uppercase tracking-widest text-foreground">
                  Current record
                </p>
                <p className="mt-1">
                  {selectedTicket.fileName || "Current certificate file"}
                  {selectedTicket.expiryDate
                    ? ` · expires ${formatUKDate(selectedTicket.expiryDate)}`
                    : ""}
                </p>
              </div>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-muted-foreground">
                Certificate number
                <input
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="text-xs font-bold text-muted-foreground">
                New expiry date
                <input
                  type="date"
                  value={ticketExpiry}
                  onChange={(e) => setTicketExpiry(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
            </div>
            {certificatePanelMode === "add" && (
              <label className="mt-3 block text-xs font-bold text-muted-foreground">
                Certificate type
                <input
                  list="certificate-types"
                  value={ticketType}
                  onChange={(e) => setTicketType(e.target.value)}
                  placeholder="Type or select certificate"
                  required
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
            )}
            <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-primary/60 bg-primary/5 px-4 py-4 text-sm text-primary hover:bg-primary/10">
              <FileUp className="h-5 w-5" />
              <span>
                <strong className="block">{ticketFile?.name || "Choose a PDF or image"}</strong>
                <small className="text-xs text-muted-foreground">Maximum 10 MB</small>
              </span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => setTicketFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <p className="mt-3 text-xs text-muted-foreground">
              The previous file stays in Opus Form’s audit history and will not be shown as the
              current certificate.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCertificatePanel}
                className="rounded-lg border border-border px-4 py-2 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  uploadTicket(
                    submissions.find((submission) => submission.approved_staff_id === ticketStaffId)
                      ?.id ?? null,
                    ticketStaffId,
                  )
                }
                disabled={uploadingTicket || !ticketFile || !ticketType.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {uploadingTicket
                  ? "Uploading..."
                  : certificatePanelMode === "replace"
                    ? "Upload renewal"
                    : "Add certificate"}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
