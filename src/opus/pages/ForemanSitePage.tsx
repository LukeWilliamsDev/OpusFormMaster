import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { usePortal } from "../context/PortalContext";
import { ForemanJobNotesPanel } from "../components/ForemanJobNotesPanel";
import { ForemanTodaySiteUpdate } from "../components/ForemanTodaySiteUpdate";
import { PortalPageHeader, PortalTabRail } from "../components/PortalNavigationPrimitives";
import type { ScheduledShift, Worker } from "../types/erp";
import { compressImageFile } from "../lib/compressImage";
import { getSignedJobAttachmentUrl } from "../lib/attachmentUrl";
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
type ForemanAttachmentRow = AttachmentRow & { foreman_visible?: boolean };
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

type SiteSection = "work" | "files" | "shifts";

const SITE_SECTION_HASHES: Record<SiteSection, string> = {
  work: "site-work",
  files: "site-files",
  shifts: "site-shifts",
};

function siteSectionFromHash(hash: string): SiteSection {
  if (hash === "#site-shifts") return "shifts";
  if (hash === "#site-photos" || hash === "#site-documents" || hash === "#site-files") {
    return "files";
  }
  return "work";
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
  const navigate = useNavigate();
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
  const [photoUploadType, setPhotoUploadType] = useState<"image_before" | "image_after">(
    "image_after",
  );
  const siteContentLoadedRef = useRef(false);
  const [diaryRows, setDiaryRows] = useState<DiaryRow[]>([]);
  const [attachments, setAttachments] = useState<ForemanAttachmentRow[]>([]);
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  const [gallery, setGallery] = useState<{
    photos: ForemanAttachmentRow[];
    index: number;
  } | null>(null);
  const [activeSection, setActiveSection] = useState<SiteSection>(() =>
    siteSectionFromHash(location.hash),
  );
  const [documentViewer, setDocumentViewer] = useState<{
    name: string;
    url: string;
  } | null>(null);
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
  const shiftDates = useMemo(() => {
    const grouped = new Map<string, { total: number; mine: number }>();
    for (const shift of assignedShifts) {
      const current = grouped.get(shift.date) ?? { total: 0, mine: 0 };
      current.total += 1;
      if (shift.workerId === currentStaffId) current.mine += 1;
      grouped.set(shift.date, current);
    }
    return [...grouped.entries()]
      .map(([date, summary]) => ({ date, ...summary }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [assignedShifts, currentStaffId]);
  const nextShift = useMemo(
    () => shiftDates.find((shift) => shift.date >= today)?.date ?? shiftDates.at(-1)?.date,
    [shiftDates, today],
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

  useEffect(() => {
    setActiveSection(siteSectionFromHash(location.hash));
  }, [location.hash]);

  const selectSiteSection = (section: SiteSection) => {
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: `#${SITE_SECTION_HASHES[section]}`,
      },
      { replace: true },
    );
  };

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
          .select("id,job_id,type,file_name,file_url,file_size_bytes,uploaded_at,foreman_visible")
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
        const previewEntries = await Promise.all(
          nextAttachments.map(async (item) => {
            const previewUrl = await getSignedJobAttachmentUrl(item.file_url, 3600, {
              width: 1200,
              height: 900,
              quality: 78,
              resize: "contain",
            });
            return [item.file_url, previewUrl] as const;
          }),
        );
        setSignedUrls(
          new Map(previewEntries.filter((entry): entry is [string, string] => Boolean(entry[1]))),
        );
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

  const uploadPhoto = async (
    file: File,
    type: "image_before" | "image_after" = photoUploadType,
  ) => {
    if (!jobId) return;
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
          type,
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
      setSignedUrls((current) => new Map(current).set(localPath, previewUrl));
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
        type,
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
      <div role="status" aria-busy="true" className="portal-page-container space-y-6 py-8 lg:py-12">
        <span className="sr-only">Loading site record</span>
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-96 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }
  if (dataError)
    return (
      <div className="portal-page-container py-8 lg:py-12">
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
            Contact IT <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </section>
      </div>
    );
  }

  const imageAttachments = attachments.filter(
    (item) => item.type === "image_before" || item.type === "image_after",
  );
  const documentAttachments = attachments.filter(
    (item) => item.type === "document" && item.foreman_visible,
  );
  const galleryPhoto = gallery ? gallery.photos[gallery.index] : null;
  const galleryPreviewUrl = galleryPhoto ? signedUrls.get(galleryPhoto.file_url) : null;
  const openDocument = async (document: ForemanAttachmentRow) => {
    const url = await getSignedJobAttachmentUrl(document.file_url, 300);
    if (!url) {
      toast.error("This document could not be opened");
      return;
    }
    setDocumentViewer({ name: document.file_name, url });
  };
  return (
    <div className="portal-page-container space-y-6 py-6 pb-12 lg:py-10">
      <PortalPageHeader
        back={
          <Link
            to={listPath}
            className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to assigned sites
          </Link>
        }
        eyebrow="Assigned site"
        title={job.siteName}
        meta={
          <>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {job.postcode || "Postcode not provided"} · {job.jobRef}
            </span>
            <span className="mt-3 flex items-center gap-2 text-sm" aria-live="polite">
              <span
                className={`h-2 w-2 rounded-full ${dataRefreshError ? "bg-amber-500" : dataRefreshing || refreshingSite ? "animate-pulse bg-primary" : "bg-emerald-600"}`}
                aria-hidden="true"
              />
              {dataRefreshError
                ? dataRefreshError
                : dataRefreshing || refreshingSite
                  ? "Updating site record…"
                  : "Live updates enabled"}
            </span>
          </>
        }
        action={
          <span
            className={`w-fit rounded-lg border px-3 py-2 text-sm font-medium ${statusClasses(job.status)}`}
          >
            {statusLabel(job.status)}
          </span>
        }
      />
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
            <strong>Completed · updates view only</strong>
            <p className="mt-1 text-muted-foreground">
              Updates and shift history remain read-only. You can still add Before or After photos;
              photos cannot be deleted here.
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

      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur">
        <PortalTabRail
          ariaLabel="Site record sections"
          items={[
            { key: "work" as const, label: "Today" },
            {
              key: "files" as const,
              label: "Photos & files",
              count: imageAttachments.length + documentAttachments.length,
            },
            { key: "shifts" as const, label: "Shifts", count: shiftDates.length },
          ].map(({ key, label, count }) => ({
            label,
            count,
            active: activeSection === key,
            onSelect: () => selectSiteSection(key),
          }))}
        />
      </div>

      {activeSection === "work" && (
        <div id="site-work" className="scroll-mt-24 space-y-5">
          <div id="site-updates" className="space-y-5">
            <ForemanTodaySiteUpdate jobId={job.id} readOnly={readOnly} />
            <ForemanJobNotesPanel jobId={job.id} readOnly={readOnly} />
          </div>
        </div>
      )}

      {activeSection === "work" && (
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
          </section>
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex min-h-11 items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.14em]">
              <span>Site summary</span>
              <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
                Quick access
              </span>
            </div>
            <div className="mt-4 divide-y divide-border">
              <button
                type="button"
                onClick={() => selectSiteSection("work")}
                className="flex min-h-14 w-full items-center justify-between gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>
                  <span className="block text-sm font-bold">Today&apos;s update</span>
                  <span className="block text-xs text-muted-foreground">
                    {legacyDiaryRows.length ? "Latest update available" : "Not started"}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => selectSiteSection("files")}
                className="flex min-h-14 w-full items-center justify-between gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>
                  <span className="block text-sm font-bold">Site photos</span>
                  <span className="block text-xs text-muted-foreground">
                    {imageAttachments.length} photo{imageAttachments.length === 1 ? "" : "s"}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => selectSiteSection("shifts")}
                className="flex min-h-14 w-full items-center justify-between gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>
                  <span className="block text-sm font-bold">Site shifts</span>
                  <span className="block text-xs text-muted-foreground">
                    {shiftDates.length} scheduled date{shiftDates.length === 1 ? "" : "s"}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>
      )}

      {activeSection === "files" && (
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
            <>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadPhoto(file, photoUploadType);
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={uploading}
                  onClick={() => {
                    setPhotoUploadType("image_before");
                    photoInputRef.current?.click();
                  }}
                >
                  {uploading && photoUploadType === "image_before" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}{" "}
                  Add before
                </Button>
                <Button
                  className="min-h-11"
                  disabled={uploading}
                  onClick={() => {
                    setPhotoUploadType("image_after");
                    photoInputRef.current?.click();
                  }}
                >
                  {uploading && photoUploadType === "image_after" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}{" "}
                  Add after
                </Button>
              </div>
            </>
          </div>
          <div className="mt-4 rounded-xl border border-border bg-background p-3">
            <div className="flex min-h-11 items-center justify-between gap-3 px-2 text-xs font-black uppercase tracking-[0.14em]">
              <span>View-only gallery</span>
              <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
                Before and after photos
              </span>
            </div>
            {imageAttachments.length ? (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {imageAttachments.map((photo) => {
                  const previewUrl = signedUrls.get(photo.file_url);
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() =>
                        setGallery({
                          photos: imageAttachments,
                          index: imageAttachments.indexOf(photo),
                        })
                      }
                      className="group relative overflow-hidden rounded-xl border border-border bg-background text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`${photo.type === "image_before" ? "Before" : "After"} site photo`}
                    >
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt=""
                          loading="lazy"
                          className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="grid aspect-square place-items-center text-xs text-muted-foreground">
                          Preview unavailable
                        </div>
                      )}
                      <span className="absolute left-2 top-2 rounded bg-slate-900/80 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white">
                        {photo.type === "image_before" ? "Before" : "After"}
                      </span>
                    </button>
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
      )}

      <Dialog open={!!gallery} onOpenChange={(open) => !open && setGallery(null)}>
        <DialogContent className="max-w-2xl overflow-hidden bg-black p-0 !inset-x-auto !left-1/2 !top-1/2 !bottom-auto !-translate-x-1/2 !-translate-y-1/2 !rounded-lg !w-[calc(100%-2rem)] !max-h-[calc(100dvh-2rem)]">
          {gallery && (
            <div className="relative flex flex-col items-center">
              <DialogTitle className="sr-only">Site photo gallery</DialogTitle>
              <DialogDescription className="sr-only">
                View-only {gallery.index + 1} of {gallery.photos.length} site photos.
              </DialogDescription>
              {galleryPreviewUrl ? (
                <img
                  src={galleryPreviewUrl}
                  alt={
                    gallery.photos[gallery.index].type === "image_before"
                      ? "Before site photo"
                      : "After site photo"
                  }
                  className="max-h-[70vh] w-full bg-black object-contain"
                />
              ) : (
                <div className="flex h-64 w-full items-center justify-center bg-black text-sm text-white/70">
                  Preview unavailable
                </div>
              )}
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
                    className="absolute left-2 top-1/2 min-h-11 min-w-11 -translate-y-1/2 rounded-full bg-black/60 p-2.5 text-white hover:bg-black/80"
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
                    className="absolute right-2 top-1/2 min-h-11 min-w-11 -translate-y-1/2 rounded-full bg-black/60 p-2.5 text-white hover:bg-black/80"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
              <div className="flex w-full items-center justify-between gap-3 bg-card px-4 py-3 text-xs text-muted-foreground">
                <span className="font-bold text-foreground">
                  {gallery.photos[gallery.index].type === "image_before" ? "Before" : "After"}
                </span>
                <span>
                  {gallery.index + 1}/{gallery.photos.length} · View only
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {activeSection === "files" && (
        <section
          id="site-documents"
          className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <div className="flex min-h-11 items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.14em]">
            <span>Site documents</span>
            <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
              Shared by operations
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            View-only documents that operations has shared for this site.
          </p>
          {documentAttachments.length ? (
            <div className="mt-4 divide-y divide-border">
              {documentAttachments.map((document) => (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => void openDocument(document)}
                  className="flex min-h-16 w-full items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-sm">
                    ▤
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{document.file_name}</span>
                    <span className="block text-xs text-muted-foreground">
                      View only · Shared by operations
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-black uppercase tracking-wider text-primary">
                    View
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border px-5 py-8 text-center">
              <p className="text-sm text-muted-foreground">No site documents have been shared.</p>
            </div>
          )}
        </section>
      )}

      <Dialog open={!!documentViewer} onOpenChange={(open) => !open && setDocumentViewer(null)}>
        <DialogContent className="max-w-4xl overflow-hidden p-0">
          {documentViewer && (
            <div className="flex h-[80vh] flex-col">
              <DialogTitle className="border-b border-border px-5 py-4 text-sm font-bold">
                {documentViewer.name}
              </DialogTitle>
              <DialogDescription className="sr-only">
                View-only site document shared by operations.
              </DialogDescription>
              <iframe
                title={documentViewer.name}
                src={documentViewer.url}
                className="min-h-0 flex-1 bg-muted"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {activeSection === "work" && (
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
      )}

      {activeSection === "shifts" && (
        <section
          id="site-shifts"
          className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <div className="flex min-h-11 items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.14em]">
            <span>Site shifts</span>
            <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
              {shiftDates.length} date{shiftDates.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Assignments grouped by date for this site.
          </p>
          <div className="mt-5 divide-y divide-border">
            {shiftDates.map((shift) => (
              <div
                key={shift.date}
                className="flex min-h-14 items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm font-bold">{formatUKDate(shift.date)}</p>
                  <p className="text-xs text-muted-foreground">
                    {shift.mine ? "Your assignment" : "Assigned crew"} · {shift.total} crew
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${shift.date < today ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"}`}
                >
                  {shift.date < today ? "Past" : shift.date === today ? "Today" : "Upcoming"}
                </span>
              </div>
            ))}
            {!shiftDates.length && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No shifts are available for this site.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
