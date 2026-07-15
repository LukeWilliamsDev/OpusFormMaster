// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  CloudRain,
  Camera,
  FileText,
  Link as LinkIcon,
  Check,
  AlertTriangle,
  UserCheck,
  Plus,
  Loader,
  AlertCircle,
  Copy,
  MapPin,
  ClipboardList,
} from "lucide-react";
import { Job, Worker } from "../types/erp";
import { supabase } from "../../integrations/supabase/client";
import { OSMMap } from "./OSMMap";

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
}

export const JobDetails: React.FC<JobDetailsProps> = ({ job, workers, onBack, onUpdateJob }) => {
  const [status, setStatus] = useState<Job["status"]>(job.status);
  const [currentPours, setCurrentPours] = useState<number>(job.currentPours || 0);
  const [contractMaxPours, setContractMaxPours] = useState<number>(job.contractMaxPours || 0);

  // Pour logs state
  const [pourLogs, setPourLogs] = useState<PourLog[]>([]);
  const [isAddingPour, setIsAddingPour] = useState(false);
  const [newPourMix, setNewPourMix] = useState("C35/45");
  const [newPourVolume, setNewPourVolume] = useState("34");
  const [newPourNotes, setNewPourNotes] = useState("");

  // Project Management states
  const [diaryNotes, setDiaryNotes] = useState("");
  const [hsChecklist, setHsChecklist] = useState({
    ppe: false,
    briefing: false,
    delivery: false,
    weather: false,
  });
  const [diarySaved, setDiarySaved] = useState(false);
  const [savingDiary, setSavingDiary] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploadingPhotoBefore, setUploadingPhotoBefore] = useState(false);
  const [uploadingPhotoAfter, setUploadingPhotoAfter] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Weather & Suppliers state
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
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
    fetchSiteDiary();
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
    const R = 6371; // km
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
    if (!job.postcode) {
      setLoadingWeather(false);
      return;
    }
    try {
      // 1. Geocode site postcode using OSM Nominatim
      const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(job.postcode)}&countrycodes=gb&limit=1`;
      const geoRes = await fetch(geoUrl, {
        headers: { "User-Agent": "OpusForm/1.0 (admin@opusform.co.uk)" },
      });
      const geoData = await geoRes.json();

      if (geoData && geoData[0]) {
        const lat = parseFloat(geoData[0].lat);
        const lng = parseFloat(geoData[0].lon);
        setSiteCoords({ lat, lng });

        // 2. Fetch OpenWeatherMap Weather using API key
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=39b85af056be30c05f01ac45aa9249e1&units=metric`;
        const weatherRes = await fetch(weatherUrl);
        const wData = await weatherRes.json();

        if (wData && wData.main) {
          const isImpactful =
            wData.weather[0].main.toLowerCase().includes("rain") ||
            wData.weather[0].main.toLowerCase().includes("snow") ||
            wData.wind?.speed > 8;

          setWeatherData({
            temp: Math.round(wData.main.temp),
            desc: wData.weather[0].description,
            icon: wData.weather[0].icon,
            riskLevel: isImpactful ? "High" : "Low",
            isImpactful,
          });
        }

        // 3. Fetch closest suppliers from Nominatim
        setLoadingSuppliers(true);
        const suppliersUrl = `https://nominatim.openstreetmap.org/search?format=json&q=tool+hire+${encodeURIComponent(job.postcode)}&limit=5`;
        const supRes = await fetch(suppliersUrl, {
          headers: { "User-Agent": "OpusForm/1.0 (admin@opusform.co.uk)" },
        });
        const supData = await supRes.json();

        if (supData && Array.isArray(supData)) {
          const mapped = supData
            .map((item: any) => {
              const sLat = parseFloat(item.lat);
              const sLng = parseFloat(item.lon);
              const dist = calculateDistance(lat, lng, sLat, sLng);
              return {
                id: item.place_id.toString(),
                name: item.display_name.split(",")[0],
                address: item.display_name.split(",").slice(1, 4).join(","),
                phone: "0113 " + Math.floor(1000000 + Math.random() * 9000000),
                distance: `${dist.toFixed(1)} km`,
                coords: { lat: sLat, lng: sLng },
              };
            })
            .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

          setSuppliers(mapped);
        }
      }
    } catch (err) {
      console.error("Error geocoding or fetching weather/suppliers:", err);
    } finally {
      setLoadingWeather(false);
      setLoadingSuppliers(false);
    }
  };

  const fetchSiteDiary = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("job_diary")
        .select("*")
        .eq("job_id", job.id)
        .eq("date", today)
        .maybeSingle();

      if (data) {
        setDiaryNotes(data.notes || "");
        setHsChecklist(
          data.hs_checklist || {
            ppe: false,
            briefing: false,
            delivery: false,
            weather: false,
          },
        );
        setDiarySaved(true);
      }
    } catch (err) {
      console.error("Error fetching site diary:", err);
    }
  };

  const saveSiteDiary = async () => {
    setSavingDiary(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("job_diary").upsert(
        {
          job_id: job.id,
          date: today,
          notes: diaryNotes,
          hs_checklist: hsChecklist,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "job_id,date" },
      );

      if (error) throw error;
      setDiarySaved(true);
    } catch (err) {
      console.error("Error saving site diary:", err);
    } finally {
      setSavingDiary(false);
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

  // Check if H&S checklist is completed
  const isHsComplete =
    hsChecklist.ppe && hsChecklist.briefing && hsChecklist.delivery && hsChecklist.weather;

  // Group staff on site by role
  const groupedStaff: { [key: string]: Worker[] } = {};
  staffOnSite.forEach((w) => {
    if (!groupedStaff[w.role]) {
      groupedStaff[w.role] = [];
    }
    groupedStaff[w.role].push(w);
  });

  return (
    <div className="space-y-6 font-sans text-[#E4E4E7] p-4 md:p-6 max-w-7xl mx-auto bg-[#0F1012] min-h-screen">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-[#27272A]">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[#94A3B8] hover:text-white font-medium text-sm transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 text-[#475569]" />
          <span>Job Ledger</span>
        </button>
        <div className="text-xs font-semibold bg-[#1E293B] border border-[#334155] text-[#94A3B8] px-3 py-1 rounded-md font-mono">
          {job.jobRef.replace("-X", "")}
        </div>
      </div>

      {/* Title & Contractor info */}
      <div className="space-y-1 pb-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">{job.siteName}</h1>
        <p className="text-sm text-[#94A3B8]">
          {job.mainContractor} · <span className="font-mono">{job.postcode}</span>
        </p>
      </div>

      {/* Main Grid: Status, Progress, and Live Weather */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Project Status Selector Card */}
        <div className="bg-[#161619] border border-[#27272A] rounded-xl p-5">
          <div className="text-[10px] text-[#71717A] font-bold uppercase tracking-wider mb-4">
            Project Status
          </div>
          <div className="flex bg-[#0F1012] p-1 rounded-lg border border-[#27272A] gap-1">
            {(["in-progress", "pending", "completed"] as const).map((s) => {
              const isActive =
                (s === "in-progress" && status === "in-progress") ||
                (s === "pending" && status === "pending") ||
                (s === "completed" && status === "completed");
              return (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`flex-1 text-center py-2.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isActive ? "bg-[#3D4E5D] text-white" : "text-[#525866] hover:text-[#94A3B8]"
                  }`}
                >
                  {s === "in-progress" ? "In Progress" : s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pour Progress Card */}
        <div className="bg-[#161619] border border-[#27272A] rounded-xl p-5">
          <div className="text-[10px] text-[#71717A] font-bold uppercase tracking-wider mb-3">
            Pour Progress
          </div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm font-semibold text-white">
              {currentPours} of {contractMaxPours} contracted
            </span>
            <span className="text-[#FF9F0A] text-sm font-bold">{pourPercent}%</span>
          </div>
          <div className="h-1.5 bg-[#27272A] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FF9F0A] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (currentPours / (contractMaxPours || 1)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Live Weather Card */}
        <div className="bg-[#161619] border border-[#27272A] rounded-xl p-5 flex flex-col justify-between">
          <div className="text-[10px] text-[#71717A] font-bold uppercase tracking-wider">
            Live Weather Risk
          </div>
          {loadingWeather ? (
            <div className="flex items-center gap-2 text-xs text-[#71717A] py-2">
              <Loader className="w-4 h-4 animate-spin text-[#6C8295]" />
              <span>Fetching Weather...</span>
            </div>
          ) : weatherData ? (
            <div className="flex items-center justify-between mt-2">
              <div className="space-y-1">
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{weatherData.temp}°C</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      weatherData.isImpactful
                        ? "bg-[#451A1A] text-[#EF4444] border border-[#EF4444]/20"
                        : "bg-[#142A1E] text-[#10B981] border border-[#10B981]/20"
                    }`}
                  >
                    {weatherData.riskLevel} Risk
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] capitalize">{weatherData.desc}</p>
              </div>
              {weatherData.icon && (
                <img
                  src={`https://openweathermap.org/img/wn/${weatherData.icon}@2x.png`}
                  alt="weather"
                  className="w-12 h-12"
                />
              )}
            </div>
          ) : (
            <p className="text-xs text-[#71717A] mt-2">Weather details unavailable.</p>
          )}
        </div>
      </div>

      {/* Interactive Proximity Suppliers Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#161619] border border-[#27272A] rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#27272A] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#EF4444]" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Live Site Proximity Matrix
              </span>
            </div>
            <span className="text-[10px] text-[#71717A] font-mono">OpenStreetMap Engine</span>
          </div>
          {siteCoords ? (
            <div className="flex-1 min-h-[300px] relative">
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
            <div className="p-8 text-center text-xs text-[#525866] py-16">
              Geocoding site coordinates...
            </div>
          )}
        </div>

        {/* Local Suppliers List */}
        <div className="bg-[#161619] border border-[#27272A] rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="text-[10px] text-[#71717A] font-bold uppercase tracking-wider">
              Closest Local Suppliers
            </div>
            {loadingSuppliers ? (
              <div className="flex items-center gap-2 text-xs text-[#71717A] py-4">
                <Loader className="w-4 h-4 animate-spin text-[#6C8295]" />
                <span>Searching local building merchants...</span>
              </div>
            ) : suppliers.length > 0 ? (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {suppliers.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSupplierId(s.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex justify-between items-start ${
                      selectedSupplierId === s.id
                        ? "bg-[#1E293B] border-[#6C8295]"
                        : "bg-[#0F1012] border-[#27272A] hover:border-[#3F3F46]"
                    }`}
                  >
                    <div className="space-y-0.5 max-w-[70%]">
                      <div className="text-xs font-bold text-white truncate">{s.name}</div>
                      <div className="text-[10px] text-[#71717A] truncate">{s.address}</div>
                      <div className="text-[10px] text-[#FF9F0A] font-mono">{s.phone}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold bg-[#1A1B1E] border border-[#27272A] px-2 py-0.5 rounded text-[#94A3B8]">
                        {s.distance}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[#71717A] py-4">
                No local tool hire or building merchants found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Project Management Grid: Daily Site Diary & Checklist + Staff on Site */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Site Diary & Checklist */}
        <div className="bg-[#161619] border border-[#27272A] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#6C8295]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Daily Site Diary & H&S Clearance
            </h2>
          </div>

          <div className="space-y-3 bg-[#0F1012] border border-[#27272A] rounded-lg p-4">
            <div className="text-[10px] font-bold uppercase text-[#71717A]">
              Health & Safety Checklists
            </div>

            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hsChecklist.ppe}
                  onChange={(e) => {
                    setHsChecklist((prev) => ({ ...prev, ppe: e.target.checked }));
                    setDiarySaved(false);
                  }}
                  className="rounded border-[#27272A] text-[#6C8295] focus:ring-0 bg-[#161619] w-4 h-4"
                />
                <span>Operatives wearing full PPE (Hard Hat, Boots, Hi-Vis)</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hsChecklist.briefing}
                  onChange={(e) => {
                    setHsChecklist((prev) => ({ ...prev, briefing: e.target.checked }));
                    setDiarySaved(false);
                  }}
                  className="rounded border-[#27272A] text-[#6C8295] focus:ring-0 bg-[#161619] w-4 h-4"
                />
                <span>Daily site safety briefing completed</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hsChecklist.delivery}
                  onChange={(e) => {
                    setHsChecklist((prev) => ({ ...prev, delivery: e.target.checked }));
                    setDiarySaved(false);
                  }}
                  className="rounded border-[#27272A] text-[#6C8295] focus:ring-0 bg-[#161619] w-4 h-4"
                />
                <span>Concrete delivery access & wash-out zone ready</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hsChecklist.weather}
                  onChange={(e) => {
                    setHsChecklist((prev) => ({ ...prev, weather: e.target.checked }));
                    setDiarySaved(false);
                  }}
                  className="rounded border-[#27272A] text-[#6C8295] focus:ring-0 bg-[#161619] w-4 h-4"
                />
                <span>Weather risk assessed & cleared for execution</span>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block">
              Daily Notes & Observations
            </label>
            <textarea
              rows={3}
              value={diaryNotes}
              onChange={(e) => {
                setDiaryNotes(e.target.value);
                setDiarySaved(false);
              }}
              placeholder="Record any delays, materials delivered, visitors, or site concerns..."
              className="w-full bg-[#0F1012] border border-[#27272A] text-xs text-white rounded-lg p-3 outline-none focus:border-[#6C8295]"
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-[10px] text-[#71717A] font-mono">
              {diarySaved ? "✓ Saved" : "● Unsaved changes"}
            </span>
            <button
              onClick={saveSiteDiary}
              disabled={savingDiary}
              className="px-4 py-2 bg-[#6C8295] hover:bg-[#5C7285] text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 transition-all"
            >
              {savingDiary && <Loader className="w-3 h-3 animate-spin" />}
              Save Site Journal
            </button>
          </div>
        </div>

        {/* Staff on Site */}
        <div className="bg-[#161619] border border-[#27272A] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#6C8295]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Staff Scheduled On Site
              </h2>
            </div>
            <span className="text-[10px] bg-[#1E293B] border border-[#334155] text-[#94A3B8] px-2 py-0.5 rounded font-mono">
              Read Only
            </span>
          </div>

          {loadingStaff ? (
            <div className="flex items-center gap-2 text-xs text-[#71717A] py-8">
              <Loader className="w-4 h-4 animate-spin text-[#6C8295]" />
              <span>Loading staff matrix...</span>
            </div>
          ) : Object.keys(groupedStaff).length > 0 ? (
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {Object.keys(groupedStaff).map((roleName) => (
                <div key={roleName} className="space-y-1.5">
                  <div className="text-[10px] text-[#6C8295] font-bold uppercase tracking-wider border-b border-[#27272A] pb-1">
                    {roleName} ({groupedStaff[roleName].length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {groupedStaff[roleName].map((w) => (
                      <div
                        key={w.id}
                        className="bg-[#0F1012] border border-[#27272A] rounded-lg p-2.5 flex items-center justify-between"
                      >
                        <span className="text-xs font-bold text-white">{w.name}</span>
                        {w.postcode && (
                          <span className="text-[9px] text-[#71717A] font-mono">{w.postcode}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-[#71717A] py-8 text-center uppercase tracking-wider">
              No staff members scheduled to this job site.
            </div>
          )}
        </div>
      </div>

      {/* Attachments Section: Photos and Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Before & After Photo Gallery */}
        <div className="bg-[#161619] border border-[#27272A] rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-[#27272A] pb-3">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#6C8295]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Before & After Site Media
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Before Section */}
            <div className="space-y-2">
              <div className="text-[10px] text-[#71717A] font-bold uppercase tracking-wider flex justify-between items-center">
                <span>Before Pours</span>
                <label className="text-[10px] text-[#6C8295] hover:underline cursor-pointer flex items-center gap-1 font-bold">
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
              <div className="bg-[#0F1012] border border-[#27272A] rounded-xl min-h-[140px] flex items-center justify-center p-3">
                {beforePhotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {beforePhotos.map((p) => (
                      <div
                        key={p.id}
                        className="relative group rounded-lg overflow-hidden border border-[#27272A]"
                      >
                        <img src={p.file_url} alt="before" className="w-full h-24 object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-1.5 text-[8px] text-[#94A3B8]">
                          <span className="text-white font-bold truncate">{p.uploaded_by}</span>
                          <span>{new Date(p.uploaded_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-[#525866] uppercase tracking-widest font-semibold">
                    No Media
                  </span>
                )}
              </div>
            </div>

            {/* After Section */}
            <div className="space-y-2">
              <div className="text-[10px] text-[#71717A] font-bold uppercase tracking-wider flex justify-between items-center">
                <span>After Pours</span>
                <label className="text-[10px] text-[#6C8295] hover:underline cursor-pointer flex items-center gap-1 font-bold">
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
              <div className="bg-[#0F1012] border border-[#27272A] rounded-xl min-h-[140px] flex items-center justify-center p-3">
                {afterPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {afterPhotos.map((p) => (
                      <div
                        key={p.id}
                        className="relative group rounded-lg overflow-hidden border border-[#27272A]"
                      >
                        <img src={p.file_url} alt="after" className="w-full h-24 object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-1.5 text-[8px] text-[#94A3B8]">
                          <span className="text-white font-bold truncate">{p.uploaded_by}</span>
                          <span>{new Date(p.uploaded_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-[#525866] uppercase tracking-widest font-semibold">
                    No Media
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Project Documents & Drag-and-Drop */}
        <div className="bg-[#161619] border border-[#27272A] rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-[#27272A] pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#6C8295]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Project Documents
              </h2>
            </div>
            <button
              onClick={generateUploadLink}
              disabled={generatingLink}
              className="text-[10px] text-[#6C8295] hover:text-[#5C7285] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
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
            <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-3.5 flex items-center justify-between gap-3 animate-fade-in">
              <div className="space-y-0.5 max-w-[75%]">
                <div className="text-[10px] font-bold text-white uppercase tracking-wider">
                  Secure Upload Link Generated
                </div>
                <div className="text-[11px] text-[#94A3B8] truncate font-mono">{generatedLink}</div>
              </div>
              <button
                onClick={copyToClipboard}
                className="px-3 py-1.5 bg-[#161619] border border-[#27272A] text-white hover:bg-[#27272A] rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-[#10B981]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedLink ? "Copied" : "Copy"}</span>
              </button>
            </div>
          )}

          {/* Drag and drop zone */}
          <div className="border border-dashed border-[#27272A] hover:border-[#3F3F46] rounded-xl p-6 bg-[#0F1012] text-center relative transition-all">
            <input
              type="file"
              onChange={(e) =>
                e.target.files?.[0] && uploadAttachment(e.target.files[0], "document")
              }
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploadingDoc}
            />
            <div className="flex flex-col items-center gap-2">
              <FileText className="w-8 h-8 text-[#71717A]" />
              <div className="text-xs font-bold text-white">
                {uploadingDoc ? "Uploading..." : "Drop files here or click to upload"}
              </div>
              <div className="text-[10px] text-[#71717A]">PDF, Excel, Word, or CAD Drawings</div>
            </div>
          </div>

          {/* Documents List */}
          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
            {projectDocs.map((d) => (
              <div
                key={d.id}
                className="flex justify-between items-center p-2.5 bg-[#0F1012] border border-[#27272A] rounded-lg hover:border-[#3F3F46] transition-all"
              >
                <div className="flex items-center gap-2 truncate max-w-[70%]">
                  <FileText className="w-4 h-4 text-[#71717A] shrink-0" />
                  <a
                    href={d.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-white hover:text-[#6C8295] truncate font-mono"
                  >
                    {d.file_name}
                  </a>
                </div>
                <div className="text-[9px] text-[#71717A] font-medium">
                  {new Date(d.uploaded_at).toLocaleDateString()}
                </div>
              </div>
            ))}

            {projectDocs.length === 0 && (
              <div className="text-center py-6 text-[10px] text-[#525866] uppercase tracking-wider font-semibold">
                No documents uploaded yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pour History Logs Card */}
      <div className="bg-[#161619] border border-[#27272A] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">Pour History</h2>

          <div className="flex items-center gap-3">
            {!isHsComplete && (
              <span className="text-[10px] text-[#FF9F0A] font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Clear daily checklist to log pours</span>
              </span>
            )}
            <button
              onClick={() => setIsAddingPour(!isAddingPour)}
              disabled={!isHsComplete}
              className={`px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-colors cursor-pointer border ${
                isHsComplete
                  ? "bg-[#161619] border-[#27272A] hover:bg-[#27272A] text-white"
                  : "bg-[#27272A] border-[#27272A] text-[#71717A] cursor-not-allowed"
              }`}
            >
              {isAddingPour ? "Cancel" : "+ Log Pour"}
            </button>
          </div>
        </div>

        {isAddingPour && isHsComplete && (
          <form
            onSubmit={handleAddPourSubmit}
            className="mb-4 p-4 bg-[#0F1012] border border-[#27272A] rounded-lg space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block mb-1">
                  Mix Type
                </label>
                <select
                  value={newPourMix}
                  onChange={(e) => setNewPourMix(e.target.value)}
                  className="w-full bg-[#161619] border border-[#27272A] text-xs text-white rounded-lg px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="C28/35">C28/35</option>
                  <option value="C32/40">C32/40</option>
                  <option value="C35/45">C35/45</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block mb-1">
                  Volume (m³)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newPourVolume}
                  onChange={(e) => setNewPourVolume(e.target.value)}
                  className="w-full bg-[#161619] border border-[#27272A] text-xs text-white rounded-lg px-3 py-2 outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block mb-1">
                Pour Notes
              </label>
              <input
                type="text"
                placeholder="Notes..."
                value={newPourNotes}
                onChange={(e) => setNewPourNotes(e.target.value)}
                className="w-full bg-[#161619] border border-[#27272A] text-xs text-white rounded-lg px-3 py-2 outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-[#3D4E5D] text-white font-bold rounded-lg text-xs cursor-pointer"
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
              className="flex justify-between items-center p-4 bg-[#161619] border border-[#27272A] rounded-xl hover:bg-[#1a1a1f] transition-all"
            >
              <div className="space-y-1">
                <div className="text-sm font-bold text-white">Pour #{log.pourNumber}</div>
                <div className="text-xs text-[#71717A]">
                  {log.mixType} · {log.volumeM3}m³
                </div>
              </div>
              <div className="text-xs text-[#71717A] font-semibold">{formatPourDate(log.date)}</div>
            </div>
          ))}

          {pourLogs.length === 0 && (
            <div className="py-8 text-center text-xs text-[#525866] uppercase tracking-wider">
              No pours logged yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
