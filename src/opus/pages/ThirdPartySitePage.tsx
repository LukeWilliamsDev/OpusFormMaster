import React, { useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, FileUp, Send } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { usePortal } from "../context/PortalContext";
import { supabase } from "../../integrations/supabase/client";
import { ThirdPartyAttachmentsPanel } from "../components/ThirdPartyAttachmentsPanel";
import { ThirdPartyNotesPanel } from "../components/ThirdPartyNotesPanel";
import { getSignedJobAttachmentUrl, getSignedJobAttachmentUrlsBatch } from "../lib/attachmentUrl";

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
  const [gallery, setGallery] = useState<{ photos: any[]; index: number } | null>(null);
  const ownedWorkerIds = useMemo(() => new Set(workers.map((worker) => worker.id)), [workers]);
  const job = jobs.find(
    (item) =>
      item.id === jobId &&
      shifts.some((shift) => shift.jobId === item.id && ownedWorkerIds.has(shift.workerId)),
  );

  React.useEffect(() => {
    if (!jobId || !user) return;
    let cancelled = false;
    const loadPhotos = async () => {
      const { data, error } = await db
        .from("job_attachments")
        .select("id, file_name, file_url, type, uploaded_at, uploaded_by")
        .eq("job_id", jobId)
        .in("type", ["image_before", "image_after"])
        .order("uploaded_at", { ascending: false });
      if (error) {
        toast.error(error.message || "Unable to load site photos");
        return;
      }
      const signedMap = await getSignedJobAttachmentUrlsBatch(
        (data ?? []).map((photo: any) => photo.file_url).filter(Boolean),
      );
      const withPreviews = (data ?? []).map((photo: any) => {
        const signed = signedMap.get(photo.file_url);
        return {
          ...photo,
          full_url: signed?.fullUrl,
          preview_url: signed?.thumbUrl ?? signed?.fullUrl,
        };
      });
      if (!cancelled) setPhotos(withPreviews);
    };
    void loadPhotos();
    return () => {
      cancelled = true;
    };
  }, [jobId, user?.id]);

  // Warm the browser cache for the two adjacent full-size images so the
  // gallery advances immediately instead of waiting for the next request.
  React.useEffect(() => {
    if (!gallery || gallery.photos.length < 2) return;
    const adjacentIndexes = [
      (gallery.index - 1 + gallery.photos.length) % gallery.photos.length,
      (gallery.index + 1) % gallery.photos.length,
    ];
    const preloaded = adjacentIndexes.map((index) => {
      const src = gallery.photos[index].full_url || gallery.photos[index].file_url;
      if (!src) return null;
      const image = new Image();
      image.decoding = "async";
      image.src = src;
      return image;
    });
    void preloaded;
  }, [gallery]);

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
    const [fullUrl, previewUrl] = await Promise.all([
      getSignedJobAttachmentUrl(path, 3600),
      getSignedJobAttachmentUrl(path, 300, { width: 400, quality: 75 }),
    ]);
    setPhotos((current) => [
      { file_name: file.name, file_url: path, type, full_url: fullUrl, preview_url: previewUrl },
      ...current,
    ]);
    toast.success("Photo uploaded");
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
    const { error } = await db.from("third_party_attachments").insert({
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
              placeholder="Add a progress update…"
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
              placeholder="Add a progress update…"
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
            <p className="mt-8 text-sm text-muted-foreground">
              No site photos have been uploaded yet.
            </p>
          ) : (
            <div className="mt-5 rounded-xl border border-border bg-background p-2">
              <p className="mb-2 flex items-center gap-1.5 px-1 text-xs text-muted-foreground/70">
                Click a photo to view it full size.
              </p>
              <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
                {photos.map((photo) => (
                  <button
                    key={photo.id ?? photo.file_url}
                    onClick={() => setGallery({ photos, index: photos.indexOf(photo) })}
                    className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-card text-left"
                  >
                    {photo.preview_url ? (
                      <img
                        src={photo.preview_url}
                        alt={
                          photo.type === "image_before" ? "Before site photo" : "After site photo"
                        }
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center p-3 text-center text-[10px] font-bold text-muted-foreground">
                        {photo.file_name}
                      </span>
                    )}
                    <span
                      className={`absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm ${photo.type === "image_before" ? "bg-black/80 text-white" : "bg-primary text-primary-foreground"}`}
                    >
                      {photo.type === "image_before" ? "Before" : "After"}
                    </span>
                    <span className="absolute inset-x-0 bottom-0 flex translate-y-full flex-col bg-black/70 p-1.5 text-[10px] text-white transition-transform group-hover:translate-y-0">
                      <span className="truncate font-bold">
                        {photo.uploaded_by || "Uploaded photo"}
                      </span>
                      <span>{new Date(photo.uploaded_at || 0).toLocaleDateString("en-GB")}</span>
                    </span>
                  </button>
                ))}
              </div>
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
      <Dialog open={!!gallery} onOpenChange={(open) => !open && setGallery(null)}>
        <DialogContent className="max-w-2xl overflow-hidden bg-black p-0 !inset-x-auto !left-1/2 !top-1/2 !bottom-auto !-translate-x-1/2 !-translate-y-1/2 !rounded-lg !w-[calc(100%-2rem)] !max-h-[calc(100dvh-2rem)]">
          {gallery && (
            <div className="relative flex flex-col items-center">
              <img
                src={
                  gallery.photos[gallery.index].full_url || gallery.photos[gallery.index].file_url
                }
                alt={
                  gallery.photos[gallery.index].type === "image_before"
                    ? "Before site photo"
                    : "After site photo"
                }
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="max-h-[70vh] w-full bg-black object-contain"
              />
              {gallery.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() =>
                      setGallery({
                        photos: gallery.photos,
                        index: (gallery.index - 1 + gallery.photos.length) % gallery.photos.length,
                      })
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-foreground transition-colors hover:bg-black/80"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() =>
                      setGallery({
                        photos: gallery.photos,
                        index: (gallery.index + 1) % gallery.photos.length,
                      })
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-foreground transition-colors hover:bg-black/80"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
              <div className="flex w-full flex-col gap-3 bg-card px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 truncate">
                  {gallery.photos[gallery.index].uploaded_by || "Uploaded photo"} ·{" "}
                  {new Date(gallery.photos[gallery.index].uploaded_at || 0).toLocaleDateString(
                    "en-GB",
                  )}
                  {gallery.photos.length > 1 && ` · ${gallery.index + 1}/${gallery.photos.length}`}
                </div>
                <a
                  href={
                    gallery.photos[gallery.index].full_url || gallery.photos[gallery.index].file_url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-center font-bold text-primary-foreground"
                >
                  Open full size
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
