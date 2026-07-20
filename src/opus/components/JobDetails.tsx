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
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Job, Worker } from "../types/erp";
import { supabase } from "../../integrations/supabase/client";
import { OSMMap } from "./OSMMap";
import { useJobForecast, getWeatherOnDate, geocodePostcode } from "../utils/weather";
import { toLocalISODate } from "../utils/week";

interface PourLog {
  id: string;
  pourNumber: number;
  date: string;
  mixType: string;
  volumeM3: number;
  status: "completed" | "on-hold";
  notes: string;
}

interface JobDetailsProps {
  job: Job;
  workers: Worker[];
  onBack: () => void;
  onUpdateJob: (updatedJob: Job) => void;
  backLabel?: string;
}

export const JobDetails: React.FC<JobDetailsProps> = ({
  job,
  workers,
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

  // Attachments state
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploadingPhotoBefore, setUploadingPhotoBefore] = useState(false);
  const [uploadingPhotoAfter, setUploadingPhotoAfter] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Weather & Suppliers state
  const { forecast, loading: loadingWeather } = useJobForecast(job.postcode);
  const weatherData = getWeatherOnDate(forecast, toLocalISODate(new Date()));
  const [siteCoords, setSiteCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // Staff on site state
  const [staffOnSite, setStaffOnSite] = useState<Worker[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Sync state if job prop updates
  useEffect(() => {
    setStatus(job.status);
    setCurrentPours(job.currentPours || 0);
    setContractMaxPours(job.contractMaxPours || 0);

    // Fetch initial details
    fetchAttachments();
    fetchStaffOnSite();
    geocodeAndFetchWeatherAndSuppliers();
  }, [job]);

  // Load mocks of pour logs for this specific job
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
  }, [job.id, job.currentPours]);

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
        uploaded_by: "Supervisor",
      });

      if (insertError) throw insertError;

      await fetchAttachments();
    } catch (err) {
      console.error("Error uploading attachment:", err);
    } finally {
      setUploadingPhotoBefore(false);
      setUploadingPhotoAfter(false);
      setUploadingDoc(false);
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

  const fetchStaffOnSite = async () => {
    setLoadingStaff(true);
    try {
      const { data, error } = await supabase
        .from("shifts")
        .select("worker_id")
        .eq("job_id", job.id);

      if (data) {
        const workerIds = Array.from(new Set(data.map((s: any) => s.worker_id)));
        const onsite = workers.filter((w) => workerIds.includes(w.id));
        setStaffOnSite(onsite);
      }
    } catch (err) {
      console.error("Error fetching staff on site:", err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleStatusChange = (newStatus: Job["status"]) => {
    setStatus(newStatus);
    onUpdateJob({ ...job, status: newStatus });
  };

  const handleAddPourSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPourNumber = currentPours + 1;
    const newLog: PourLog = {
      id: `${job.id}-pour-${Date.now()}`,
      pourNumber: newPourNumber,
      date: new Date().toISOString().split("T")[0],
      mixType: newPourMix,
      volumeM3: Number(newPourVolume),
      status: "completed",
      notes: newPourNotes || `Manual entry pour #${newPourNumber}`,
    };

    const updatedLogs = [newLog, ...pourLogs];
    setPourLogs(updatedLogs);

    const nextPourCount = currentPours + 1;
    setCurrentPours(nextPourCount);

    onUpdateJob({
      ...job,
      currentPours: nextPourCount,
    });

    setIsAddingPour(false);
    setNewPourNotes("");
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
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium text-sm transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          <span>{backLabel}</span>
        </button>
        <div className="text-xs font-semibold bg-secondary border border-border text-muted-foreground px-3 py-1 rounded-md font-mono">
          {job.jobRef.replace("-X", "")}
        </div>
      </div>

      {/* Title & Contractor info */}
      <div className="space-y-1 pb-2">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{job.siteName}</h1>
        <p className="text-sm text-muted-foreground">
          {job.mainContractor} · <span className="font-mono">{job.postcode}</span>
        </p>
      </div>

      {/* Main Grid: Status, Progress, and Live Weather */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Project Status Selector Card */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-4">
            Project Status
          </div>
          <div className="grid grid-cols-3 bg-background p-1 rounded-lg border border-border gap-1">
            {(["in-progress", "pending", "completed"] as const).map((s) => {
              const isActive =
                (s === "in-progress" && status === "in-progress") ||
                (s === "pending" && status === "pending") ||
                (s === "completed" && status === "completed");
              return (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`min-w-0 text-center py-2.5 px-1 rounded-md text-[9px] sm:text-[11px] font-bold uppercase tracking-tight sm:tracking-wider leading-tight whitespace-normal transition-all cursor-pointer ${
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s === "in-progress" ? "In Progress" : s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pour Progress Card */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-3">
            Pour Progress
          </div>
          <div className="flex justify-between items-baseline mb-2 gap-2">
            <span className="text-sm font-semibold text-foreground truncate">
              {currentPours} of {contractMaxPours} contracted
            </span>
            <span className="text-primary text-sm font-bold">{pourPercent}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (currentPours / (contractMaxPours || 1)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Live Weather Card */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
            Live Weather Risk
          </div>
          {loadingWeather ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader className="w-4 h-4 animate-spin text-primary" />
              <span>Fetching Weather...</span>
            </div>
          ) : weatherData ? (
            <div className="flex items-center justify-between mt-2">
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
            <p className="text-xs text-muted-foreground mt-2">Weather details unavailable.</p>
          )}
        </div>
      </div>

      {/* Secondary sections: Suppliers/Map, Diary+Staff, Attachments */}
      <Tabs defaultValue="suppliers" className="w-full">
        <TabsList>
          <TabsTrigger value="suppliers">Site & Suppliers</TabsTrigger>
          <TabsTrigger value="diary">Diary & Staff</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
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
        <div className="p-5 flex flex-col h-full min-h-[420px]">
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
                    <div className="flex justify-between items-start gap-2">
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

      <TabsContent value="diary">
      {/* Project Management Grid: Staff on Site */}
      <div className="grid grid-cols-1 gap-6">
        {/* Staff on Site */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Staff Scheduled On Site
              </h2>
            </div>
            <span className="text-[10px] bg-secondary border border-border text-muted-foreground px-2 py-0.5 rounded font-mono">
              Read Only
            </span>
          </div>

          {loadingStaff ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-8">
              <Loader className="w-4 h-4 animate-spin text-primary" />
              <span>Loading staff matrix...</span>
            </div>
          ) : Object.keys(groupedStaff).length > 0 ? (
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {Object.keys(groupedStaff).map((roleName) => (
                <div key={roleName} className="space-y-1.5">
                  <div className="text-[10px] text-primary font-bold uppercase tracking-wider border-b border-border pb-1">
                    {roleName} ({groupedStaff[roleName].length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {groupedStaff[roleName].map((w) => (
                      <div
                        key={w.id}
                        className="bg-background border border-border rounded-lg p-2.5 flex items-center justify-between"
                      >
                        <span className="text-xs font-bold text-foreground">{w.name}</span>
                        {w.postcode && (
                          <span className="text-[9px] text-muted-foreground font-mono">{w.postcode}</span>
                        )}
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
      </TabsContent>

      <TabsContent value="attachments">
      {/* Attachments Section: Photos and Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Before & After Photo Gallery */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
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
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
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
            </div>
          </div>

          {/* Documents List */}
          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
            {projectDocs.map((d) => (
              <div
                key={d.id}
                className="flex justify-between items-center p-2.5 bg-background border border-border rounded-lg hover:border-muted-foreground/40 transition-all"
              >
                <div className="flex items-center gap-2 truncate max-w-[70%]">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <a
                    href={d.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-foreground hover:text-primary truncate font-mono"
                  >
                    {d.file_name}
                  </a>
                </div>
                <div className="text-[9px] text-muted-foreground font-medium">
                  {new Date(d.uploaded_at).toLocaleDateString("en-GB")}
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
      </TabsContent>
      </Tabs>

      {/* Pour History Logs Card */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-foreground">Pour History</h2>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddingPour(!isAddingPour)}
              className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-colors cursor-pointer border bg-card border-border hover:bg-secondary text-foreground"
            >
              {isAddingPour ? "Cancel" : "+ Log Pour"}
            </button>
          </div>
        </div>

        {isAddingPour && (
          <form
            onSubmit={handleAddPourSubmit}
            className="mb-4 p-4 bg-background border border-border rounded-lg space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                Commit Pour Log
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2.5">
          {pourLogs.map((log) => (
            <div
              key={log.id}
              className="flex justify-between items-center p-4 bg-card border border-border rounded-xl hover:bg-secondary transition-all"
            >
              <div className="space-y-1">
                <div className="text-sm font-bold text-foreground">Pour #{log.pourNumber}</div>
                <div className="text-xs text-muted-foreground">
                  {log.mixType} · {log.volumeM3}m³
                </div>
              </div>
              <div className="text-xs text-muted-foreground font-semibold">{formatPourDate(log.date)}</div>
            </div>
          ))}

          {pourLogs.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground uppercase tracking-wider">
              No pours logged yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
