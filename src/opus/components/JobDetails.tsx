// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  CloudRain,
  CloudSun,
  Snowflake,
  Wind,
  Camera,
  FileText,
  Link as LinkIcon,
  Check,
  UserCheck,
  Plus,
  Loader,
  AlertCircle,
  Copy,
  MapPin,
  Clock,
  Circle,
  Users,
  Paperclip,
  Phone,
  Navigation,
  History,
  PencilLine,
  Search,
  Trash2,
  Layers,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Job, Worker, ScheduledShift } from "../types/erp";
import { supabase } from "../../integrations/supabase/client";
import { OSMMap } from "./OSMMap";
import { useJobForecast, getWeatherOnDate, geocodePostcode } from "../utils/weather";
import { toLocalISODate } from "../utils/week";
import { computeDiff } from "../utils/auditDiff";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useShiftActions } from "../hooks/useShiftActions";

// Only these job columns count as a real "job detail change" worth surfacing
// an audit entry + Revert button for — same convention as the staff dossier.
const JOB_REVERTIBLE_FIELDS = ["site_name", "main_contractor", "postcode", "contract_max_pours", "status"];
const JOB_FIELD_LABELS: Record<string, string> = {
  site_name: "Site Name",
  main_contractor: "Main Contractor",
  postcode: "Postcode",
  contract_max_pours: "Contract Max Pours",
  status: "Project Status",
};

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
  notes: string;
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
  const { assignWorker, confirmReallocate, removeShift } = useShiftActions(
    workers,
    allJobs,
    shifts,
    setShifts,
  );
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
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [addStaffWorkerId, setAddStaffWorkerId] = useState("");
  const [assignBlockedReason, setAssignBlockedReason] = useState<string | null>(null);
  const [reallocateTarget, setReallocateTarget] = useState<{
    workerId: string;
    currentJobName: string;
    existingShiftId: string;
  } | null>(null);
  const [removeStaffTarget, setRemoveStaffTarget] = useState<Worker | null>(null);

  // Edit Job Details state
  const [isEditingJob, setIsEditingJob] = useState(false);
  const [editSiteName, setEditSiteName] = useState(job.siteName);
  const [editMainContractor, setEditMainContractor] = useState(job.mainContractor);
  const [editPostcode, setEditPostcode] = useState(job.postcode);
  const [editContractMaxPours, setEditContractMaxPours] = useState(String(job.contractMaxPours || 0));

  // Audit Log state
  const [jobAuditLogs, setJobAuditLogs] = useState<any[]>([]);
  const [loadingJobAuditLogs, setLoadingJobAuditLogs] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");
  const [revertConfirmTarget, setRevertConfirmTarget] = useState<{ oldDetails: any; newDetails: any } | null>(
    null,
  );

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

  // Seed mock pour logs for this job once on load — must NOT re-run when
  // currentPours changes, since checking/unchecking/adding/removing a pour
  // all update currentPours via onUpdateJob, and re-running this would wipe
  // out those edits with a freshly regenerated mock list.
  useEffect(() => {
    const list: PourLog[] = [];
    const count = job.currentPours || 0;
    for (let i = 1; i <= count; i++) {
      let mixType = "C32/40";
      let volumeM3 = 30;
      let dateStr = "";

      if (i === 5) {
        mixType = "C35/45";
        volumeM3 = 34;
        dateStr = "2026-07-09";
      } else if (i === 4) {
        mixType = "C32/40";
        volumeM3 = 28;
        dateStr = "2026-07-06";
      } else {
        mixType = i % 2 === 0 ? "C32/40" : "C28/35";
        volumeM3 = 20 + i * 2;
        const dayOffset = (count - i) * 3 + 1;
        const d = new Date();
        d.setDate(d.getDate() - dayOffset);
        dateStr = d.toISOString().split("T")[0];
      }

      list.push({
        id: `${job.id}-pour-${i}`,
        pourNumber: i,
        date: dateStr,
        mixType,
        volumeM3,
        status: "completed",
        notes: `Structural slab pour #${i} completed successfully.`,
      });
    }
    setPourLogs(list.reverse());
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setAttachments(data);
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
      const fileExt = file.name.split(".").pop();
      const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `jobs/${job.id}/${cleanFileName}`;

      // Upload file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from("job-attachments")
        .upload(filePath, file);

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
        file_size_bytes: file.size,
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

  const handleAddStaff = () => {
    if (!addStaffWorkerId) return;
    const result = assignWorker(addStaffWorkerId, job.id, todayISO());
    if (result.status === "ok") {
      setIsAddingStaff(false);
      setAddStaffWorkerId("");
      toast.success("Staff member assigned to job");
    } else if (result.status === "blocked") {
      setAssignBlockedReason(result.reason);
    } else if (result.status === "needsReallocation") {
      setReallocateTarget({
        workerId: addStaffWorkerId,
        currentJobName: result.currentJobName,
        existingShiftId: result.existingShiftId,
      });
    }
  };

  const executeReallocate = () => {
    if (!reallocateTarget) return;
    confirmReallocate(reallocateTarget.workerId, job.id, todayISO(), reallocateTarget.existingShiftId);
    setReallocateTarget(null);
    setIsAddingStaff(false);
    setAddStaffWorkerId("");
    toast.success("Staff member reallocated to this job");
  };

  const executeRemoveStaff = () => {
    if (!removeStaffTarget) return;
    // A worker can appear via multiple dated shifts on this job — remove all of them.
    shifts
      .filter((s) => s.jobId === job.id && s.workerId === removeStaffTarget.id)
      .forEach((s) => removeShift(s.id));
    setRemoveStaffTarget(null);
    toast.success("Staff member removed from job");
  };

  const availableWorkersToAdd = workers.filter(
    (w) => !w.isArchived && !staffOnSite.some((s) => s.id === w.id),
  );

  const [pendingStatus, setPendingStatus] = useState<Job["status"] | null>(null);

  const executeStatusChange = () => {
    if (!pendingStatus) return;
    setStatus(pendingStatus);
    onUpdateJob({ ...job, status: pendingStatus });
    setPendingStatus(null);
  };

  const handleAddPourSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextPourNumber = pourLogs.reduce((max, l) => Math.max(max, l.pourNumber), 0) + 1;
    const newLog: PourLog = {
      id: `${job.id}-pour-${Date.now()}`,
      pourNumber: nextPourNumber,
      date: newPourDate,
      mixType: newPourMix,
      volumeM3: Number(newPourVolume),
      status: "scheduled",
      notes: newPourNotes || `Scheduled pour #${nextPourNumber}`,
    };

    setPourLogs([newLog, ...pourLogs]);
    setIsAddingPour(false);
    setNewPourNotes("");
    setNewPourDate(new Date().toISOString().split("T")[0]);
    toast.success("Pour scheduled");
    logPourAudit("SCHEDULE_POUR", newLog);
  };

  const [pourToggleTarget, setPourToggleTarget] = useState<PourLog | null>(null);

  const executeTogglePourComplete = () => {
    if (!pourToggleTarget) return;
    const log = pourToggleTarget;
    const wasCompleted = log.status === "completed";

    setPourLogs((prev) =>
      prev.map((l) =>
        l.id === log.id
          ? {
              ...l,
              status: wasCompleted ? "scheduled" : "completed",
              date: wasCompleted ? l.date : new Date().toISOString().split("T")[0],
            }
          : l,
      ),
    );

    const nextPourCount = Math.max(0, currentPours + (wasCompleted ? -1 : 1));
    setCurrentPours(nextPourCount);
    onUpdateJob({ ...job, currentPours: nextPourCount });

    setPourToggleTarget(null);
    toast.success(
      wasCompleted ? `Pour #${log.pourNumber} marked as scheduled` : `Pour #${log.pourNumber} marked complete`,
    );
    logPourAudit(wasCompleted ? "REVERT_POUR" : "COMPLETE_POUR", log);
  };

  const [pourToRemove, setPourToRemove] = useState<PourLog | null>(null);

  const executeRemovePour = () => {
    if (!pourToRemove) return;
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
    try {
      const d = new Date(dateStr);
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
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{job.siteName}</h1>
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
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Site Name
              </label>
              <Input value={editSiteName} onChange={(e) => setEditSiteName(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Main Contractor
              </label>
              <Input
                value={editMainContractor}
                onChange={(e) => setEditMainContractor(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Postcode
              </label>
              <Input value={editPostcode} onChange={(e) => setEditPostcode(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
                    {f.label}
                  </span>
                  <div className="flex items-center gap-2 text-right">
                    <span className="line-through text-muted-foreground text-[11px]">{f.before}</span>
                    <span className="text-muted-foreground text-[10px]">→</span>
                    <span className="font-bold text-foreground">{f.after}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        }
      />

      {/* Main strip: Status, Progress, and Live Weather as one unified card */}
      <div className="bg-card border border-border rounded-xl grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* Project Status Selector */}
        <div className="p-4 flex flex-col justify-center">
          <div className="flex flex-col items-stretch gap-0.5">
            {(
              [
                { key: "in-progress", label: "In Progress", Icon: Clock, activeClasses: "bg-primary/15 text-primary border-primary/30" },
                { key: "pending", label: "Pending", Icon: Circle, activeClasses: "bg-warning/15 text-warning border-warning/30" },
                { key: "completed", label: "Completed", Icon: Check, activeClasses: "bg-success/15 text-success border-success/30" },
              ] as const
            ).map(({ key: s, label, Icon, activeClasses }) => {
              const isActive = status === s;
              return (
                <button
                  key={s}
                  onClick={() => !isActive && setPendingStatus(s)}
                  aria-pressed={isActive}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isActive ? activeClasses : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Weather */}
        <div className="p-4 flex flex-col justify-center">
          {loadingWeather ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader className="w-4 h-4 animate-spin text-primary" />
              <span>Fetching Weather...</span>
            </div>
          ) : weatherData ? (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>{weatherData.temperature}°C</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      weatherData.isImpactful
                        ? "bg-destructive/15 text-destructive border border-destructive/20"
                        : "bg-success/15 text-success border border-success/20"
                    }`}
                  >
                    {weatherData.riskLevel} Risk
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{weatherData.condition}</p>
              </div>
              {weatherData.condition === "Rain" ? (
                <CloudRain className="w-8 h-8 text-muted-foreground" />
              ) : weatherData.condition === "Frost" ? (
                <Snowflake className="w-8 h-8 text-muted-foreground" />
              ) : weatherData.condition === "Wind" ? (
                <Wind className="w-8 h-8 text-muted-foreground" />
              ) : (
                <CloudSun className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Weather details unavailable.</p>
          )}
        </div>

        {/* Pour Progress */}
        <div className="p-4 flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-lg font-bold text-foreground flex items-center gap-2">
                <span>{pourPercent}%</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
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
              Change project status from <strong className="text-foreground">{STATUS_LABELS[status]}</strong>{" "}
              to <strong className="text-foreground">{STATUS_LABELS[pendingStatus]}</strong>?
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
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
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
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
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
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
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
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
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
                className={`flex justify-between items-center p-4 border rounded-xl transition-all ${
                  isCompleted
                    ? "bg-card border-border hover:bg-secondary"
                    : "bg-warning/5 border-warning/20 hover:bg-warning/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={isCompleted ? `Mark pour ${log.pourNumber} as scheduled` : `Mark pour ${log.pourNumber} complete`}
                    onClick={() => setPourToggleTarget(log)}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                      isCompleted
                        ? "bg-success/15 border-success/30 text-success hover:bg-success/25"
                        : "border-border text-transparent hover:border-primary hover:bg-primary/10"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-foreground">
                      Pour #{log.pourNumber}
                      {!isCompleted && (
                        <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-warning bg-warning/10 border border-warning/20 rounded px-1.5 py-0.5">
                          Scheduled
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.mixType} · {log.volumeM3}m³
                    </div>
                    {log.notes && (
                      <div className="text-[11px] text-muted-foreground/80 italic truncate max-w-[280px]">
                        {log.notes}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground font-semibold">
                    {isCompleted ? formatPourDate(log.date) : `Expected ${formatPourDate(log.date)}`}
                  </div>
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

        {/* Staff Scheduled On Site — combined into the same card as Scheduled
            Pours rather than a separate one, and never scrolls: the list just
            extends the page instead of clipping to a fixed height. */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary" />
              <h2 className="text-base font-bold text-foreground">Staff Scheduled On Site</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingStaff(true)}
              className="flex items-center gap-1 text-[10px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded font-bold uppercase tracking-wider hover:bg-primary/20 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add Staff
            </button>
          </div>

          {Object.keys(groupedStaff).length > 0 ? (
            <div className="space-y-4">
              {Object.keys(groupedStaff).map((roleName) => (
                <div key={roleName} className="space-y-1.5">
                  <div className="text-[10px] text-primary font-bold uppercase tracking-wider border-b border-border pb-1">
                    {roleName} ({groupedStaff[roleName].length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {groupedStaff[roleName].map((w) => (
                      <div
                        key={w.id}
                        className="bg-background border border-border rounded-lg p-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-foreground truncate">{w.name}</div>
                          {w.phone && (
                            <a
                              href={`tel:${w.phone}`}
                              className="text-[9px] text-primary hover:underline font-mono flex items-center gap-1 mt-0.5"
                            >
                              <Phone className="w-2.5 h-2.5" /> {w.phone}
                            </a>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setRemoveStaffTarget(w)}
                          className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          aria-label={`Remove ${w.name} from job`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground py-8 text-center uppercase tracking-wider">
              No staff members scheduled to this job site.
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
        title={pourToggleTarget?.status === "completed" ? "Mark Pour as Scheduled?" : "Mark Pour Complete?"}
        confirmLabel={pourToggleTarget?.status === "completed" ? "Mark as Scheduled" : "Mark Complete"}
        onConfirm={executeTogglePourComplete}
        message={
          pourToggleTarget &&
          (pourToggleTarget.status === "completed" ? (
            <>
              This will revert Pour #{pourToggleTarget.pourNumber} back to scheduled and reduce the contract
              pour count by 1.
            </>
          ) : (
            <>
              This will mark Pour #{pourToggleTarget.pourNumber} as complete and increase the contract pour
              count by 1.
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

      {/* Secondary sections: Suppliers/Map, Diary+Staff, Attachments */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full h-auto">
          <TabsTrigger value="overview" className="flex-1 flex items-center justify-center gap-1.5 px-1.5 sm:px-3">
            <Users className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex-1 flex items-center justify-center gap-1.5 px-1.5 sm:px-3">
            <MapPin className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Local Suppliers</span>
          </TabsTrigger>
          <TabsTrigger value="audit_log" className="flex-1 flex items-center justify-center gap-1.5 px-1.5 sm:px-3">
            <History className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Audit Log</span>
          </TabsTrigger>
        </TabsList>

      <TabsContent value="suppliers">
      {/* Interactive Proximity Suppliers Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 bg-card border border-border rounded-xl overflow-hidden">
        <div className="lg:col-span-2 flex flex-col lg:border-r border-border">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-destructive" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Live Site Proximity Matrix
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-destructive" /> Job Site
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" /> Supplier
              </span>
            </div>
          </div>
          {siteCoords ? (
            <div className="flex-1 min-h-[420px] relative">
              <OSMMap
                center={siteCoords}
                siteCoords={siteCoords}
                siteName={job.siteName}
                postcode={job.postcode}
                suppliers={suppliers}
                selectedSupplierId={selectedSupplierId}
                onSelectSupplier={setSelectedSupplierId}
              />
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground py-16">
              Geocoding site coordinates...
            </div>
          )}
        </div>

        {/* Local Suppliers List */}
        <div className="p-4 flex flex-col h-full min-h-[420px]">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-4">
            Closest Local Suppliers
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            {loadingSuppliers ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                <Loader className="w-4 h-4 animate-spin text-primary" />
                <span>Searching local building merchants...</span>
              </div>
            ) : suppliers.length > 0 ? (
              <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                {suppliers.map((s) => (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setSelectedSupplierId((prev) => (prev === s.id ? null : s.id))
                    }
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      setSelectedSupplierId((prev) => (prev === s.id ? null : s.id))
                    }
                    className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedSupplierId === s.id
                        ? "bg-secondary border-primary"
                        : "bg-background border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="space-y-0.5 max-w-[70%]">
                        <div className="text-xs font-bold text-foreground truncate">{s.name}</div>
                        {s.businessType && (
                          <div className="text-[9px] text-primary font-bold uppercase tracking-wider">
                            {s.businessType}
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground truncate">{s.address}</div>
                      </div>
                      <span className="text-[10px] font-bold bg-background border border-border px-2 py-0.5 rounded text-muted-foreground shrink-0">
                        {s.distance}
                      </span>
                    </div>

                    {/* Actions always visible, not hover-dependent */}
                    <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {s.phone && (
                        <a
                          href={`tel:${s.phone}`}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-foreground border border-border px-2 py-1 rounded-md hover:bg-secondary transition-colors"
                        >
                          <Phone className="w-3 h-3" /> Call
                        </a>
                      )}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-[10px] font-bold text-foreground border border-border px-2 py-1 rounded-md hover:bg-secondary transition-colors"
                      >
                        <Navigation className="w-3 h-3" /> Directions
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground py-4">
                No local tool hire or building merchants found.
              </div>
            )}
          </div>
        </div>
      </div>
      </TabsContent>

      <TabsContent value="overview">
      <div className="space-y-6">
      {/* Attachments Section: Photos and Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Before & After Photo Gallery */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Before & After Site Media
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Before Section */}
            <div className="space-y-2">
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex justify-between items-center">
                <span>Before Pours</span>
                <label className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-1 font-bold">
                  {uploadingPhotoBefore ? (
                    <Loader className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-3 h-3" /> Add Photo
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      e.target.files?.[0] && uploadAttachment(e.target.files[0], "image_before")
                    }
                    className="hidden"
                    disabled={uploadingPhotoBefore}
                  />
                </label>
              </div>
              <div className="bg-background border border-border rounded-xl min-h-[140px] flex items-center justify-center p-3">
                {beforePhotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {beforePhotos.map((p) => (
                      <div
                        key={p.id}
                        className="relative group rounded-lg overflow-hidden border border-border"
                      >
                        <img src={p.file_url} alt="before" className="w-full h-24 object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-1.5 text-[8px] text-muted-foreground">
                          <span className="text-white font-bold truncate">{p.uploaded_by}</span>
                          <span>{new Date(p.uploaded_at).toLocaleDateString("en-GB")}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeleteAttachmentTarget(p)}
                          aria-label="Delete photo"
                          className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                    No Media
                  </span>
                )}
              </div>
            </div>

            {/* After Section */}
            <div className="space-y-2">
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex justify-between items-center">
                <span>After Pours</span>
                <label className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-1 font-bold">
                  {uploadingPhotoAfter ? (
                    <Loader className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-3 h-3" /> Add Photo
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      e.target.files?.[0] && uploadAttachment(e.target.files[0], "image_after")
                    }
                    className="hidden"
                    disabled={uploadingPhotoAfter}
                  />
                </label>
              </div>
              <div className="bg-background border border-border rounded-xl min-h-[140px] flex items-center justify-center p-3">
                {afterPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {afterPhotos.map((p) => (
                      <div
                        key={p.id}
                        className="relative group rounded-lg overflow-hidden border border-border"
                      >
                        <img src={p.file_url} alt="after" className="w-full h-24 object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-1.5 text-[8px] text-muted-foreground">
                          <span className="text-white font-bold truncate">{p.uploaded_by}</span>
                          <span>{new Date(p.uploaded_at).toLocaleDateString("en-GB")}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeleteAttachmentTarget(p)}
                          aria-label="Delete photo"
                          className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                    No Media
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Project Documents & Drag-and-Drop */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Project Documents
              </h2>
            </div>
            <button
              onClick={generateUploadLink}
              disabled={generatingLink}
              className="text-[10px] text-primary hover:text-primary font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
            >
              {generatingLink ? (
                <Loader className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <LinkIcon className="w-3 h-3" /> Request Link
                </>
              )}
            </button>
          </div>

          {/* Generated request link alert */}
          {generatedLink && (
            <div className="bg-secondary border border-border rounded-xl p-3.5 flex items-center justify-between gap-3 animate-fade-in">
              <div className="space-y-0.5 max-w-[75%]">
                <div className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                  Secure Upload Link Generated
                </div>
                <div className="text-[11px] text-muted-foreground truncate font-mono">{generatedLink}</div>
              </div>
              <button
                onClick={copyToClipboard}
                className="px-3 py-1.5 bg-card border border-border text-foreground hover:bg-secondary rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-success" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedLink ? "Copied" : "Copy"}</span>
              </button>
            </div>
          )}

          {/* Drag and drop zone */}
          <div className="border border-dashed border-border hover:border-muted-foreground/40 rounded-xl p-6 bg-background text-center relative transition-all">
            <input
              type="file"
              onChange={(e) =>
                e.target.files?.[0] && uploadAttachment(e.target.files[0], "document")
              }
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploadingDoc}
            />
            <div className="flex flex-col items-center gap-2">
              <FileText className="w-8 h-8 text-muted-foreground" />
              <div className="text-xs font-bold text-foreground">
                {uploadingDoc ? "Uploading..." : "Drop files here or click to upload"}
              </div>
              <div className="text-[10px] text-muted-foreground">PDF, Excel, Word, or CAD Drawings</div>
              <div className="text-[9px] text-muted-foreground">10MB per file, 100MB total per job</div>
            </div>
          </div>

          {/* Documents List */}
          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
            {projectDocs.map((d) => (
              <div
                key={d.id}
                className="flex justify-between items-center p-2.5 bg-background border border-border rounded-lg hover:border-muted-foreground/40 transition-all"
              >
                <button
                  type="button"
                  onClick={() => setViewDocTarget(d)}
                  className="flex items-center gap-2 truncate max-w-[70%] cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground hover:text-primary truncate font-mono">
                    {d.file_name}
                  </span>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] text-muted-foreground font-medium">
                    {new Date(d.uploaded_at).toLocaleDateString("en-GB")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDeleteAttachmentTarget(d)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    aria-label={`Delete ${d.file_name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {projectDocs.length === 0 && (
              <div className="text-center py-6 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                No documents uploaded yet
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      </TabsContent>

      <TabsContent value="audit_log">
        {(() => {
          const events = jobAuditLogs
            .map((l) => {
              const diff =
                l.action === "UPDATE" && l.details?.old
                  ? computeDiff(l.details.old, l.details.new)
                  : [];
              return { ...l, diff };
            })
            .filter((event) => {
              if (event.action === "UPDATE") {
                return event.diff.some((d: any) => JOB_REVERTIBLE_FIELDS.includes(d.field));
              }
              return true;
            })
            .filter((event) => {
              const searchLower = auditSearch.trim().toLowerCase();
              if (!searchLower) return true;
              return (event.user_email || "").toLowerCase().includes(searchLower);
            });

          return (
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search actor..."
                  className="pl-8"
                />
              </div>

              {loadingJobAuditLogs ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                  <Loader className="w-4 h-4 animate-spin text-primary" />
                  <span>Loading audit log...</span>
                </div>
              ) : events.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                  No audit history for this job
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {events.map((event) => {
                    const changedFields = event.diff
                      .filter((d: any) => JOB_REVERTIBLE_FIELDS.includes(d.field))
                      .map((d: any) => JOB_FIELD_LABELS[d.field] || d.field);

                    const pourLabel = event.details?.pour_number
                      ? `Pour #${event.details.pour_number} (${event.details.mix_type}, ${event.details.volume_m3}m³)`
                      : "";

                    let badgeColor = "bg-secondary border-border text-muted-foreground";
                    let summaryText = "";
                    if (event.action === "CREATE") {
                      badgeColor = "bg-primary/10 border-primary/20 text-primary";
                      summaryText = "Job record created";
                    } else if (event.action === "UPDATE") {
                      summaryText = changedFields.length
                        ? `Job Details Updated: ${changedFields.join(", ")}`
                        : "Job Details Have Been Updated";
                    } else if (event.action === "SCHEDULE_POUR") {
                      badgeColor = "bg-primary/10 border-primary/20 text-primary";
                      summaryText = `Scheduled ${pourLabel}, expected ${formatPourDate(event.details.date)}`;
                    } else if (event.action === "COMPLETE_POUR") {
                      badgeColor = "bg-success/10 border-success/20 text-success";
                      summaryText = `Marked ${pourLabel} complete`;
                    } else if (event.action === "REVERT_POUR") {
                      badgeColor = "bg-warning/10 border-warning/20 text-warning";
                      summaryText = `Reverted ${pourLabel} back to scheduled`;
                    } else if (event.action === "REMOVE_POUR") {
                      badgeColor = "bg-destructive/10 border-destructive/20 text-destructive";
                      summaryText = `Removed ${pourLabel} from the log`;
                    } else if (event.action === "UPDATE_POUR_NOTES") {
                      badgeColor = "bg-secondary border-border text-muted-foreground";
                      summaryText = `Updated notes on ${pourLabel}`;
                    } else if (event.action === "ASSIGN_STAFF") {
                      badgeColor = "bg-primary/10 border-primary/20 text-primary";
                      summaryText = `${event.details?.worker_name || "Staff member"} assigned to site`;
                    } else if (event.action === "REALLOCATE_STAFF") {
                      badgeColor = "bg-warning/10 border-warning/20 text-warning";
                      summaryText = `${event.details?.worker_name || "Staff member"} reallocated to this job`;
                    } else if (event.action === "REMOVE_STAFF") {
                      badgeColor = "bg-destructive/10 border-destructive/20 text-destructive";
                      summaryText = `${event.details?.worker_name || "Staff member"} removed from site`;
                    } else if (event.action === "UPLOAD_ATTACHMENT") {
                      badgeColor = "bg-primary/10 border-primary/20 text-primary";
                      const attachmentLabel =
                        event.details?.attachment_type === "document"
                          ? "Document"
                          : event.details?.attachment_type === "image_after"
                            ? "After photo"
                            : "Before photo";
                      summaryText = `${attachmentLabel} uploaded: ${event.details?.file_name || ""}`;
                    } else if (event.action === "GENERATE_UPLOAD_LINK") {
                      badgeColor = "bg-secondary border-border text-muted-foreground";
                      summaryText = "External upload link generated";
                    } else if (event.action === "EXTERNAL_UPLOAD") {
                      badgeColor = "bg-primary/10 border-primary/20 text-primary";
                      summaryText = `Document submitted via external link: ${event.details?.file_name || ""}`;
                    } else if (event.action === "VIEW_ATTACHMENT") {
                      badgeColor = "bg-secondary border-border text-muted-foreground";
                      summaryText = `Accessed: ${event.details?.file_name || "attachment"}`;
                    } else if (event.action === "DELETE_ATTACHMENT") {
                      badgeColor = "bg-destructive/10 border-destructive/20 text-destructive";
                      summaryText = `Deleted: ${event.details?.file_name || "attachment"}`;
                    } else {
                      summaryText = event.action?.replace(/_/g, " ");
                    }

                    const canRevert = event.action === "UPDATE" && changedFields.length > 0;
                    const isPourEvent = pourLabel !== "";

                    return (
                      <div key={event.id} className="py-2.5 flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          {isPourEvent ? (
                            <Layers className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <PencilLine className="w-3.5 h-3.5 text-primary" />
                          )}
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-widest border shrink-0 ${badgeColor}`}
                        >
                          {event.action?.replace(/_/g, " ")}
                        </span>
                        <p className="flex-1 min-w-0 truncate text-[11px] text-foreground/90">
                          {summaryText}
                        </p>
                        {canRevert && (
                          <button
                            type="button"
                            onClick={() =>
                              setRevertConfirmTarget({
                                oldDetails: event.details?.old,
                                newDetails: event.details?.new,
                              })
                            }
                            className="shrink-0 px-2.5 py-1 rounded bg-secondary hover:bg-warning/10 text-foreground/85 hover:text-warning border border-border hover:border-warning/30 text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Revert
                          </button>
                        )}
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(event.created_at).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </TabsContent>
      </Tabs>

      {/* Add Staff to Job */}
      <ConfirmDialog
        open={isAddingStaff}
        onOpenChange={(open) => {
          setIsAddingStaff(open);
          if (!open) setAddStaffWorkerId("");
        }}
        tone="neutral"
        title="Add Staff to Job"
        confirmLabel="Assign"
        onConfirm={handleAddStaff}
        message={
          <div className="space-y-2">
            <p>Select a staff member to assign to this job site.</p>
            <select
              value={addStaffWorkerId}
              onChange={(e) => setAddStaffWorkerId(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
            >
              <option value="">Choose staff member...</option>
              {availableWorkersToAdd.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} — {w.role}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* Compliance block notice */}
      <ConfirmDialog
        open={!!assignBlockedReason}
        onOpenChange={(open) => {
          if (!open) setAssignBlockedReason(null);
        }}
        tone="destructive"
        tag="Compliance check failed"
        title="Cannot Assign Staff Member"
        confirmLabel="Understood"
        cancelLabel="Close"
        onConfirm={() => setAssignBlockedReason(null)}
        message={assignBlockedReason}
      />

      {/* Reallocation conflict warning */}
      <ConfirmDialog
        open={!!reallocateTarget}
        onOpenChange={(open) => {
          if (!open) setReallocateTarget(null);
        }}
        tone="destructive"
        tag="Scheduling conflict"
        title="Reallocate Staff Member?"
        confirmLabel="Reallocate"
        onConfirm={executeReallocate}
        message={
          reallocateTarget &&
          `This staff member is already assigned to ${reallocateTarget.currentJobName} today. Reallocating will remove them from that job and assign them here instead.`
        }
      />

      {/* Remove staff confirmation */}
      <ConfirmDialog
        open={!!removeStaffTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveStaffTarget(null);
        }}
        tone="destructive"
        title="Remove Staff Member?"
        confirmLabel="Remove"
        onConfirm={executeRemoveStaff}
        message={
          removeStaffTarget && `Remove ${removeStaffTarget.name} from this job site's schedule?`
        }
      />

      {/* View document warning */}
      <ConfirmDialog
        open={!!viewDocTarget}
        onOpenChange={(open) => {
          if (!open) setViewDocTarget(null);
        }}
        tone="neutral"
        tag="External file"
        title="Open This Document?"
        confirmLabel="View Document"
        onConfirm={executeViewDocument}
        message={
          viewDocTarget &&
          `This opens "${viewDocTarget.file_name}" in a new tab. This access is recorded in the job's audit log.`
        }
      />

      {/* Delete attachment warning */}
      <ConfirmDialog
        open={!!deleteAttachmentTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteAttachmentTarget(null);
        }}
        tone="destructive"
        title="Delete Attachment?"
        confirmLabel="Delete"
        onConfirm={executeDeleteAttachment}
        message={
          deleteAttachmentTarget &&
          `Permanently delete "${deleteAttachmentTarget.file_name}"? This cannot be undone.`
        }
      />

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
                        className={`font-semibold uppercase tracking-wider text-[10px] ${
                          changed
                            ? "text-amber-400/70 [.light-theme_&]:text-amber-800/80"
                            : "text-muted-foreground"
                        }`}
                      >
                        {JOB_FIELD_LABELS[f]}
                      </span>
                      <div className="flex items-center gap-2 text-right">
                        {changed && newVal != null && (
                          <span className="line-through text-muted-foreground text-[11px]">
                            {newVal}
                          </span>
                        )}
                        {changed && newVal != null && (
                          <span className="text-muted-foreground text-[10px]">→</span>
                        )}
                        <span
                          className={`font-bold ${
                            changed ? "text-amber-300 [.light-theme_&]:text-amber-800" : "text-foreground"
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
