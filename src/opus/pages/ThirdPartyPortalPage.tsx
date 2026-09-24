import React, { useMemo, useState } from "react";
import { Check, FileUp, Loader, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { usePortal } from "../context/PortalContext";
import { STAFF_ROLES } from "../types/erp";
import { formatUKDate } from "../utils/week";
import { supabase } from "../../integrations/supabase/client";

const db = supabase as any;

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

export const ThirdPartyPortalPage: React.FC = () => {
  const { user, profile, workers } = usePortal();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null);
  const [ticketType, setTicketType] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [ticketExpiry, setTicketExpiry] = useState("");
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [uploadingTicket, setUploadingTicket] = useState(false);
  const [ticketStaffId, setTicketStaffId] = useState<string | null>(null);
  const [showAddStaff, setShowAddStaff] = useState(false);

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
  const documentCount = workers.reduce(
    (total, worker) =>
      total + (worker.tickets?.length ?? 0) + (worker.uploadedCertificates?.length ?? 0),
    0,
  );

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

  const uploadTicket = async (submissionId: string | null, staffId: string | null = null) => {
    if (!submissionId || !ticketFile || !user || !profile?.tenant_id) return;
    if (!ticketType.trim()) {
      return toast.error("Enter the certificate name");
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
    setTicketStaffId(null);
    toast.success("Certificate uploaded");
  };

  const saveWorker = async (worker: (typeof workers)[number]) => {
    const { error } = await db
      .from("staff")
      .update({
        name: worker.name,
        role: worker.role,
        email: worker.email ?? null,
        phone: worker.phone ?? null,
        postcode: worker.postcode ?? null,
        tickets: worker.tickets ?? [],
        uploaded_certificates: worker.uploadedCertificates ?? [],
      })
      .eq("id", worker.id);
    if (error) return toast.error(error.message || "Unable to save staff member");
    setEditingId(null);
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
          ["Documents held", documentCount, "certificates and records"],
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
                  placeholder={field[0].toUpperCase() + field.slice(1)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              ))}
              <select
                value={form.role}
                onChange={(e) => setField("role", e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {STAFF_ROLES.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
              <input
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
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

        <section className="space-y-3">
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
                {editingId === worker.id ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={worker.name}
                      onChange={(e) => (worker.name = e.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                    <input
                      value={worker.email ?? ""}
                      onChange={(e) => (worker.email = e.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                    <input
                      value={worker.phone ?? ""}
                      onChange={(e) => (worker.phone = e.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                    <input
                      value={worker.postcode ?? ""}
                      onChange={(e) => (worker.postcode = e.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => saveWorker(worker)}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                    >
                      Save changes
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
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
                          onClick={() => setEditingId(worker.id)}
                          className="rounded-lg border border-border px-3 py-2 text-[10px] font-black uppercase tracking-widest"
                        >
                          Edit
                        </button>
                        {submissions.some(
                          (submission) => submission.approved_staff_id === worker.id,
                        ) && (
                          <button
                            onClick={() => setTicketStaffId(worker.id)}
                            className="rounded-lg border border-border px-3 py-2 text-[10px] font-black uppercase tracking-widest"
                          >
                            Add certificate
                          </button>
                        )}
                      </div>
                    </div>
                    {[...(worker.tickets ?? []), ...(worker.uploadedCertificates ?? [])].length >
                      0 && (
                      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Certificates
                        </span>
                        {[...(worker.tickets ?? []), ...(worker.uploadedCertificates ?? [])]
                          .slice(0, 3)
                          .map((document: any, index) => (
                            <span
                              key={`${document.id ?? document.type ?? document.name}-${index}`}
                              className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary"
                            >
                              {document.type || document.name || "Certificate"}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </section>

        {ticketStaffId && (
          <section className="rounded-2xl border-2 border-border bg-card p-5">
            <h2 className="text-sm font-black uppercase tracking-widest">
              Add certificate to {workers.find((worker) => worker.id === ticketStaffId)?.name}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Start typing to search the list, or enter a certificate name if it is not listed.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              onClick={() =>
                uploadTicket(
                  submissions.find((submission) => submission.approved_staff_id === ticketStaffId)
                    ?.id ?? null,
                  ticketStaffId,
                )
              }
              disabled={uploadingTicket || !ticketFile}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {uploadingTicket ? "Uploading..." : "Upload certificate"}
            </button>
          </section>
        )}
      </div>
    </div>
  );
};
