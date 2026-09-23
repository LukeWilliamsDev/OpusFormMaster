import React, { useMemo, useState } from "react";
import { ArrowLeft, Check, FileUp, MapPin, Send } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { usePortal } from "../context/PortalContext";
import { supabase } from "../../integrations/supabase/client";
import { ThirdPartyAttachmentsPanel } from "../components/ThirdPartyAttachmentsPanel";
import { ThirdPartyNotesPanel } from "../components/ThirdPartyNotesPanel";

const db = supabase as any;
type Tab = "overview" | "notes" | "photos" | "attachments";

export const ThirdPartySitePage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { user, profile, workers, jobs, shifts } = usePortal();
  const [tab, setTab] = useState<Tab>("overview");
  const [note, setNote] = useState("");
  const [postingNote, setPostingNote] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentRefresh, setAttachmentRefresh] = useState(0);
  const [photos, setPhotos] = useState<any[]>([]);
  const ownedWorkerIds = useMemo(() => new Set(workers.map((worker) => worker.id)), [workers]);
  const job = jobs.find(
    (item) =>
      item.id === jobId &&
      shifts.some((shift) => shift.jobId === item.id && ownedWorkerIds.has(shift.workerId)),
  );

  React.useEffect(() => {
    if (!jobId || !user) return;
    db.from("job_attachments")
      .select("id, file_name, file_url, type, uploaded_at")
      .eq("job_id", jobId)
      .eq("uploaded_by_user_id", user.id)
      .order("uploaded_at", { ascending: false })
      .then(({ data }: { data: any[] | null }) => setPhotos(data ?? []));
  }, [jobId, user?.id]);

  if (!job) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <Link to="/portal/third-party/jobs" className="text-sm font-bold text-primary">
          ← Back to assigned sites
        </Link>
        <div className="mt-8 rounded-2xl border-2 border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          This site is not assigned to your approved staff.
        </div>
      </div>
    );
  }

  const assignedStaff = workers.filter((worker) =>
    shifts.some((shift) => shift.jobId === job.id && shift.workerId === worker.id),
  );
  const addNote = async () => {
    if (!note.trim()) return;
    setPostingNote(true);
    const { error } = await db.from("third_party_job_notes").insert({
      tenant_id: profile?.tenant_id,
      job_id: job.id,
      author_id: user?.id,
      body: note.trim(),
    });
    setPostingNote(false);
    if (error) return toast.error(error.message || "Unable to add note");
    setNote("");
    toast.success("Note added");
  };
  const uploadPhoto = async (file: File, type: "image_before" | "image_after") => {
    if (!user) return;
    setUploading(true);
    const extension = file.name.split(".").pop() || "bin";
    const path = `third-party-media/${job.id}/${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("job-attachments")
      .upload(path, file);
    if (uploadError) {
      setUploading(false);
      return toast.error(uploadError.message || "Unable to upload photo");
    }
    const { error } = await db.from("job_attachments").insert({
      job_id: job.id,
      type,
      file_name: file.name,
      file_url: path,
      file_size_bytes: file.size,
      uploaded_by: user.email ?? "Third party",
      uploaded_by_user_id: user.id,
    });
    setUploading(false);
    if (error) return toast.error(error.message || "Unable to record photo");
    setPhotos((current) => [{ file_name: file.name, file_url: path, type }, ...current]);
    toast.success("Photo uploaded");
  };
  const openPhoto = async (photo: any) => {
    const { data, error } = await supabase.storage
      .from("job-attachments")
      .createSignedUrl(photo.file_url, 300);
    if (error || !data?.signedUrl) return toast.error(error?.message || "Unable to open photo");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  const uploadAttachment = async (file: File) => {
    if (!user) return;
    setUploadingAttachment(true);
    const extension = file.name.split(".").pop() || "bin";
    const path = `${user.id}/${job.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("third-party-attachments")
      .upload(path, file);
    if (uploadError) {
      setUploadingAttachment(false);
      return toast.error(uploadError.message || "Unable to upload attachment");
    }
    const { error } = await db
      .from("third_party_attachments")
      .insert({
        tenant_id: profile?.tenant_id,
        job_id: job.id,
        uploaded_by: user.id,
        file_name: file.name,
        file_path: path,
        mime_type: file.type || "application/octet-stream",
        file_size_bytes: file.size,
      });
    setUploadingAttachment(false);
    if (error) return toast.error(error.message || "Unable to record attachment");
    setAttachmentRefresh((current) => current + 1);
    toast.success("Attachment uploaded");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <Link
        to="/portal/third-party/jobs"
        className="inline-flex items-center gap-2 text-xs font-bold text-primary"
      >
        <ArrowLeft className="h-3 w-3" />
        Assigned sites
      </Link>
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          Assigned site · {job.postcode}
        </p>
        <h1 className="mt-2 text-2xl font-black text-foreground">{job.siteName}</h1>
        <div className="mt-5 rounded-2xl border-2 border-border bg-card p-5">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-500">
            {job.status}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Schedule · {job.currentPours} pours · {assignedStaff.length} of your staff assigned
          </p>
        </div>
      </header>
      <nav className="flex flex-wrap gap-6 border-b border-border">
        {(["overview", "notes", "photos", "attachments"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`border-b-2 pb-3 text-[11px] font-black uppercase tracking-widest ${tab === item ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            {item === "attachments" ? "Attachments" : item === "photos" ? "Site photos" : item}
          </button>
        ))}
      </nav>
      {tab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border-2 border-border bg-card p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              Overview
            </p>
            <dl className="mt-8 space-y-6">
              {[
                ["Schedule", job.status],
                ["Pours", `${job.currentPours} planned`],
                [
                  "Your staff on site",
                  assignedStaff.map((worker) => worker.name).join(" · ") || "None",
                ],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-2 gap-4">
                  <dt className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="text-sm font-bold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="rounded-2xl border-2 border-border bg-card p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              Add a note
            </p>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What happened, what's next..."
              className="mt-6 min-h-28 w-full rounded-xl border border-border bg-background p-4 text-sm"
            />
            <button
              onClick={addNote}
              disabled={postingNote || !note.trim()}
              className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-xs font-black text-primary-foreground disabled:opacity-50"
            >
              <Send className="h-3 w-3" />
              Add note
            </button>
          </section>
        </div>
      )}
      {tab === "notes" && (
        <section>
          <div className="rounded-2xl border-2 border-border bg-card p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              Add a note
            </p>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What happened, what's next..."
              className="mt-4 min-h-24 w-full rounded-xl border border-border bg-background p-4 text-sm"
            />
            <button
              onClick={addNote}
              disabled={postingNote || !note.trim()}
              className="mt-3 flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-xs font-black text-primary-foreground disabled:opacity-50"
            >
              <Send className="h-3 w-3" />
              Add note
            </button>
          </div>
          <ThirdPartyNotesPanel jobId={job.id} />
        </section>
      )}
      {tab === "photos" && (
        <section className="rounded-2xl border-2 border-border bg-card p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
            Site photos
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-xs font-bold">
              <FileUp className="h-4 w-4" />
              {uploading ? "Uploading..." : "Before photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) =>
                  event.target.files?.[0] && uploadPhoto(event.target.files[0], "image_before")
                }
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-xs font-bold">
              <FileUp className="h-4 w-4" />
              {uploading ? "Uploading..." : "After photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) =>
                  event.target.files?.[0] && uploadPhoto(event.target.files[0], "image_after")
                }
              />
            </label>
          </div>
          {photos.length === 0 ? (
            <p className="mt-8 text-sm text-muted-foreground">No site photos uploaded by you.</p>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {photos.map((photo) => (
                <button
                  key={photo.id ?? photo.file_url}
                  onClick={() => openPhoto(photo)}
                  className="rounded-xl border border-border p-3 text-left text-xs font-bold"
                >
                  <span className="block truncate">{photo.file_name}</span>
                  <span className="mt-1 block text-muted-foreground">
                    {photo.type === "image_before" ? "Before" : "After"} · View photo
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
      {tab === "attachments" && (
        <ThirdPartyAttachmentsPanel
          jobId={job.id}
          refreshKey={attachmentRefresh}
          action={
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-[10px] font-black uppercase tracking-widest hover:border-primary">
              <FileUp className="h-3.5 w-3.5" />
              {uploadingAttachment ? "Uploading..." : "Upload file"}
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                className="hidden"
                onChange={(event) =>
                  event.target.files?.[0] && uploadAttachment(event.target.files[0])
                }
              />
            </label>
          }
        />
      )}
    </div>
  );
};
