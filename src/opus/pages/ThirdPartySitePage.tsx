import React, { useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, FileUp, Send } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { usePortal } from "../context/PortalContext";
import { supabase } from "../../integrations/supabase/client";
import { ThirdPartyAttachmentsPanel } from "../components/ThirdPartyAttachmentsPanel";
import { ThirdPartyNotesPanel } from "../components/ThirdPartyNotesPanel";
import { getSignedJobAttachmentUrlsBatch } from "../lib/attachmentUrl";
import { formatUKDate, toLondonISODate } from "../utils/week";

const db = supabase as any;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const isCompletedJob = (job: any) =>
  ["completed", "complete", "closed"].includes(String(job.status).toLowerCase());
const statusLabel = (status: string) =>
  status.replace(/[-_]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());

export const ThirdPartySitePage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const location = useLocation();
  const { user, profile, workers, jobs, shifts, role, dataLoading } = usePortal();
  const [note, setNote] = useState("");
  const [postingNote, setPostingNote] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentRefresh, setAttachmentRefresh] = useState(0);
  const [photos, setPhotos] = useState<any[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [gallery, setGallery] = useState<{ photos: any[]; index: number } | null>(null);
  const ownedWorkerIds = useMemo(() => new Set(workers.map((worker) => worker.id)), [workers]);
  const job = jobs.find(
    (item) =>
      item.id === jobId &&
      shifts.some((shift) => shift.jobId === item.id && ownedWorkerIds.has(shift.workerId)),
  );
  const sitesListPath = `/portal/third-party/sites${location.search}`;

  React.useEffect(() => {
    if (!jobId || !user) return;
    let cancelled = false;
    const loadPhotos = async () => {
      setPhotosLoading(true);
      const { data, error } = await db
        .from("job_attachments")
        .select("id, file_name, file_url, type, uploaded_at, uploaded_by")
        .eq("job_id", jobId)
        .in("type", ["image_before", "image_after"])
        .order("uploaded_at", { ascending: false });
      if (error) {
        setPhotosLoading(false);
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
      if (!cancelled) {
        setPhotos(withPreviews);
        setPhotosLoading(false);
      }
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

  if (dataLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:py-12">
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }
  if (!job) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <Link to={sitesListPath} className="text-sm font-bold text-primary">
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
  const readOnlyHistory = role === "third_party" && isCompletedJob(job);
  const shiftDates = shifts
    .filter((shift) => shift.jobId === job.id && shift.date)
    .map((shift) => shift.date)
    .sort();
  const today = toLondonISODate();
  const pastShiftDates = shiftDates.filter((date) => date <= today);
  const siteDate = isCompletedJob(job)
    ? (pastShiftDates.at(-1) ?? shiftDates[0])
    : (shiftDates.find((date) => date >= today) ?? shiftDates.at(-1));
  const siteDateLabel = isCompletedJob(job) ? "Last shift" : "Next shift";
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
  const uploadAttachment = async (file: File) => {
    if (!user) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      return toast.error("Attachments must be 10 MB or smaller");
    }
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
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:py-12">
      <Link
        to={sitesListPath}
        className="inline-flex items-center gap-2 text-xs font-bold text-primary"
      >
        <ArrowLeft className="h-3 w-3" />
        Assigned sites
      </Link>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Assigned site
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">
            {job.siteName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{job.postcode}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
              {statusLabel(job.status)}
            </span>
            {siteDate && (
              <span className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
                {siteDateLabel} · {formatUKDate(siteDate)}
              </span>
            )}
            <span className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
              {job.currentPours} pours
            </span>
          </div>
        </div>
      </header>
      {readOnlyHistory && (
        <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          Completed sites are view-only. Photos, attachments, and conversation history remain
          available.
        </p>
      )}
      <section className="rounded-2xl border-2 border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              Assigned staff
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
            {assignedStaff.length} assigned
          </span>
        </div>
        {assignedStaff.length > 0 ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {assignedStaff.map((worker) => (
              <div
                key={worker.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">
                  {worker.name?.slice(0, 1).toUpperCase() || "?"}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-foreground">{worker.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{worker.role}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            No approved staff are assigned to this site.
          </p>
        )}
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border-2 border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                Site photos
              </p>
              <p className="mt-1 text-xs text-muted-foreground">View-only photos.</p>
            </div>
            <button
              type="button"
              onClick={() => photos[0] && setGallery({ photos, index: 0 })}
              disabled={photosLoading || !photos.length}
              className="rounded-lg border border-border px-3 py-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
            >
              View gallery
            </button>
          </div>
          {photosLoading ? (
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="aspect-[4/3] animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No site photos have been uploaded yet.
            </p>
          ) : (
            <div className="mt-5 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(120px,1fr))]">
              {photos.slice(0, 6).map((photo) => (
                <button
                  key={photo.id ?? photo.file_url}
                  onClick={() => setGallery({ photos, index: photos.indexOf(photo) })}
                  className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-card text-left"
                >
                  {photo.preview_url ? (
                    <img
                      src={photo.preview_url}
                      alt={photo.type === "image_before" ? "Before site photo" : "After site photo"}
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
                </button>
              ))}
            </div>
          )}
        </section>
        {!readOnlyHistory && (
          <section className="rounded-2xl border-2 border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Add a note
                </p>
              </div>
            </div>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Write a note…"
              className="mt-5 min-h-24 w-full rounded-xl border border-border bg-background p-4 text-sm"
            />
            <button
              onClick={addNote}
              disabled={postingNote || !note.trim()}
              className="mt-3 flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-xs font-black text-primary-foreground disabled:opacity-50"
            >
              <Send className="h-3 w-3" /> Add note
            </button>
          </section>
        )}
      </div>
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              Your conversation
            </p>
          </div>
        </div>
        <ThirdPartyNotesPanel jobId={job.id} showHeading={false} readOnly={readOnlyHistory} />
      </section>
      <ThirdPartyAttachmentsPanel
        jobId={job.id}
        refreshKey={attachmentRefresh}
        readOnly={readOnlyHistory}
        action={
          !readOnlyHistory ? (
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
          ) : null
        }
      />
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
