import React, { useMemo, useState } from "react";
import { Check, FileUp, MapPin, Send } from "lucide-react";
import { toast } from "sonner";
import { usePortal } from "../context/PortalContext";
import { supabase } from "../../integrations/supabase/client";
import { formatUKDate } from "../utils/week";

const db = supabase as any;

export const ThirdPartyJobsPage: React.FC = () => {
  const { user, profile, workers, jobs, shifts } = usePortal();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [postingNote, setPostingNote] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [jobFiles, setJobFiles] = useState<any[]>([]);
  const [noteHistory, setNoteHistory] = useState<any[]>([]);
  const ownedWorkerIds = useMemo(() => new Set(workers.map((worker) => worker.id)), [workers]);
  const assignedJobs = useMemo(
    () =>
      jobs.filter((job) =>
        shifts.some((shift) => shift.jobId === job.id && ownedWorkerIds.has(shift.workerId)),
      ),
    [jobs, shifts, ownedWorkerIds],
  );
  const selectedJob = assignedJobs.find((job) => job.id === selectedJobId) ?? null;

  React.useEffect(() => {
    if (!selectedJobId) return setJobFiles([]);
    (async () => {
      const [{ data: photos }, { data: attachments }] = await Promise.all([
        db
          .from("job_attachments")
          .select("id, file_name, file_url")
          .eq("job_id", selectedJobId)
          .eq("uploaded_by_user_id", user?.id),
        db
          .from("third_party_attachments")
          .select("id, file_name, file_path")
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

  const loadNoteHistory = async () => {
    if (!selectedJobId) return setNoteHistory([]);
    const { data: notes } = await db
      .from("third_party_job_notes")
      .select("id, body, created_at")
      .eq("job_id", selectedJobId)
      .order("created_at", { ascending: true });
    const rows = notes ?? [];
    const { data: replies } = rows.length
      ? await db
          .from("third_party_job_note_replies")
          .select("id, note_id, body, created_at")
          .in(
            "note_id",
            rows.map((note: any) => note.id),
          )
          .order("created_at", { ascending: true })
      : { data: [] };
    const grouped: Record<string, any[]> = {};
    for (const reply of replies ?? []) (grouped[reply.note_id] ??= []).push(reply);
    setNoteHistory(rows.map((note: any) => ({ ...note, replies: grouped[note.id] ?? [] })));
  };

  React.useEffect(() => {
    loadNoteHistory();
  }, [selectedJobId]);

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
    await loadNoteHistory();
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

  const openFile = async (file: any) => {
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
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          Assigned sites
        </p>
        <h1 className="mt-2 text-2xl font-black text-foreground">Your assigned jobs</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          View the site overview and add notes, photos, or Third Party Attachments. Job details
          remain read-only.
        </p>
      </header>
      {assignedJobs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No current or future assignments.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignedJobs.map((job) => (
            <article key={job.id} className="rounded-2xl border-2 border-border bg-card p-5">
              <button
                onClick={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)}
                className="w-full text-left"
              >
                <p className="font-black text-foreground">{job.siteName}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {job.postcode} · {job.currentPours} pours
                </p>
              </button>
              {selectedJobId === job.id && (
                <div className="mt-5 space-y-4 border-t border-border pt-5">
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
                    className="min-h-24 w-full rounded-lg border border-border bg-background p-3 text-sm"
                  />
                  <button
                    onClick={addNote}
                    disabled={postingNote || !note.trim()}
                    className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                  >
                    <Send className="h-3 w-3" />
                    Add note
                  </button>
                  {noteHistory.length > 0 && (
                    <div className="space-y-3 rounded-xl border border-border bg-background p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Note history
                      </p>
                      {noteHistory.map((historyNote) => (
                        <div
                          key={historyNote.id}
                          className="rounded-lg border border-border bg-card p-3"
                        >
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                            You · {formatUKDate(historyNote.created_at?.slice(0, 10))}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm">{historyNote.body}</p>
                          {historyNote.replies.map((reply: any) => (
                            <div key={reply.id} className="mt-3 border-l-2 border-primary/30 pl-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Opus Form team · {formatUKDate(reply.created_at?.slice(0, 10))}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-xs">{reply.body}</p>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
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
                            kind === "document" ? ".pdf,.doc,.docx,.xls,.xlsx,.txt" : "image/*"
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
                          onClick={() => openFile(file)}
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
          ))}
        </div>
      )}
    </div>
  );
};
