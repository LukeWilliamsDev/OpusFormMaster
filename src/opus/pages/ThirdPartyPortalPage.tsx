import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, FileUp, Loader, MapPin, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { usePortal } from "../context/PortalContext";
import { STAFF_ROLES } from "../types/erp";
import { formatUKDate } from "../utils/week";
import { supabase } from "../../integrations/supabase/client";

const db = supabase as any;

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

export const ThirdPartyPortalPage: React.FC<{ showJobs?: boolean }> = ({ showJobs = false }) => {
  const { user, profile, workers, jobs, shifts } = usePortal();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [postingNote, setPostingNote] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [jobFiles, setJobFiles] = useState<any[]>([]);
  const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null);
  const [ticketType, setTicketType] = useState("CSCS");
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
  React.useEffect(() => {
    if (searchParams.get("section") === "jobs") {
      window.setTimeout(
        () => document.getElementById("assigned-jobs")?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    }
  }, [searchParams]);
  React.useEffect(() => {
    if (!selectedJobId) {
      setJobFiles([]);
      return;
    }
    (async () => {
      const [{ data: photos }, { data: attachments }] = await Promise.all([
        db
          .from("job_attachments")
          .select("id, file_name, file_url, type, uploaded_at")
          .eq("job_id", selectedJobId)
          .eq("uploaded_by_user_id", user?.id),
        db
          .from("third_party_attachments")
          .select("id, file_name, file_path, created_at")
          .eq("job_id", selectedJobId)
          .eq("uploaded_by", user?.id),
      ]);
      setJobFiles([
        ...(photos ?? []).map((file: any) => ({
          ...file,
          bucket: "job-attachments",
          path: file.file_url,
        })),
        ...(attachments ?? []).map((file: any) => ({
          ...file,
          bucket: "third-party-attachments",
          path: file.file_path,
        })),
      ]);
    })();
  }, [selectedJobId, user?.id]);

  const ownedWorkerIds = useMemo(() => new Set(workers.map((worker) => worker.id)), [workers]);
  const pendingSubmissions = useMemo(
    () => submissions.filter((submission) => submission.status === "pending"),
    [submissions],
  );
  const assignedJobs = useMemo(
    () =>
      jobs.filter((job) =>
        shifts.some((shift) => shift.jobId === job.id && ownedWorkerIds.has(shift.workerId)),
      ),
    [jobs, shifts, ownedWorkerIds],
  );
  const selectedJob = assignedJobs.find((job) => job.id === selectedJobId) ?? null;

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
      ticket_type: ticketType,
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

  const addNote = async () => {
    if (!selectedJob || !note.trim()) return;
    setPostingNote(true);
    const { error } = await db.from("third_party_job_notes").insert({
      tenant_id: profile?.tenant_id,
      job_id: selectedJob.id,
      author_id: user?.id,
      body: note.trim(),
    });
    setPostingNote(false);
    if (error) return toast.error(error.message || "Unable to add note");
    setNote("");
    toast.success("Note added");
  };

  const uploadFile = async (file: File, kind: "image_before" | "image_after" | "document") => {
    if (!selectedJob || !user) return;
    setUploading(true);
    const extension = file.name.split(".").pop() || "bin";
    const isPhoto = kind !== "document";
    const path = isPhoto
      ? `third-party-media/${selectedJob.id}/${user.id}/${crypto.randomUUID()}.${extension}`
      : `${user.id}/${selectedJob.id}/${crypto.randomUUID()}.${extension}`;
    const bucket = isPhoto ? "job-attachments" : "third-party-attachments";
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file);
    if (uploadError) {
      setUploading(false);
      return toast.error(uploadError.message || "Unable to upload file");
    }
    const { error } = isPhoto
      ? await db.from("job_attachments").insert({
          job_id: selectedJob.id,
          type: kind,
          file_name: file.name,
          file_url: path,
          file_size_bytes: file.size,
          uploaded_by: user.email ?? "Third party",
          uploaded_by_user_id: user.id,
        })
      : await db.from("third_party_attachments").insert({
          tenant_id: profile?.tenant_id,
          job_id: selectedJob.id,
          uploaded_by: user.id,
          file_name: file.name,
          file_path: path,
          mime_type: file.type || "application/octet-stream",
          file_size_bytes: file.size,
        });
    setUploading(false);
    if (error) return toast.error(error.message || "Unable to record upload");
    setJobFiles((current) => [...current, { file_name: file.name, bucket, path }]);
    toast.success("Attachment uploaded");
  };

  const openOwnFile = async (file: any) => {
    const { data, error } = await supabase.storage
      .from(file.bucket)
      .createSignedUrl(file.path, 300);
    if (error || !data?.signedUrl)
      return toast.error(error?.message || "Unable to open attachment");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    await db.rpc("log_third_party_action", {
      p_action: "THIRD_PARTY_OWN_ATTACHMENT_VIEWED",
      p_target_type: "jobs",
      p_target_id: selectedJobId,
      p_details: { file_name: file.file_name },
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Staff management
          </p>
          <h1 className="mt-2 text-3xl font-black text-foreground">Staff</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Submit people for approval and maintain your approved staff.
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

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
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
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <select
                  value={ticketType}
                  onChange={(e) => setTicketType(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {(["CSCS", "NPORS", "CPCS", "Telehandler", "Supervisor", "Other"] as const).map(
                    (type) => (
                      <option key={type}>{type}</option>
                    ),
                  )}
                </select>
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
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <select
                  value={ticketType}
                  onChange={(e) => setTicketType(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {(["CSCS", "NPORS", "CPCS", "Telehandler", "Supervisor", "Other"] as const).map(
                    (type) => (
                      <option key={type}>{type}</option>
                    ),
                  )}
                </select>
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

          {showJobs && (
            <section id="assigned-jobs" className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                Assigned jobs
              </h2>
              {assignedJobs.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  No current or future assignments.
                </p>
              ) : (
                assignedJobs.map((job) => (
                  <article key={job.id} className="rounded-xl border border-border bg-card p-4">
                    <button
                      onClick={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)}
                      className="w-full text-left"
                    >
                      <p className="font-bold text-foreground">{job.siteName}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {job.postcode} · {job.currentPours} pours
                      </p>
                    </button>
                    {selectedJobId === job.id && (
                      <div className="mt-4 space-y-3 border-t border-border pt-4">
                        <p className="text-xs text-muted-foreground">
                          Your staff assigned:{" "}
                          {workers
                            .filter((worker) =>
                              shifts.some(
                                (shift) => shift.jobId === job.id && shift.workerId === worker.id,
                              ),
                            )
                            .map((worker) => worker.name)
                            .join(", ") || "None"}
                        </p>
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Add a site note..."
                          className="min-h-20 w-full rounded-lg border border-border bg-background p-3 text-sm"
                        />
                        <button
                          onClick={addNote}
                          disabled={postingNote || !note.trim()}
                          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                        >
                          <Send className="h-3 w-3" />
                          Add note
                        </button>
                        <div className="flex flex-wrap gap-2">
                          {(["image_before", "image_after", "document"] as const).map((kind) => (
                            <label
                              key={kind}
                              className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-xs font-bold"
                            >
                              <FileUp className="h-4 w-4" />
                              {uploading
                                ? "Uploading..."
                                : kind === "document"
                                  ? "Third Party Attachment"
                                  : kind === "image_before"
                                    ? "Before photo"
                                    : "After photo"}
                              <input
                                type="file"
                                accept={
                                  kind === "document"
                                    ? ".pdf,.doc,.docx,.xls,.xlsx,.txt"
                                    : "image/*"
                                }
                                className="hidden"
                                onChange={(e) =>
                                  e.target.files?.[0] && uploadFile(e.target.files[0], kind)
                                }
                              />
                            </label>
                          ))}
                        </div>
                        {jobFiles.length > 0 && (
                          <div className="space-y-2">
                            {jobFiles.map((file, index) => (
                              <button
                                key={file.id ?? `${file.path}-${index}`}
                                onClick={() => openOwnFile(file)}
                                className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-xs"
                              >
                                <span className="truncate">{file.file_name}</span>
                                <span className="text-muted-foreground">View</span>
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Check className="h-3 w-3 text-emerald-500" />
                          Only your uploads are visible to you.
                        </div>
                      </div>
                    )}
                  </article>
                ))
              )}
            </section>
          )}
        </div>
        <aside className="h-fit rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
            Staff rules
          </p>
          <p className="mt-4 text-sm font-bold">
            You can edit approved staff and add certificates.
          </p>
          <div className="my-5 h-px bg-border" />
          <p className="text-sm text-muted-foreground">
            You cannot delete, archive, approve, or see other staff.
          </p>
          <p className="mt-5 text-sm text-muted-foreground">
            Certificates are reviewed by Opus Form management.
          </p>
        </aside>
      </div>
    </div>
  );
};
