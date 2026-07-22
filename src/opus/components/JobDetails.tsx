// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  Check,
  AlertCircle,
  Paperclip,
  History,
  PencilLine,
  Trash2,
  Layers,
  LayoutGrid,
  MessageSquare,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Job, Worker, ScheduledShift } from "../types/erp";
import { supabase } from "../../integrations/supabase/client";
import { useJobForecast, getWeatherOnDate, geocodePostcode } from "../utils/weather";
import { toLocalISODate } from "../utils/week";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { compressImageFile } from "../lib/compressImage";
import { getSignedJobAttachmentUrl } from "../lib/attachmentUrl";
import { HistoryTab, JOB_REVERTIBLE_FIELDS, JOB_FIELD_LABELS } from "./HistoryTab";
import { FeedTab } from "./FeedTab";
import { MediaTab } from "./MediaTab";
import { JobOverviewTab } from "./JobOverviewTab";
import { PersistentJobHeader } from "./PersistentJobHeader";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 100 * 1024 * 1024;

const STATUS_LABELS: Record<string, string> = {
  "in-progress": "In Progress",
  pending: "Pending",
  completed: "Completed",
};

interface PourLog {
  id: string;
  pourNumber: number;
  date: string; // expected date while scheduled, completion date once checked off
  mixType: string;
  volumeM3: number;
  status: "completed" | "scheduled";
  notes?: string;
}

interface JobDetailsProps {
  job: Job;
  workers: Worker[];
  allJobs: Job[];
  shifts: ScheduledShift[];
  setShifts: React.Dispatch<React.SetStateAction<ScheduledShift[]>>;
  onBack: () => void;
  onUpdateJob: (updatedJob: Job) => void;
  backLabel?: string;
}

