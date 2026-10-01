import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  MapPin,
  MessageSquareText,
  Paperclip,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { usePortal } from "../context/PortalContext";
import { ForemanJobNotesPanel } from "../components/ForemanJobNotesPanel";
import { ForemanTodaySiteUpdate } from "../components/ForemanTodaySiteUpdate";
import type { ScheduledShift, Worker } from "../types/erp";
import { compressImageFile } from "../lib/compressImage";
import { getSignedJobAttachmentUrl, getSignedJobAttachmentUrlsBatch } from "../lib/attachmentUrl";
import { formatUKDate, toLondonISODate } from "../utils/week";

type DiaryRow = Pick<
  Database["public"]["Tables"]["job_diary"]["Row"],
  | "id"
  | "job_id"
  | "date"
  | "notes"
  | "work_summary"
  | "blocker_details"
  | "next_steps"
  | "updated_at"
>;
type AttachmentRow = Pick<
  Database["public"]["Tables"]["job_attachments"]["Row"],
  "id" | "job_id" | "type" | "file_name" | "file_url" | "file_size_bytes" | "uploaded_at"
>;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

function londonToday(): string {
  return toLondonISODate();
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function statusLabel(status: string): string {
  if (["completed", "complete", "closed"].includes(status.toLowerCase().trim())) return "Completed";
  if (status === "in-progress" || status === "active") return "In progress";
  if (status === "on-hold") return "Blocked";
  return "Ready to start";
}

function statusClasses(status: string): string {
  if (["completed", "complete", "closed"].includes(status.toLowerCase().trim()))
    return "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-400/20 dark:text-emerald-100 dark:ring-emerald-400/30";
  if (status === "in-progress" || status === "active")
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function isCompletedStatus(status: string): boolean {
  return ["completed", "complete", "closed"].includes(status.toLowerCase().trim());
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function diarySummary(entry: DiaryRow): string {
  return (
    entry.work_summary?.trim() ||
    entry.blocker_details?.trim() ||
    entry.next_steps?.trim() ||
    entry.notes?.trim() ||
    "Daily update submitted."
  );
}

function assignedWorkers(
  jobId: string,
  shifts: ScheduledShift[],
  workers: Worker[],
  date?: string,
) {
  const ids = new Set(
    shifts
      .filter((shift) => shift.jobId === jobId && (!date || shift.date === date))
      .map((shift) => shift.workerId),
  );
  return workers.filter((worker) => ids.has(worker.id) && !worker.isArchived);
}

export const ForemanSitePage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const location = useLocation();
  const {
    user,
    profile,
    currentStaffId,
    workers,
    jobs,
    shifts,
    dataLoading,
    dataRefreshing,
    dataRefreshError,
    dataError,
    reloadPortalData,
  } = usePortal();
  const today = londonToday();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const siteContentLoadedRef = useRef(false);
  const [diaryRows, setDiaryRows] = useState<DiaryRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [signedUrls, setSignedUrls] = useState<
    Map<string, { fullUrl: string | null; thumbUrl: string | null }>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [refreshingSite, setRefreshingSite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const job = jobs.find((candidate) => candidate.id === jobId) ?? null;
  const assignedShifts = useMemo(
    () => shifts.filter((shift) => shift.jobId === jobId && shift.workerId),
    [jobId, shifts],
  );
  const hasCurrentAssignment = Boolean(
    currentStaffId &&
    assignedShifts.some(
      (shift) =>
        shift.workerId === currentStaffId &&
        (shift.date >= today || (job ? isCompletedStatus(job.status) : false)),
    ),
  );
  const nextShift = useMemo(
    () =>
      assignedShifts
        .map((shift) => shift.date)
        .filter((date) => date >= today)
        .sort()[0] ??
      assignedShifts
        .map((shift) => shift.date)
        .sort()
        .at(-1),
    [assignedShifts, today],
  );
  const crew = useMemo(
    () => assignedWorkers(jobId ?? "", shifts, workers, nextShift),
    [jobId, nextShift, shifts, workers],
  );
  const readOnly = job ? isCompletedStatus(job.status) : false;
  const legacyDiaryRows = diaryRows.filter(
    (entry) => !entry.work_summary && !entry.blocker_details && !entry.next_steps,
  );
  const listPath = `/portal/foreman/sites${location.search}`;
  const isLocalFixture = Boolean(jobId?.startsWith("local-foreman-"));

  const loadSiteContent = useCallback(async () => {
    if (!jobId || !hasCurrentAssignment) {
      setDiaryRows([]);
      setAttachments([]);
      setSignedUrls(new Map());
      setError(null);
      siteContentLoadedRef.current = true;
      return;
    }
    const initialLoad = !siteContentLoadedRef.current;
    if (initialLoad) setLoading(true);
    else setRefreshingSite(true);
    setError(null);
    try {
      if (isLocalFixture) {
        setDiaryRows([
          {
            id: `${jobId}-diary`,
            job_id: jobId,
            date: today,
            notes: "Pour 2 complete. No blockers reported.",
            work_summary: null,
            blocker_details: null,
            next_steps: null,
            updated_at: new Date().toISOString(),
          },
        ]);
        const baseLocalAttachments: AttachmentRow[] = [
          {
            id: `${jobId}-photo-1`,
            job_id: jobId,
            type: "image_after",
            file_name: "site-progress-1.jpg",
            file_url: "",
            file_size_bytes: 0,
            uploaded_at: new Date().toISOString(),
          },
          {
            id: `${jobId}-photo-2`,
            job_id: jobId,
            type: "image_after",
            file_name: "site-progress-2.jpg",
            file_url: "",
            file_size_bytes: 0,
            uploaded_at: new Date().toISOString(),
          },
        ];
        let storedLocalPhotos: string[] = [];
        try {
          const stored = JSON.parse(
            localStorage.getItem(`foreman-fixture-photos-${jobId}`) ?? "[]",
          );
          storedLocalPhotos = Array.isArray(stored)
            ? stored.filter((item): item is string => typeof item === "string")
            : [];
        } catch {
          storedLocalPhotos = [];
        }
        setAttachments([
          ...storedLocalPhotos.map((fileName, index) => ({
            id: `${jobId}-stored-photo-${index}`,
            job_id: jobId,
            type: "image_after",
            file_name: fileName,
            file_url: `local-fixture/${jobId}/${index}-${fileName}`,
            file_size_bytes: 0,
            uploaded_at: new Date().toISOString(),
          })),
          ...baseLocalAttachments,
        ]);
        return;
      }
      const [diaryResult, attachmentResult] = await Promise.all([
        supabase
          .from("job_diary")
          .select("id,job_id,date,notes,work_summary,blocker_details,next_steps,updated_at")
          .eq("job_id", jobId)
          .order("updated_at", { ascending: false }),
        supabase
          .from("job_attachments")
          .select("id,job_id,type,file_name,file_url,file_size_bytes,uploaded_at")
          .eq("job_id", jobId)
          .order("uploaded_at", { ascending: false }),
      ]);
      if (diaryResult.error || attachmentResult.error) {
        setError(
          diaryResult.error?.message ??
            attachmentResult.error?.message ??
            "Site details could not be loaded.",
        );
      } else {
        setDiaryRows(diaryResult.data ?? []);
        const nextAttachments = attachmentResult.data ?? [];
        setAttachments(nextAttachments);
        const imageUrls = await getSignedJobAttachmentUrlsBatch(
          nextAttachments
            .filter((item) => item.type === "image_before" || item.type === "image_after")
            .map((item) => item.file_url),
        );
        setSignedUrls(imageUrls);
      }
    } catch (loadError) {
      console.error("Failed to load Foreman site content", loadError);
      setError("Site details could not be loaded. Try again.");
    } finally {
      setLoading(false);
      setRefreshingSite(false);
      siteContentLoadedRef.current = true;
    }
  }, [hasCurrentAssignment, isLocalFixture, jobId, today]);

  useEffect(() => {
    siteContentLoadedRef.current = false;
    setDiaryRows([]);
    setAttachments([]);
    setSignedUrls(new Map());
    setLoading(true);
  }, [jobId]);

  useEffect(() => {
    void loadSiteContent();
  }, [loadSiteContent]);

  useEffect(() => {
    if (!hasCurrentAssignment) {
      setDiaryRows([]);
      setAttachments([]);
      setSignedUrls(new Map());
    }
  }, [hasCurrentAssignment]);

  const uploadPhoto = async (file: File) => {
    if (!jobId || readOnly) return;
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Photos must be 10MB or smaller");
      return;
    }
    if (isLocalFixture) {
      const localPath = `local-fixture/${Date.now()}-${file.name}`;
      const previewUrl = URL.createObjectURL(file);
      setAttachments((current) => [
        {
          id: localPath,
          job_id: jobId,
          type: "image_after",
          file_name: file.name,
          file_url: localPath,
          file_size_bytes: file.size,
          uploaded_at: new Date().toISOString(),
        },
        ...current,
      ]);
      try {
        const key = `foreman-fixture-photos-${jobId}`;
        const stored = JSON.parse(localStorage.getItem(key) ?? "[]");
        localStorage.setItem(
          key,
          JSON.stringify([...(Array.isArray(stored) ? stored : []), file.name]),
        );
      } catch {
        // The in-memory fixture remains usable if storage is unavailable.
      }
      setSignedUrls((current) =>
        new Map(current).set(localPath, { fullUrl: previewUrl, thumbUrl: previewUrl }),
      );
      toast.success("Local test photo added");
      if (photoInputRef.current) photoInputRef.current.value = "";
      return;
    }
    setUploading(true);
    let uploadedPath: string | null = null;
    try {
      const compressed = await compressImageFile(file);
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      uploadedPath = `jobs/${jobId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("job-attachments")
        .upload(uploadedPath, compressed, { upsert: false });
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from("job_attachments").insert({
        job_id: jobId,
        type: "image_after",
        file_name: file.name,
        file_url: uploadedPath,
        file_size_bytes: compressed.size,
        uploaded_by: profile?.full_name || "Site foreman",
      });
      if (insertError) throw insertError;
      await loadSiteContent();
      toast.success("Site photo uploaded");
    } catch (uploadError) {
      console.error("Failed to upload Foreman site photo", uploadError);
      if (uploadedPath) await supabase.storage.from("job-attachments").remove([uploadedPath]);
      toast.error("The site photo could not be uploaded");
    } finally {
      setUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  if (dataLoading || loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-12"
      >
        <span className="sr-only">Loading site record</span>
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-96 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }
  if (dataError)
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-card p-8 text-center"
        >
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">{dataError}</p>
          <Button variant="outline" className="mt-4 min-h-11" onClick={reloadPortalData}>
            Retry
          </Button>
        </div>
      </div>
    );
  if (!job || !hasCurrentAssignment) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <Link
          to={listPath}
          className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to assigned sites
        </Link>
        <section className="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-bold">This site is not available</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            It may have been reassigned or is no longer in your current schedule.
          </p>
          <Link
            to="/portal/contact"
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase tracking-widest text-primary"
          >
            Contact operations <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </section>
      </div>
    );
  }

  const imageAttachments = attachments.filter(
    (item) => item.type === "image_before" || item.type === "image_after",
  );
  const fileAttachments = attachments.filter(
    (item) => item.type !== "image_before" && item.type !== "image_after",
  );
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 pb-12 sm:px-6 lg:py-10">
      <Link
        to={listPath}
        className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to assigned sites
      </Link>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Assigned site
          </p>
          <h1 className="mt-2 break-words text-3xl font-black tracking-tight text-foreground">
            {job.siteName}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" aria-hidden="true" />{" "}
            {job.postcode || "Postcode not provided"} · {job.jobRef}
          </p>
          <p
            className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"
            aria-live="polite"
          >
            <span
              className={`h-2 w-2 rounded-full ${dataRefreshError ? "bg-amber-500" : dataRefreshing || refreshingSite ? "animate-pulse bg-primary" : "bg-emerald-600"}`}
              aria-hidden="true"
            />
            {dataRefreshError
              ? dataRefreshError
              : dataRefreshing || refreshingSite
                ? "Updating site record…"
                : "Live updates enabled"}
          </p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wider ${statusClasses(job.status)}`}
        >
          {statusLabel(job.status)}
        </span>
      </header>
      {readOnly && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-950/30 dark:text-emerald-100"
        >
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300"
            aria-hidden="true"
          />
          <div>
            <strong>Completed · view only</strong>
            <p className="mt-1 text-muted-foreground">
              Photos, updates, files, and shift history remain available. New changes are closed.
            </p>
          </div>
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center"
        >
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" className="min-h-11" onClick={() => void loadSiteContent()}>
            Retry site record
          </Button>
        </div>
      )}

      <div id="site-updates" className="scroll-mt-24 space-y-5">
        <ForemanTodaySiteUpdate jobId={job.id} readOnly={readOnly} />
        <ForemanJobNotesPanel jobId={job.id} readOnly={readOnly} />
      </div>

      <div
        id="site-overview"
        className="scroll-mt-24 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)]"
      >
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex min-h-11 items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.14em]">
            <span>Assigned crew</span>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-black text-muted-foreground">
              {crew.length} assigned
            </span>
          </div>
          {crew.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {crew.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-xl bg-background p-3"
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-black"
                    aria-hidden="true"
                  >
                    {initials(member.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No crew is listed for this site.</p>
          )}
          <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
            <a
              href="#site-updates"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <MessageSquareText className="h-4 w-4" /> View updates
            </a>
            <a
              href="#site-photos"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Camera className="h-4 w-4" /> View photos
            </a>
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xs font-black uppercase tracking-[0.14em]">Next shift</h2>
          <p className="mt-4 text-xl font-black">
            {nextShift ? formatUKDate(nextShift) : "No shift date"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {assignedShifts.length} assignment{assignedShifts.length === 1 ? "" : "s"} linked to
            this site
          </p>
          <div className="mt-5 rounded-xl bg-secondary p-3 text-sm text-muted-foreground">
            Contact operations for questions or blockers. Photos and files keep the authorised site
            record together.
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="text-xs font-black uppercase tracking-[0.14em]">Before you start</h3>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Shift times</dt>
                <dd className="font-semibold text-foreground">Not provided</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Site contact</dt>
                <dd className="font-semibold text-foreground">Not provided</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Access information</dt>
                <dd className="font-semibold text-foreground">Not provided</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Contact operations if any of this information is needed for the shift.
            </p>
          </div>
        </section>
      </div>

      <section
        id="site-photos"
        className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.14em]">Site photos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {imageAttachments.length} photo{imageAttachments.length === 1 ? "" : "s"} authorised
              for this assigned site.
            </p>
          </div>
          {!readOnly && (
            <>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadPhoto(file);
                }}
              />
              <Button
                className="min-h-11"
                disabled={uploading}
                onClick={() => photoInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}{" "}
                {uploading ? "Uploading..." : "Add photo"}
              </Button>
            </>
          )}
        </div>
        <div className="mt-4 rounded-xl border border-border bg-background p-3">
          <div className="flex min-h-11 items-center justify-between gap-3 px-2 text-xs font-black uppercase tracking-[0.14em]">
            <span>View photos</span>
            <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
              {imageAttachments.length ? "Available on this record" : "No photos yet"}
            </span>
          </div>
          {imageAttachments.length ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {imageAttachments.map((photo) => {
                const urls = signedUrls.get(photo.file_url);
                const card = (
                  <>
                    {urls?.thumbUrl ? (
                      <img
                        src={urls.thumbUrl}
                        alt={photo.file_name}
                        loading="lazy"
                        className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid aspect-square place-items-center text-xs text-muted-foreground">
                        Preview unavailable
                      </div>
                    )}
                    <p className="truncate px-2 py-2 text-xs text-muted-foreground">
                      {photo.file_name}
                    </p>
                  </>
                );
                return urls?.fullUrl ? (
                  <a
                    key={photo.id}
                    href={urls.fullUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group overflow-hidden rounded-xl border border-border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {card}
                  </a>
                ) : (
                  <div
                    key={photo.id}
                    className="overflow-hidden rounded-xl border border-border bg-background"
                  >
                    {card}
                    <p className="border-t border-border px-2 py-2 text-xs text-muted-foreground">
                      Preview unavailable
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-border px-5 py-10 text-center">
              <Camera className="mx-auto h-7 w-7 text-muted-foreground/60" aria-hidden="true" />
              <p className="mt-3 text-sm text-muted-foreground">No site photos yet.</p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex min-h-11 items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.14em]">
          <span>Previous updates</span>
          <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
            {legacyDiaryRows.length} older record{legacyDiaryRows.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Older diary records retained for reference. New updates appear in Today&apos;s site
          update.
        </p>
        {legacyDiaryRows.length ? (
          <div className="mt-5 divide-y divide-border">
            {legacyDiaryRows.map((entry) => (
              <article key={entry.id} className="flex gap-3 py-4 first:pt-0">
                <span
                  className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="break-words whitespace-pre-line text-sm leading-6">
                    {diarySummary(entry)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatUKDate(entry.date)}
                    {entry.updated_at
                      ? ` · updated ${new Date(entry.updated_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
                      : ""}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
            No previous updates are available.
          </p>
        )}
      </section>

      <section
        id="site-files"
        className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <div className="flex min-h-11 items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.14em]">
          <span>Site files</span>
          <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
            {fileAttachments.length} file{fileAttachments.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Files authorised for this assigned site.
        </p>
        {fileAttachments.length ? (
          <div className="mt-5 divide-y divide-border">
            {fileAttachments.map((file) => (
              <button
                key={file.id}
                type="button"
                className="flex min-h-16 w-full items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={async () => {
                  const url = await getSignedJobAttachmentUrl(file.file_url, 300);
                  if (url) window.open(url, "_blank", "noopener,noreferrer");
                  else toast.error("This file could not be opened");
                }}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary">
                  <Paperclip className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{file.file_name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatBytes(file.file_size_bytes)} · Site file
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-border px-5 py-10 text-center">
            <Paperclip className="mx-auto h-7 w-7 text-muted-foreground/60" aria-hidden="true" />
            <p className="mt-3 text-sm text-muted-foreground">No site files yet.</p>
          </div>
        )}
      </section>

      <section
        id="site-shifts"
        className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <div className="flex min-h-11 items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.14em]">
          <span>Site shifts</span>
          <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
            {assignedShifts.length} shift{assignedShifts.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Assignments linked to this site and your staff record.
        </p>
        <div className="mt-5 divide-y divide-border">
          {assignedShifts.map((shift) => (
            <div key={shift.id} className="flex min-h-14 items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-bold">{formatUKDate(shift.date)}</p>
                <p className="text-xs text-muted-foreground">
                  {shift.workerId === currentStaffId ? "Your assignment" : "Assigned crew"}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${shift.date < today ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"}`}
              >
                {shift.date < today ? "Past" : shift.date === today ? "Today" : "Upcoming"}
              </span>
            </div>
          ))}
          {!assignedShifts.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No shifts are available for this site.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};
