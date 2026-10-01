import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Camera,
  ClipboardCheck,
  Clock3,
  FileText,
  Loader2,
  MapPin,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { compressImageFile } from "../lib/compressImage";
import { usePortal } from "../context/PortalContext";
import type { Job, ScheduledShift, Worker } from "../types/erp";

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
  | "entry_status"
  | "progress_status"
  | "submitted_at"
>;

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const LOCAL_FOREMAN_JOB_PREFIX = "local-foreman-";

function londonToday(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatUKDate(date: string): string {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function diarySummary(row: DiaryRow): string {
  return (
    row.work_summary?.trim() ||
    row.blocker_details?.trim() ||
    row.next_steps?.trim() ||
    row.notes?.trim() ||
    "Daily update submitted."
  );
}

function displayRole(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function statusLabel(status: Job["status"]): string {
  if (status === "in-progress" || status === "active") return "In progress";
  if (isCompletedStatus(status)) return "Completed";
  if (status === "on-hold") return "Blocked";
  return "Ready to start";
}

function statusClasses(status: Job["status"]): string {
  if (status === "in-progress" || status === "active") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (isCompletedStatus(status))
    return "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-400/20 dark:text-emerald-100 dark:ring-emerald-400/30";
  return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function isCompletedStatus(status: string): boolean {
  return ["completed", "complete", "closed"].includes(status.toLowerCase().trim());
}

function shiftDateForJob(jobId: string, shifts: ScheduledShift[], today: string): string | null {
  const dates = shifts
    .filter((shift) => shift.jobId === jobId)
    .map((shift) => shift.date)
    .sort();
  return dates.find((date) => date >= today) ?? dates[dates.length - 1] ?? null;
}

function londonGreeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function assignedWorkersForJob(
  jobId: string,
  shifts: ScheduledShift[],
  workers: Worker[],
  date?: string,
): Worker[] {
  const matchingShifts = shifts.filter(
    (shift) => shift.jobId === jobId && (!date || shift.date === date),
  );
  const ids = new Set(matchingShifts.map((shift) => shift.workerId));
  return workers.filter((worker) => ids.has(worker.id) && !worker.isArchived);
}

export const ForemanWorkspacePage: React.FC = () => {
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
  const siteDataLoadedRef = useRef(false);
  const [diaryRows, setDiaryRows] = useState<DiaryRow[]>([]);
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});
  const [loadingSiteData, setLoadingSiteData] = useState(false);
  const [siteDataError, setSiteDataError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const myWorkerIds = useMemo(
    () => (currentStaffId ? new Set([currentStaffId]) : new Set<string>()),
    [currentStaffId],
  );

  const myShifts = useMemo(
    () =>
      shifts
        .filter((shift) => myWorkerIds.has(shift.workerId))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [myWorkerIds, shifts],
  );

  const assignedJobIds = useMemo(
    () => Array.from(new Set(myShifts.map((shift) => shift.jobId))),
    [myShifts],
  );

  const assignedJobs = useMemo(
    () => jobs.filter((job) => assignedJobIds.includes(job.id)),
    [assignedJobIds, jobs],
  );

  const todayShifts = useMemo(
    () => myShifts.filter((shift) => shift.date === today),
    [myShifts, today],
  );
  const todayJobIds = useMemo(
    () => Array.from(new Set(todayShifts.map((shift) => shift.jobId))),
    [todayShifts],
  );
  const [selectedTodayJobId, setSelectedTodayJobId] = useState<string | null>(null);

  useEffect(() => {
    if (todayJobIds.length === 0) {
      setSelectedTodayJobId(null);
    } else if (!selectedTodayJobId || !todayJobIds.includes(selectedTodayJobId)) {
      setSelectedTodayJobId(todayJobIds[0]);
    }
  }, [selectedTodayJobId, todayJobIds]);

  const currentJob = useMemo(
    () => assignedJobs.find((job) => job.id === selectedTodayJobId) ?? null,
    [assignedJobs, selectedTodayJobId],
  );

  const currentJobDate = currentJob ? shiftDateForJob(currentJob.id, myShifts, today) : null;
  const currentCrew = currentJob
    ? assignedWorkersForJob(currentJob.id, shifts, workers, currentJobDate ?? today)
    : [];
  const currentTodayDiary = currentJob
    ? diaryRows.find((row) => row.job_id === currentJob.id && row.date === today)
    : undefined;

  const recentDiary = useMemo(
    () => diaryRows.filter((row) => diarySummary(row).trim()).slice(0, 4),
    [diaryRows],
  );

  const loadSiteData = async () => {
    if (assignedJobIds.length === 0) {
      setDiaryRows([]);
      setPhotoCounts({});
      setSiteDataError(null);
      siteDataLoadedRef.current = true;
      return;
    }

    const initialSiteDataLoad = !siteDataLoadedRef.current;
    setLoadingSiteData(true);
    setSiteDataError(null);
    if (initialSiteDataLoad) {
      setDiaryRows([]);
      setPhotoCounts({});
    }
    const localJobIds = assignedJobIds.filter((jobId) =>
      jobId.startsWith(LOCAL_FOREMAN_JOB_PREFIX),
    );
    if (import.meta.env.DEV && localJobIds.length > 0) {
      setDiaryRows(
        localJobIds.map((jobId) => ({
          id: `${jobId}-diary`,
          job_id: jobId,
          date: today,
          notes: "Local-only fixture: pour 2 complete. No blockers reported.",
          work_summary: "Pour 2 complete. No blockers reported.",
          blocker_details: null,
          next_steps: null,
          updated_at: new Date().toISOString(),
          entry_status: "submitted",
          progress_status: "on_track",
          submitted_at: new Date().toISOString(),
        })),
      );
      setPhotoCounts(
        Object.fromEntries(
          localJobIds.map((jobId) => {
            try {
              const stored = JSON.parse(
                localStorage.getItem(`foreman-fixture-photos-${jobId}`) ?? "[]",
              );
              return [jobId, 2 + (Array.isArray(stored) ? stored.length : 0)];
            } catch {
              return [jobId, 2];
            }
          }),
        ),
      );
      setLoadingSiteData(false);
      siteDataLoadedRef.current = true;
      return;
    }
    const [diaryResult, attachmentResult] = await Promise.all([
      supabase
        .from("job_diary")
        .select(
          "id,job_id,date,notes,work_summary,blocker_details,next_steps,updated_at,entry_status,progress_status,submitted_at",
        )
        .in("job_id", assignedJobIds)
        .order("updated_at", { ascending: false }),
      supabase.from("job_attachments").select("job_id").in("job_id", assignedJobIds),
    ]);

    if (diaryResult.error) {
      console.error("Failed to load assigned site diary", diaryResult.error);
      setSiteDataError("Assigned site updates could not be loaded.");
    } else {
      setDiaryRows(diaryResult.data ?? []);
    }

    if (attachmentResult.error) {
      console.error("Failed to load assigned site attachments", attachmentResult.error);
      setSiteDataError((previous) => previous ?? "Site files could not be loaded.");
    } else {
      const counts: Record<string, number> = {};
      for (const row of attachmentResult.data ?? []) {
        counts[row.job_id] = (counts[row.job_id] ?? 0) + 1;
      }
      setPhotoCounts(counts);
    }
    setLoadingSiteData(false);
    siteDataLoadedRef.current = true;
  };

  useEffect(() => {
    loadSiteData();
    // The job/shift context is already tenant- and role-scoped by Supabase RLS.
    // Re-run when the assigned set changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedJobIds.join(","), user?.id]);

  useEffect(() => {
    if (
      !user ||
      assignedJobIds.length === 0 ||
      assignedJobIds.some((jobId) => jobId.startsWith(LOCAL_FOREMAN_JOB_PREFIX))
    )
      return;
    const channels = assignedJobIds.map((jobId) =>
      supabase
        .channel(`foreman-site-workspace-${user.id}-${jobId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "job_diary", filter: `job_id=eq.${jobId}` },
          loadSiteData,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "job_attachments", filter: `job_id=eq.${jobId}` },
          loadSiteData,
        )
        .subscribe(),
    );
    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedJobIds.join(","), user?.id]);

  const uploadPhoto = async (file: File) => {
    if (!currentJob) return;
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Photos must be 10MB or smaller");
      return;
    }

    if (import.meta.env.DEV && currentJob.id.startsWith(LOCAL_FOREMAN_JOB_PREFIX)) {
      setPhotoCounts((previous) => ({
        ...previous,
        [currentJob.id]: (previous[currentJob.id] ?? 0) + 1,
      }));
      toast.success("Local test photo added");
      if (photoInputRef.current) photoInputRef.current.value = "";
      return;
    }

    setUploadingPhoto(true);
    let uploadedPath: string | null = null;
    try {
      const compressed = await compressImageFile(file);
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `jobs/${currentJob.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("job-attachments")
        .upload(filePath, compressed, { upsert: false });
      if (uploadError) throw uploadError;
      uploadedPath = filePath;

      const { error: insertError } = await supabase.from("job_attachments").insert({
        job_id: currentJob.id,
        type: "image_after",
        file_name: file.name,
        // Store the private object path; readers obtain short-lived signed URLs.
        file_url: filePath,
        file_size_bytes: compressed.size,
        uploaded_by: profile?.full_name || user?.email || "Site foreman",
      });
      if (insertError) throw insertError;

      toast.success("Site photo uploaded");
      await loadSiteData();
    } catch (error) {
      console.error("Failed to upload site photo", error);
      if (uploadedPath) {
        await supabase.storage.from("job-attachments").remove([uploadedPath]);
      }
      toast.error("The site photo could not be uploaded");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const displayName = profile?.full_name?.split(" ")[0] || "there";
  const greeting = londonGreeting();
  const currentSiteIsReadOnly = currentJob ? isCompletedStatus(currentJob.status) : false;
  const upcomingSiteList = useMemo(() => {
    const nextDates = new Map<string, string>();
    for (const shift of myShifts) {
      if (shift.date <= today || nextDates.has(shift.jobId)) continue;
      nextDates.set(shift.jobId, shift.date);
    }
    return [...assignedJobs]
      .filter((job) => nextDates.has(job.id))
      .sort((a, b) => (nextDates.get(a.id) ?? "").localeCompare(nextDates.get(b.id) ?? ""));
  }, [assignedJobs, myShifts, today]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:space-y-6 lg:py-10 2xl:max-w-[1700px] animate-fade-in">
      <header className="flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Site foreman workspace
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground lg:text-4xl">
            {greeting}, {displayName}.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatUKDate(today)} · Open today&apos;s site to see the work, photos, site log, and
            operations conversation.
          </p>
          <p
            className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"
            aria-live="polite"
          >
            <span
              className={`h-2 w-2 rounded-full ${dataRefreshError ? "bg-amber-500" : dataRefreshing ? "animate-pulse bg-primary" : "bg-emerald-600"}`}
              aria-hidden="true"
            />
            {dataRefreshError
              ? dataRefreshError
              : dataRefreshing
                ? "Updating assignments…"
                : "Live updates enabled"}
          </p>
        </div>
      </header>

      {dataLoading ? (
        <div
          role="status"
          aria-busy="true"
          className="flex min-h-56 items-center justify-center rounded-2xl border border-border bg-card"
        >
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading assigned sites...</span>
        </div>
      ) : dataError ? (
        <section
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-card px-6 py-16 text-center"
        >
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <h2 className="text-lg font-bold text-foreground">Assigned sites could not be loaded</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{dataError}</p>
          <Button variant="outline" className="mt-5" onClick={reloadPortalData}>
            Retry
          </Button>
        </section>
      ) : myWorkerIds.size === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <Users className="mx-auto mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-lg font-bold text-foreground">Your staff record is not linked yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Ask logistics to link your portal email to your staff record before assigning site work.
          </p>
        </section>
      ) : assignedJobs.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <CalendarDays className="mx-auto mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-lg font-bold text-foreground">No assigned sites yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Assigned sites will appear here when logistics adds you to a shift.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link to="/portal/my-shifts">View assigned shifts</Link>
          </Button>
        </section>
      ) : (
        <>
          <section className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,.85fr)]">
            <article className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xs font-black uppercase tracking-[0.14em] text-foreground">
                  Today&apos;s site
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${currentSiteIsReadOnly ? "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-400/20 dark:text-emerald-100 dark:ring-emerald-400/30" : "bg-secondary text-muted-foreground"}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {currentJob
                    ? currentSiteIsReadOnly
                      ? "Completed · view only"
                      : "Assigned today"
                    : "No site today"}
                </span>
              </div>
              {todayJobIds.length > 1 && (
                <div className="mt-4 rounded-xl border border-border bg-background p-3">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Multiple sites today
                  </p>
                  <div
                    className="flex flex-wrap gap-2"
                    role="group"
                    aria-label="Select today's site"
                  >
                    {todayJobIds.map((jobId) => {
                      const job = assignedJobs.find((candidate) => candidate.id === jobId);
                      if (!job) return null;
                      const selected = jobId === selectedTodayJobId;
                      return (
                        <button
                          key={jobId}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setSelectedTodayJobId(jobId)}
                          className={`min-h-11 rounded-lg border px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted"}`}
                        >
                          {job.siteName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {currentJob ? (
                <>
                  <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <h3 className="text-xl font-black tracking-tight text-foreground">
                        {currentJob.siteName}
                      </h3>
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {currentJob.postcode || "Postcode not provided"}
                      </p>
                    </div>
                    <span
                      className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusClasses(currentJob.status)}`}
                    >
                      {statusLabel(currentJob.status)}
                    </span>
                  </div>
                  <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold text-foreground">Today&apos;s update</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {currentTodayDiary
                            ? `${currentTodayDiary.entry_status === "submitted" ? "Submitted" : "Draft"} · ${currentTodayDiary.progress_status === "on_track" ? "On track" : currentTodayDiary.progress_status === "at_risk" ? "At risk" : "Blocked"}`
                            : "Not started"}
                        </p>
                      </div>
                      <Link
                        to={`/portal/foreman/sites/${currentJob.id}#today-site-update`}
                        className="inline-flex min-h-11 items-center text-xs font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {currentSiteIsReadOnly
                          ? "View today's update"
                          : currentTodayDiary
                            ? "Edit today's update"
                            : "Add today's update"}
                        <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-lg border border-border px-2.5 py-2 text-xs text-muted-foreground">
                      <Clock3 className="mr-1 inline h-3.5 w-3.5" />
                      {currentJobDate === today ? "Today" : formatUKDate(currentJobDate ?? today)}
                    </span>
                    <span className="rounded-lg border border-border px-2.5 py-2 text-xs text-muted-foreground">
                      <Users className="mr-1 inline h-3.5 w-3.5" />
                      {currentCrew.length} crew assigned
                    </span>
                    <span className="rounded-lg border border-border px-2.5 py-2 text-xs text-muted-foreground">
                      <ClipboardCheck className="mr-1 inline h-3.5 w-3.5" />
                      {photoCounts[currentJob.id] ?? 0} photos
                    </span>
                  </div>
                  <div className="mt-5 border-t border-border pt-4">
                    <Link
                      to={`/portal/foreman/sites/${currentJob.id}`}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Open today&apos;s site
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <Button
                        variant="ghost"
                        className="min-h-11 px-0 text-xs font-bold text-muted-foreground hover:bg-transparent hover:text-foreground"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={uploadingPhoto || currentSiteIsReadOnly}
                      >
                        {uploadingPhoto ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                        {uploadingPhoto ? "Uploading..." : "Add photo"}
                      </Button>
                      <Link
                        to={`/portal/foreman/sites/${currentJob.id}#site-updates`}
                        className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        Contact operations
                      </Link>
                    </div>
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
                  </div>
                </>
              ) : (
                <p className="mt-5 text-sm text-muted-foreground">No site today.</p>
              )}
            </article>

            <article className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:self-start">
              <h2 className="text-xs font-black uppercase tracking-[0.14em] text-foreground">
                Site support
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {currentSiteIsReadOnly
                  ? "This site is completed and view only. New updates are closed."
                  : currentJob
                    ? "Need help or want to report a blocker?"
                    : "Open an assigned site to contact operations."}
              </p>
              {currentJob && !currentSiteIsReadOnly && (
                <Link
                  to={`/portal/foreman/sites/${currentJob.id}#site-updates`}
                  className="mt-3 inline-flex min-h-11 items-center gap-1 text-xs font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Contact operations <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
              {upcomingSiteList.length > 0 && (
                <div className="mt-5 border-t border-border pt-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.14em] text-foreground">
                    Next site
                  </h3>
                  <div className="mt-3 space-y-2">
                    {upcomingSiteList.slice(0, 2).map((job) => (
                      <SiteRow
                        key={job.id}
                        job={job}
                        shifts={myShifts}
                        today={today}
                        workers={workers}
                      />
                    ))}
                  </div>
                  {upcomingSiteList.length > 2 && (
                    <Link
                      to="/portal/my-shifts"
                      className="mt-3 inline-flex min-h-11 items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                      View all upcoming assignments <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              )}
            </article>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 md:hidden">
            <div className="flex min-h-11 items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.14em]">
              Assigned crew
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] tracking-normal text-muted-foreground">
                {currentCrew.length} assigned
              </span>
            </div>
            <div className="mt-4 divide-y divide-border border-t border-border pt-2">
              {currentCrew.length > 0 ? (
                currentCrew.map((worker) => (
                  <div key={worker.id} className="flex items-center gap-3 py-2.5">
                    <div
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-black text-foreground"
                      aria-hidden="true"
                    >
                      {initials(worker.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">{worker.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {displayRole(worker.role)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-3 text-sm text-muted-foreground">
                  No crew is listed for this site.
                </p>
              )}
            </div>
          </section>

          <section
            id="foreman-site-diary"
            className="hidden scroll-mt-24 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 md:block"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xs font-black uppercase tracking-[0.14em] text-foreground">
                Daily site history
              </h2>
              {currentJob && (
                <Link
                  to={`/portal/foreman/sites/${currentJob.id}#site-updates`}
                  className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Contact operations <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </div>
            {siteDataError && (
              <div
                role="alert"
                className="mb-4 flex flex-col items-start justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 sm:flex-row sm:items-center"
              >
                <p className="text-sm text-destructive">{siteDataError}</p>
                <Button variant="outline" size="sm" onClick={() => void loadSiteData()}>
                  Retry
                </Button>
              </div>
            )}
            {loadingSiteData ? (
              <div className="flex items-center gap-2 py-5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading daily site records...
              </div>
            ) : recentDiary.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center">
                <FileText className="mx-auto mb-3 h-7 w-7 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">
                  {siteDataError
                    ? "No daily site records can be shown until the site data loads successfully."
                    : "No daily site records yet. Open the site to message operations."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentDiary.map((row) => {
                  const job = assignedJobs.find((candidate) => candidate.id === row.job_id);
                  return (
                    <div key={row.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                      <div className="min-w-0">
                        <p className="break-words whitespace-pre-line text-sm leading-relaxed text-foreground">
                          {diarySummary(row)}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {job?.siteName ?? "Assigned site"} · {formatUKDate(row.date)}
                          {row.updated_at ? ` · updated ${formatTime(row.updated_at)}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:hidden">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-black uppercase tracking-[0.14em] text-foreground">
                Latest update
              </h2>
              <Link
                to="/portal/my-shifts"
                className="inline-flex min-h-11 items-center text-xs font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                My shifts
              </Link>
            </div>
            <Link
              to="/portal/foreman/sites"
              className="mt-3 inline-flex min-h-11 items-center text-xs font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              View all assigned sites <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            {recentDiary[0] ? (
              <div className="mt-4 border-t border-border pt-4">
                <p className="break-words whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {diarySummary(recentDiary[0])}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {assignedJobs.find((job) => job.id === recentDiary[0].job_id)?.siteName ??
                    "Assigned site"}{" "}
                  · {formatUKDate(recentDiary[0].date)}
                </p>
              </div>
            ) : (
              <p className="mt-4 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
                No recent site records yet. Open the site to message operations.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
};

const SiteRow: React.FC<{
  job: Job;
  shifts: ScheduledShift[];
  workers: Worker[];
  today: string;
  current?: boolean;
}> = ({ job, shifts, workers, today, current }) => {
  const date = shiftDateForJob(job.id, shifts, today);
  const crew = date ? assignedWorkersForJob(job.id, shifts, workers, date).length : 0;
  return (
    <Link
      to={`/portal/foreman/sites/${job.id}`}
      className={`flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${current ? "border-primary/40 bg-primary/5" : "bg-background"}`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-foreground">{job.siteName}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {date === today ? "Today" : date ? formatUKDate(date) : "No upcoming shift"} ·{" "}
          {job.postcode || "No postcode"} · {crew} crew
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${statusClasses(job.status)}`}
      >
        {statusLabel(job.status)}
      </span>
    </Link>
  );
};