export const JobDetails: React.FC<JobDetailsProps> = ({
  job,
  workers,
  allJobs,
  shifts,
  setShifts,
  onBack,
  onUpdateJob,
  backLabel = "Job Ledger",
}) => {
  const [status, setStatus] = useState<Job["status"]>(job.status);
  const [currentPours, setCurrentPours] = useState<number>(job.currentPours || 0);
  const [contractMaxPours, setContractMaxPours] = useState<number>(job.contractMaxPours || 0);

  // Pour logs state
  const [pourLogs, setPourLogs] = useState<PourLog[]>([]);
  const [isAddingPour, setIsAddingPour] = useState(false);
  const [newPourMix, setNewPourMix] = useState("C35/45");
  const [newPourVolume, setNewPourVolume] = useState("34");
  const [newPourNotes, setNewPourNotes] = useState("");
  const [newPourDate, setNewPourDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Attachments state
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploadingPhotoBefore, setUploadingPhotoBefore] = useState(false);
  const [uploadingPhotoAfter, setUploadingPhotoAfter] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [viewDocTarget, setViewDocTarget] = useState<any>(null);
  const [deleteAttachmentTarget, setDeleteAttachmentTarget] = useState<any>(null);
  const [gallery, setGallery] = useState<{ photos: any[]; index: number } | null>(null);
  const [renameTarget, setRenameTarget] = useState<any>(null);
  const [renameValue, setRenameValue] = useState("");

  // Weather & Suppliers state
  const { forecast, loading: loadingWeather } = useJobForecast(job.postcode);
  const weatherData = getWeatherOnDate(forecast, toLocalISODate(new Date()));
  const [siteCoords, setSiteCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // Staff on site — derived directly from shared shifts state so assign/
  // remove reflect instantly with no separate fetch or refetch race.
  const staffOnSite = React.useMemo(() => {
    const workerIds = new Set(shifts.filter((s) => s.jobId === job.id).map((s) => s.workerId));
    return workers.filter((w) => workerIds.has(w.id));
  }, [shifts, workers, job.id]);

  // Edit Job Details state
  const [isEditingJob, setIsEditingJob] = useState(false);
  const [editSiteName, setEditSiteName] = useState(job.siteName);
  const [editMainContractor, setEditMainContractor] = useState(job.mainContractor);
  const [editPostcode, setEditPostcode] = useState(job.postcode);
  const [editContractMaxPours, setEditContractMaxPours] = useState(
    String(job.contractMaxPours || 0),
  );

  // Audit Log state
  const [jobAuditLogs, setJobAuditLogs] = useState<any[]>([]);
  const [loadingJobAuditLogs, setLoadingJobAuditLogs] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");
  const [revertConfirmTarget, setRevertConfirmTarget] = useState<{
    oldDetails: any;
    newDetails: any;
  } | null>(null);

  const fetchJobAuditLogs = async () => {
    setLoadingJobAuditLogs(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("target_type", "jobs")
        .eq("target_id", job.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setJobAuditLogs(data || []);
    } catch (err) {
      console.error("Error loading job audit logs:", err);
    } finally {
      setLoadingJobAuditLogs(false);
    }
  };

  // Pours aren't a real Supabase table (no DB trigger to auto-log), so pour
  // schedule/complete/revert/delete actions are logged manually here to show
  // up alongside the trigger-generated job UPDATE entries in the Audit Log.
  const logPourAudit = (action: string, log: PourLog) => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      supabase
        .rpc("log_anonymous_audit", {
          p_user_email: user?.email || "admin@opusform.co.uk",
          p_action: action,
          p_target_type: "jobs",
          p_target_id: job.id,
          p_details: {
            pour_number: log.pourNumber,
            mix_type: log.mixType,
            volume_m3: log.volumeM3,
            date: log.date,
            notes: log.notes,
          },
        })
        .then(() => fetchJobAuditLogs());
    });
  };

  useEffect(() => {
    fetchJobAuditLogs();

    // Pour entries are audit_logs rows (see logPourAudit above), so
    // subscribing here keeps Scheduled Pours live for the same reason
    // jobs/shifts/staff are subscribed elsewhere.
    const channel = supabase
      .channel(`job-audit-${job.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "audit_logs", filter: `target_id=eq.${job.id}` },
        fetchJobAuditLogs,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  const executeRevertJobUpdate = () => {
    if (!revertConfirmTarget) return;
    const { oldDetails } = revertConfirmTarget;
    const revertedStatus = oldDetails.status ?? job.status;
    onUpdateJob({
      ...job,
      siteName: oldDetails.site_name ?? job.siteName,
      mainContractor: oldDetails.main_contractor ?? job.mainContractor,
      postcode: oldDetails.postcode ?? job.postcode,
      contractMaxPours: oldDetails.contract_max_pours ?? job.contractMaxPours,
      status: revertedStatus,
    });
    setStatus(revertedStatus);
    setRevertConfirmTarget(null);
    toast.success("Job details reverted");
    setTimeout(fetchJobAuditLogs, 300);
  };

  const [isConfirmingJobSave, setIsConfirmingJobSave] = useState(false);

  const editedJobFields = [
    { label: "Site Name", before: job.siteName, after: editSiteName },
    { label: "Main Contractor", before: job.mainContractor, after: editMainContractor },
    { label: "Postcode", before: job.postcode, after: editPostcode },
    {
      label: "Contract Max Pours",
      before: job.contractMaxPours,
      after: Number(editContractMaxPours) || 0,
    },
  ].filter((f) => String(f.before) !== String(f.after));

  const handleSaveJobEdit = () => {
    onUpdateJob({
      ...job,
      siteName: editSiteName,
      mainContractor: editMainContractor,
      postcode: editPostcode,
      contractMaxPours: Number(editContractMaxPours) || 0,
    });
    setContractMaxPours(Number(editContractMaxPours) || 0);
    setIsConfirmingJobSave(false);
    toast.success("Job details updated");
    setTimeout(fetchJobAuditLogs, 300);
  };

  // Sync state if job prop updates
  useEffect(() => {
    setStatus(job.status);
    setCurrentPours(job.currentPours || 0);
    setContractMaxPours(job.contractMaxPours || 0);
    setEditSiteName(job.siteName);
    setEditMainContractor(job.mainContractor);
    setEditPostcode(job.postcode);
    setEditContractMaxPours(String(job.contractMaxPours || 0));

    // Fetch initial details
    fetchAttachments();
    geocodeAndFetchWeatherAndSuppliers();
  }, [job]);

  // External contributors submit documents via a separate tab/device (the
  // job-upload link) with no realtime push back to this page — refetch
  // attachments and the audit log when the tab regains focus so a submission
  // made elsewhere shows up without needing a manual navigate-away-and-back.
  useEffect(() => {
    const onFocus = () => {
      fetchAttachments();
      fetchJobAuditLogs();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [job.id]);

  const rowToPourLog = (r: any): PourLog => ({
    id: r.id,
    pourNumber: r.pour_number,
    date: r.date || "",
    mixType: r.mix_type,
    volumeM3: Number(r.volume_m3),
    status: r.status,
    notes: r.notes || undefined,
  });

  const fetchPourLogs = async () => {
    const { data, error } = await supabase
      .from("pours")
      .select("*")
      .eq("job_id", job.id)
      .order("pour_number", { ascending: false });
    if (error) {
      console.error("Failed to load pours", error);
      return;
    }
    setPourLogs((data || []).map(rowToPourLog));
  };

  useEffect(() => {
    fetchPourLogs();

    const channel = supabase
      .channel(`job-pours-${job.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pours", filter: `job_id=eq.${job.id}` },
        fetchPourLogs,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [job.id]);

  // Haversine Distance helper
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3958.8; // miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const geocodeAndFetchWeatherAndSuppliers = async () => {
    if (!job.postcode) return;
    try {
      // Live weather comes from the shared useJobForecast hook above; this
      // just resolves coords (shares the same geocode cache) for the
      // nearby-suppliers lookup and site map pin.
      const coords = await geocodePostcode(job.postcode);
      if (!coords) return;
      const lat = coords.lat;
      const lng = coords.lon;
      setSiteCoords({ lat, lng });

      setLoadingSuppliers(true);
      // Nearby-suppliers lookup goes through the nearby-suppliers edge
      // function (Geoapify Places) instead of calling Overpass directly from
      // the browser — the public Overpass instance rate-limits/cools down
      // per IP and was timing out under real usage.
      const { data: supData, error: supError } = await supabase.functions.invoke(
        "nearby-suppliers",
        { body: { lat, lng, radiusMiles: 5 } },
      );
      if (supError) throw supError;

      if (supData?.suppliers && Array.isArray(supData.suppliers)) {
        const mapped = supData.suppliers
          .map((s: any) => {
            const dist =
              s.distanceMeters != null
                ? s.distanceMeters / 1609.34
                : calculateDistance(lat, lng, s.coords.lat, s.coords.lng);
            return {
              id: s.id,
              name: s.name,
              address: s.address,
              phone: s.phone,
              website: s.website,
              businessType: s.businessType,
              distance: `${dist.toFixed(1)} mi`,
              coords: s.coords,
            };
          })
          .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

        setSuppliers(mapped);
      }
    } catch (err) {
      console.error("Error geocoding or fetching suppliers:", err);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  // job_attachments/job_document_requests have no DB audit trigger (only
  // quotes/jobs/staff/shifts do), so uploads and link generation are logged
  // manually here — same convention as logPourAudit above.
  const logAttachmentAudit = (action: string, details: Record<string, unknown>) => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      supabase
        .rpc("log_anonymous_audit", {
          p_user_email: user?.email || "admin@opusform.co.uk",
          p_action: action,
          p_target_type: "jobs",
          p_target_id: job.id,
          p_details: details,
        })
        .then(() => fetchJobAuditLogs());
    });
  };

  const fetchAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from("job_attachments")
        .select("*")
        .eq("job_id", job.id)
        .order("uploaded_at", { ascending: false });

      if (data) {
        // job-attachments is a private bucket; the stored file_url is a
        // legacy public-URL-shaped path carrier that needs signing to load.
        const signed = await Promise.all(
          data.map(async (a) => ({
            ...a,
            file_url: (await getSignedJobAttachmentUrl(a.file_url)) ?? a.file_url,
          })),
        );
        setAttachments(signed);
      }
    } catch (err) {
      console.error("Error fetching attachments:", err);
    }
  };

  const uploadAttachment = async (
    file: File,
    type: "image_before" | "image_after" | "document",
  ) => {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error(`"${file.name}" is over the 10MB per-file limit`);
      return;
    }
    const existingTotal = attachments.reduce((sum, a) => sum + (a.file_size_bytes || 0), 0);
    if (existingTotal + file.size > MAX_TOTAL_ATTACHMENT_BYTES) {
      toast.error("This job has reached its 100MB total attachment limit");
      return;
    }

    if (type === "image_before") setUploadingPhotoBefore(true);
    else if (type === "image_after") setUploadingPhotoAfter(true);
    else setUploadingDoc(true);

    try {
      const uploadFile = await compressImageFile(file);
      const fileExt = file.name.split(".").pop();
      const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `jobs/${job.id}/${cleanFileName}`;

      // Upload file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from("job-attachments")
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("job-attachments").getPublicUrl(filePath);

      // Insert attachment record
      const { error: insertError } = await supabase.from("job_attachments").insert({
        job_id: job.id,
        type,
        file_name: file.name,
        file_url: publicUrl,
        file_size_bytes: uploadFile.size,
        uploaded_by: "Supervisor",
      });

      if (insertError) throw insertError;

      logAttachmentAudit("UPLOAD_ATTACHMENT", { attachment_type: type, file_name: file.name });
      await fetchAttachments();
    } catch (err) {
      console.error("Error uploading attachment:", err);
    } finally {
      setUploadingPhotoBefore(false);
      setUploadingPhotoAfter(false);
      setUploadingDoc(false);
    }
  };

  const executeViewDocument = () => {
    if (!viewDocTarget) return;
    logAttachmentAudit("VIEW_ATTACHMENT", {
      attachment_type: viewDocTarget.type,
      file_name: viewDocTarget.file_name,
    });
    window.open(viewDocTarget.file_url, "_blank", "noopener,noreferrer");
    setViewDocTarget(null);
  };

  const executeDeleteAttachment = async () => {
    if (!deleteAttachmentTarget) return;
    try {
      const { error } = await supabase
        .from("job_attachments")
        .delete()
        .eq("id", deleteAttachmentTarget.id);
      if (error) throw error;
      logAttachmentAudit("DELETE_ATTACHMENT", {
        attachment_type: deleteAttachmentTarget.type,
        file_name: deleteAttachmentTarget.file_name,
      });
      await fetchAttachments();
      toast.success("Attachment deleted");
    } catch (err) {
      console.error("Error deleting attachment:", err);
      toast.error("Failed to delete attachment");
    } finally {
      setDeleteAttachmentTarget(null);
    }
  };

  const executeRenameAttachment = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    try {
      const { error } = await supabase
        .from("job_attachments")
        .update({ file_name: renameValue.trim() })
        .eq("id", renameTarget.id);
      if (error) throw error;
      logAttachmentAudit("RENAME_ATTACHMENT", {
        attachment_type: renameTarget.type,
        old_file_name: renameTarget.file_name,
        file_name: renameValue.trim(),
      });
      await fetchAttachments();
      toast.success("File renamed");
    } catch (err) {
      console.error("Error renaming attachment:", err);
      toast.error("Failed to rename file");
    } finally {
      setRenameTarget(null);
    }
  };

  const generateUploadLink = async () => {
    setGeneratingLink(true);
    try {
      const token =
        Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const { data, error } = await supabase
        .from("job_document_requests")
        .insert({
          job_id: job.id,
          token,
          expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const link = `${window.location.origin}${window.location.pathname}#/job-upload/${token}`;
      setGeneratedLink(link);
      logAttachmentAudit("GENERATE_UPLOAD_LINK", {});
    } catch (err) {
      console.error("Error generating link:", err);
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const todayISO = () => new Date().toISOString().split("T")[0];

  const [pendingStatus, setPendingStatus] = useState<Job["status"] | null>(null);

  const executeStatusChange = () => {
    if (!pendingStatus) return;
    setStatus(pendingStatus);
    onUpdateJob({ ...job, status: pendingStatus });
    setPendingStatus(null);
  };

  const handleAddPourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextPourNumber = pourLogs.reduce((max, l) => Math.max(max, l.pourNumber), 0) + 1;
    const notes = newPourNotes || `Scheduled pour #${nextPourNumber}`;

    const { data, error } = await supabase
      .from("pours")
      .insert({
        job_id: job.id,
        pour_number: nextPourNumber,
        date: newPourDate,
        mix_type: newPourMix,
        volume_m3: Number(newPourVolume),
        status: "scheduled",
        notes,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to schedule pour", error);
      toast.error("Failed to schedule pour");
      return;
    }

    const newLog = rowToPourLog(data);
    setPourLogs([newLog, ...pourLogs]);
    setIsAddingPour(false);
    setNewPourNotes("");
    setNewPourDate(new Date().toISOString().split("T")[0]);
    toast.success("Pour scheduled");
    logPourAudit("SCHEDULE_POUR", newLog);
  };

  const [pourToggleTarget, setPourToggleTarget] = useState<PourLog | null>(null);

  const executeTogglePourComplete = async () => {
    if (!pourToggleTarget) return;
    const log = pourToggleTarget;
    const wasCompleted = log.status === "completed";
    const nextStatus = wasCompleted ? "scheduled" : "completed";
    const nextDate = wasCompleted ? log.date : new Date().toISOString().split("T")[0];

    const { error } = await supabase
      .from("pours")
      .update({ status: nextStatus, date: nextDate })
      .eq("id", log.id);
    if (error) {
      console.error("Failed to toggle pour status", error);
      toast.error("Failed to update pour");
      setPourToggleTarget(null);
      return;
    }

    setPourLogs((prev) =>
      prev.map((l) => (l.id === log.id ? { ...l, status: nextStatus, date: nextDate } : l)),
    );

    const nextPourCount = Math.max(0, currentPours + (wasCompleted ? -1 : 1));
    setCurrentPours(nextPourCount);
    onUpdateJob({ ...job, currentPours: nextPourCount });

    setPourToggleTarget(null);
    toast.success(
      wasCompleted
        ? `Pour #${log.pourNumber} marked as scheduled`
        : `Pour #${log.pourNumber} marked complete`,
    );
    logPourAudit(wasCompleted ? "REVERT_POUR" : "COMPLETE_POUR", log);
  };

  const [pourToRemove, setPourToRemove] = useState<PourLog | null>(null);

  const executeRemovePour = async () => {
    if (!pourToRemove) return;

    const { error } = await supabase.from("pours").delete().eq("id", pourToRemove.id);
    if (error) {
      console.error("Failed to remove pour", error);
      toast.error("Failed to remove pour");
      return;
    }

    const updatedLogs = pourLogs.filter((l) => l.id !== pourToRemove.id);
    setPourLogs(updatedLogs);

    if (pourToRemove.status === "completed") {
      const nextPourCount = Math.max(0, currentPours - 1);
      setCurrentPours(nextPourCount);
      onUpdateJob({ ...job, currentPours: nextPourCount });
    }

    setPourToRemove(null);
    toast.success("Pour removed from log");
    logPourAudit("REMOVE_POUR", pourToRemove);
  };

  const [pourNoteTarget, setPourNoteTarget] = useState<PourLog | null>(null);
  const [editNoteText, setEditNoteText] = useState("");

  const executeSaveNote = () => {
    if (!pourNoteTarget) return;
    const updatedLog = { ...pourNoteTarget, notes: editNoteText };
    setPourLogs((prev) => prev.map((l) => (l.id === pourNoteTarget.id ? updatedLog : l)));
    setPourNoteTarget(null);
    toast.success("Pour notes updated");
    logPourAudit("UPDATE_POUR_NOTES", updatedLog);
  };

  const formatPourDate = (dateStr: string) => {
    if (!dateStr) return "TBC";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "TBC";
      const day = String(d.getDate()).padStart(2, "0");
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const pourPercent = Math.round((currentPours / (contractMaxPours || 1)) * 100);
  const beforePhotos = attachments.filter((a) => a.type === "image_before");
  const afterPhotos = attachments.filter((a) => a.type === "image_after");
  const projectDocs = attachments.filter((a) => a.type === "document");

  // Group staff on site by role
  const groupedStaff: { [key: string]: Worker[] } = {};
  staffOnSite.forEach((w) => {
    if (!groupedStaff[w.role]) {
      groupedStaff[w.role] = [];
    }
    groupedStaff[w.role].push(w);
  });

  return (
    <div className="space-y-6 font-sans text-foreground p-4 md:p-6 max-w-7xl mx-auto bg-background min-h-screen">
      {/* Header: back button, title, and job ref all in one compact row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer mb-2"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            <span>{backLabel}</span>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              {job.siteName}
            </h1>
            <button
              aria-label="Edit job details"
              onClick={() => {
                setEditSiteName(job.siteName);
                setEditMainContractor(job.mainContractor);
                setEditPostcode(job.postcode);
                setEditContractMaxPours(String(job.contractMaxPours || 0));
                setIsEditingJob(true);
              }}
              className="text-muted-foreground hover:text-foreground hover:bg-secondary p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <PencilLine className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            {job.mainContractor} · <span className="font-mono">{job.postcode}</span>
          </p>
        </div>
        <div className="text-xs font-semibold bg-secondary border border-border text-muted-foreground px-3 py-1 rounded-md font-mono shrink-0">
          {job.jobRef.replace("-X", "")}
        </div>
      </div>

      {/* Edit Job Details Dialog */}
      <ConfirmDialog
        open={isEditingJob}
        onOpenChange={setIsEditingJob}
        tone="neutral"
        title="Edit Job Details"
        confirmLabel="Save Changes"
        onConfirm={() => {
          setIsEditingJob(false);
          if (editedJobFields.length > 0) setIsConfirmingJobSave(true);
        }}
        message={
          <div className="space-y-3 text-left">
            <div>
              <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                Site Name
              </label>
              <Input value={editSiteName} onChange={(e) => setEditSiteName(e.target.value)} />
            </div>
            <div>
              <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                Main Contractor
              </label>
              <Input
                value={editMainContractor}
                onChange={(e) => setEditMainContractor(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                Postcode
              </label>
              <Input value={editPostcode} onChange={(e) => setEditPostcode(e.target.value)} />
            </div>
            <div>
              <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                Contract Max Pours
              </label>
              <Input
                type="number"
                value={editContractMaxPours}
                onChange={(e) => setEditContractMaxPours(e.target.value)}
              />
            </div>
          </div>
        }
      />

      {/* Confirm Save — Job Details Changes */}
      <ConfirmDialog
        open={isConfirmingJobSave}
        onOpenChange={(open) => {
          if (!open) setIsConfirmingJobSave(false);
        }}
        tone="neutral"
        title="Save Job Details?"
        confirmLabel="Save Changes"
        onConfirm={handleSaveJobEdit}
        message={
          <div className="space-y-1">
            <p>The following details will be updated:</p>
            <div className="bg-muted/40 border border-border rounded-lg divide-y divide-border text-[12px] mt-2">
              {editedJobFields.map((f) => (
                <div key={f.label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-semibold uppercase tracking-wider text-[12px] text-muted-foreground">
                    {f.label}
                  </span>
                  <div className="flex items-center gap-2 text-right">
                    <span className="line-through text-muted-foreground text-[13px]">
                      {f.before}
                    </span>
                    <span className="text-muted-foreground text-[12px]">→</span>
                    <span className="font-bold text-foreground">{f.after}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        }
      />

      {/* Pour Progress */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-lg font-bold text-foreground flex items-center gap-2">
              <span>{pourPercent}%</span>
              <span
                className={`text-[12px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  pourPercent >= 100
                    ? "bg-success/15 text-success border border-success/20"
                    : "bg-primary/15 text-primary border border-primary/20"
                }`}
              >
                {currentPours} of {contractMaxPours}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {contractMaxPours - currentPours > 0
                ? `${contractMaxPours - currentPours} pours remaining`
                : "Contract fully poured"}
            </p>
          </div>
          <Layers className="w-8 h-8 text-muted-foreground shrink-0" />
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden mt-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              pourPercent >= 100 ? "bg-success" : "bg-primary"
            }`}
            style={{ width: `${Math.min(100, pourPercent)}%` }}
          />
        </div>
      </div>

      {/* Change Project Status Confirmation */}
      <ConfirmDialog
        open={!!pendingStatus}
        onOpenChange={(open) => {
          if (!open) setPendingStatus(null);
        }}
        tone="neutral"
        title="Change Project Status"
        confirmLabel="Confirm Change"
        onConfirm={executeStatusChange}
        message={
          pendingStatus && (
            <>
              Change project status from{" "}
              <strong className="text-foreground">{STATUS_LABELS[status]}</strong> to{" "}
              <strong className="text-foreground">{STATUS_LABELS[pendingStatus]}</strong>?
            </>
          )
        }
      />

      {/* Scheduled Pours: dated pour plan, always visible above the tabs regardless of which one is active */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-foreground">Scheduled Pours</h2>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddingPour(!isAddingPour)}
              className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-colors cursor-pointer border bg-card border-border hover:bg-secondary text-foreground"
            >
              {isAddingPour ? "Cancel" : "+ Schedule Pour"}
            </button>
          </div>
        </div>

        {isAddingPour && (
          <form
            onSubmit={handleAddPourSubmit}
            className="mb-4 p-4 bg-background border border-border rounded-lg space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Expected Date
                </label>
                <input
                  type="date"
                  required
                  value={newPourDate}
                  onChange={(e) => setNewPourDate(e.target.value)}
                  className="w-full bg-card border border-border text-xs text-foreground rounded-lg px-3 py-2 outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Mix Type
                </label>
                <select
                  value={newPourMix}
                  onChange={(e) => setNewPourMix(e.target.value)}
                  className="w-full bg-card border border-border text-xs text-foreground rounded-lg px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="C28/35">C28/35</option>
                  <option value="C32/40">C32/40</option>
                  <option value="C35/45">C35/45</option>
                </select>
              </div>
              <div>
                <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Volume (m³)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newPourVolume}
                  onChange={(e) => setNewPourVolume(e.target.value)}
                  className="w-full bg-card border border-border text-xs text-foreground rounded-lg px-3 py-2 outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Pour Notes
              </label>
              <input
                type="text"
                placeholder="Notes..."
                value={newPourNotes}
                onChange={(e) => setNewPourNotes(e.target.value)}
                className="w-full bg-card border border-border text-xs text-foreground rounded-lg px-3 py-2 outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg text-xs cursor-pointer"
              >
                Schedule Pour
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2.5">
          {pourLogs.map((log) => {
            const isCompleted = log.status === "completed";
            return (
              <div
                key={log.id}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-xl transition-all ${
                  isCompleted
                    ? "bg-card border-border hover:bg-secondary"
                    : "bg-warning/5 border-warning/20 hover:bg-warning/10"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    aria-label={
                      isCompleted
                        ? `Mark pour ${log.pourNumber} as scheduled`
                        : `Mark pour ${log.pourNumber} complete`
                    }
                    onClick={() => setPourToggleTarget(log)}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                      isCompleted
                        ? "bg-success/15 border-success/30 text-success hover:bg-success/25"
                        : "border-border text-transparent hover:border-primary hover:bg-primary/10"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <div className="space-y-1 min-w-0">
                    <div className="text-sm font-bold text-foreground flex items-center flex-wrap gap-x-2 gap-y-1">
                      Pour #{log.pourNumber}
                      {!isCompleted && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-warning bg-warning/10 border border-warning/20 rounded px-1.5 py-0.5">
                          Scheduled
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.mixType} · {log.volumeM3}m³
                    </div>
                    {log.notes && (
                      <div className="text-[13px] text-muted-foreground/80 italic truncate max-w-[280px]">
                        {log.notes}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                  {isCompleted && (
                    <div className="text-xs text-muted-foreground font-semibold">
                      {formatPourDate(log.date)}
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label={`Edit notes for pour ${log.pourNumber}`}
                    onClick={() => {
                      setEditNoteText(log.notes || "");
                      setPourNoteTarget(log);
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <PencilLine className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove pour ${log.pourNumber}`}
                    onClick={() => setPourToRemove(log)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {pourLogs.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground uppercase tracking-wider">
              No pours logged yet
            </div>
          )}
        </div>
      </div>

      {/* Remove Pour Confirmation */}
      <ConfirmDialog
        open={!!pourToRemove}
        onOpenChange={(open) => {
          if (!open) setPourToRemove(null);
        }}
        tone="destructive"
        title="Remove Scheduled Pour"
        confirmLabel="Remove Pour"
        onConfirm={executeRemovePour}
        message={
          pourToRemove && (
            <>
              This will permanently remove Pour #{pourToRemove.pourNumber} ({pourToRemove.mixType},{" "}
              {pourToRemove.volumeM3}m³, {formatPourDate(pourToRemove.date)})
              {pourToRemove.status === "completed"
                ? " and reduce the contract pour count by 1."
                : " from the schedule."}{" "}
              This cannot be undone.
            </>
          )
        }
      />

      {/* Mark Pour Complete / Scheduled Confirmation */}
      <ConfirmDialog
        open={!!pourToggleTarget}
        onOpenChange={(open) => {
          if (!open) setPourToggleTarget(null);
        }}
        tone="neutral"
        title={
          pourToggleTarget?.status === "completed"
            ? "Mark Pour as Scheduled?"
            : "Mark Pour Complete?"
        }
        confirmLabel={
          pourToggleTarget?.status === "completed" ? "Mark as Scheduled" : "Mark Complete"
        }
        onConfirm={executeTogglePourComplete}
        message={
          pourToggleTarget &&
          (pourToggleTarget.status === "completed" ? (
            <>
              This will revert Pour #{pourToggleTarget.pourNumber} back to scheduled and reduce the
              contract pour count by 1.
            </>
          ) : (
            <>
              This will mark Pour #{pourToggleTarget.pourNumber} as complete and increase the
              contract pour count by 1.
            </>
          ))
        }
      />

      {/* Edit Pour Notes */}
      <ConfirmDialog
        open={!!pourNoteTarget}
        onOpenChange={(open) => {
          if (!open) setPourNoteTarget(null);
        }}
        tone="neutral"
        title={pourNoteTarget ? `Notes for Pour #${pourNoteTarget.pourNumber}` : "Pour Notes"}
        confirmLabel="Save Notes"
        onConfirm={executeSaveNote}
        message={
          <textarea
            value={editNoteText}
            onChange={(e) => setEditNoteText(e.target.value)}
            placeholder="Add a note for this pour..."
            rows={4}
            className="w-full bg-background border border-border text-sm text-foreground rounded-lg px-3 py-2 outline-none resize-none"
          />
        }
      />

      <PersistentJobHeader
        job={job}
        pourLogs={pourLogs}
        weatherData={weatherData}
        loadingWeather={loadingWeather}
        groupedStaff={groupedStaff}
      />

      {/* Secondary sections: Suppliers/Map, Diary+Staff, Attachments */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="overview" aria-label="Overview" className="flex items-center gap-1.5">
            <LayoutGrid className="w-4 h-4" /> <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="media" aria-label="Media" className="flex items-center gap-1.5">
            <Paperclip className="w-4 h-4" /> <span className="hidden sm:inline">Media</span>
          </TabsTrigger>
          <TabsTrigger value="feed" aria-label="Feed" className="flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4" /> <span className="hidden sm:inline">Feed</span>
          </TabsTrigger>
          <TabsTrigger value="history" aria-label="History" className="flex items-center gap-1.5">
            <History className="w-4 h-4" /> <span className="hidden sm:inline">History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <JobOverviewTab
            job={job}
            status={status}
            setPendingStatus={setPendingStatus}
            siteCoords={siteCoords}
            suppliers={suppliers}
            selectedSupplierId={selectedSupplierId}
            setSelectedSupplierId={setSelectedSupplierId}
            loadingSuppliers={loadingSuppliers}
          />
        </TabsContent>

        <TabsContent value="media">
          <MediaTab
            beforePhotos={beforePhotos}
            afterPhotos={afterPhotos}
            projectDocs={projectDocs}
            uploadingPhotoBefore={uploadingPhotoBefore}
            uploadingPhotoAfter={uploadingPhotoAfter}
            uploadingDoc={uploadingDoc}
            uploadAttachment={uploadAttachment}
            generatedLink={generatedLink}
            generatingLink={generatingLink}
            copiedLink={copiedLink}
            generateUploadLink={generateUploadLink}
            copyToClipboard={copyToClipboard}
            gallery={gallery}
            setGallery={setGallery}
            viewDocTarget={viewDocTarget}
            setViewDocTarget={setViewDocTarget}
            executeViewDocument={executeViewDocument}
            deleteAttachmentTarget={deleteAttachmentTarget}
            setDeleteAttachmentTarget={setDeleteAttachmentTarget}
            executeDeleteAttachment={executeDeleteAttachment}
            renameTarget={renameTarget}
            setRenameTarget={setRenameTarget}
            renameValue={renameValue}
            setRenameValue={setRenameValue}
            executeRenameAttachment={executeRenameAttachment}
          />
        </TabsContent>

        <TabsContent value="feed">
          <FeedTab jobId={job.id} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab
            jobAuditLogs={jobAuditLogs}
            loadingJobAuditLogs={loadingJobAuditLogs}
            auditSearch={auditSearch}
            setAuditSearch={setAuditSearch}
            formatPourDate={formatPourDate}
            setRevertConfirmTarget={setRevertConfirmTarget}
          />
        </TabsContent>
      </Tabs>

      {/* Revert Job Changes Confirmation Modal */}
      <ConfirmDialog
        open={!!revertConfirmTarget}
        onOpenChange={(open) => {
          if (!open) setRevertConfirmTarget(null);
        }}
        tone="neutral"
        title="Revert Job Changes"
        confirmLabel="Revert Job"
        onConfirm={executeRevertJobUpdate}
        message={
          revertConfirmTarget && (
            <>
              The following values will be restored:
              <div className="bg-muted/40 border border-border rounded-lg divide-y divide-border text-[12px] mt-3">
                {JOB_REVERTIBLE_FIELDS.filter(
                  (f) => revertConfirmTarget.oldDetails?.[f] !== undefined,
                ).map((f) => {
                  const rawOldVal = revertConfirmTarget.oldDetails?.[f];
                  const rawNewVal = revertConfirmTarget.newDetails?.[f];
                  const oldVal = f === "status" ? STATUS_LABELS[rawOldVal] || rawOldVal : rawOldVal;
                  const newVal = f === "status" ? STATUS_LABELS[rawNewVal] || rawNewVal : rawNewVal;
                  const changed = rawOldVal !== rawNewVal;
                  return (
                    <div
                      key={f}
                      className={`flex items-center justify-between px-4 py-2.5 ${
                        changed
                          ? "bg-amber-500/5 border-l-2 border-amber-500/40 [.light-theme_&]:bg-amber-500/10 [.light-theme_&]:border-amber-600/50"
                          : ""
                      }`}
                    >
                      <span
                        className={`font-semibold uppercase tracking-wider text-[12px] ${
                          changed
                            ? "text-amber-400/70 [.light-theme_&]:text-amber-800/80"
                            : "text-muted-foreground"
                        }`}
                      >
                        {JOB_FIELD_LABELS[f]}
                      </span>
                      <div className="flex items-center gap-2 text-right">
                        {changed && newVal != null && (
                          <span className="line-through text-muted-foreground text-[13px]">
                            {newVal}
                          </span>
                        )}
                        {changed && newVal != null && (
                          <span className="text-muted-foreground text-[12px]">→</span>
                        )}
                        <span
                          className={`font-bold ${
                            changed
                              ? "text-amber-300 [.light-theme_&]:text-amber-800"
                              : "text-foreground"
                          }`}
                        >
                          {oldVal}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )
        }
      />
    </div>
  );
};
