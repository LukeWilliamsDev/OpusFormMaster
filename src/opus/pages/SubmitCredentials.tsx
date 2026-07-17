import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../../integrations/supabase/client";
import {
  ShieldAlert,
  FileUp,
  Check,
  AlertCircle,
  Calendar,
  Plus,
  X,
  ChevronRight,
  ChevronLeft,
  FileText,
  Edit3,
  Loader,
} from "lucide-react";
import { ON_SITE_CERTIFICATIONS } from "../components/RosterView";

/* ─── Types ──────────────────────────────────────────────────────── */

interface UploadSlot {
  id: string;
  cert: string;
  file: File | null;
  expiryDate: string;
  uploading: boolean;
  progress: number;
  uploadedUrl: string | null;
  error: string | null;
  /** Thumbnail data-URL for image files */
  thumbnailUrl: string | null;
  /** Auto-generated filename displayed in the UI */
  displayFilename: string | null;
}

const makeSlotId = () => `slot-${Math.random().toString(36).slice(2)}`;

const emptySlot = (): UploadSlot => ({
  id: makeSlotId(),
  cert: ON_SITE_CERTIFICATIONS[0],
  file: null,
  expiryDate: "",
  uploading: false,
  progress: 0,
  uploadedUrl: null,
  error: null,
  thumbnailUrl: null,
  displayFilename: null,
});

/* ─── Helpers ────────────────────────────────────────────────────── */

/** Derive initials from a name, e.g. "Luke Williams" → "LW" */
const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join("");

/** Derive a slug from a cert name, e.g. "CSCS Labourer Card" → "CSCS-LABOURER-CARD" */
const certSlug = (cert: string): string =>
  cert
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Build the auto-renamed filename */
const buildFilename = (staffName: string, cert: string, originalExt: string): string => {
  const initials = getInitials(staffName);
  const slug = certSlug(cert);
  return `${initials}_${slug}.${originalExt.toLowerCase()}`;
};

/** Read an image File as a data-URL for thumbnail previews */
const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

/* ─── Circular Progress Ring ────────────────────────────────────── */

const ProgressRing: React.FC<{ progress: number; size?: number }> = ({
  progress,
  size = 64,
}) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-brand-accent transition-all duration-300"
      />
    </svg>
  );
};

/* ─── Animated Checkmark (Success) ───────────────────────────────── */

const AnimatedCheckmark: React.FC = () => (
  <div className="relative w-20 h-20 mx-auto">
    <svg viewBox="0 0 80 80" className="w-full h-full">
      {/* Outer circle – scale in */}
      <circle
        cx="40"
        cy="40"
        r="36"
        fill="none"
        stroke="rgba(52,211,153,0.2)"
        strokeWidth="3"
        className="animate-[scaleIn_0.4s_ease-out_forwards]"
        style={{ transformOrigin: "center" }}
      />
      {/* Inner glow circle */}
      <circle
        cx="40"
        cy="40"
        r="28"
        fill="rgba(52,211,153,0.06)"
        className="animate-[scaleIn_0.5s_ease-out_0.1s_forwards]"
        style={{ transformOrigin: "center", opacity: 0 }}
      />
      {/* Checkmark path – draw in */}
      <path
        d="M24 42 L34 52 L56 30"
        fill="none"
        stroke="#34d399"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-[drawCheck_0.5s_ease-out_0.3s_forwards]"
        style={{ strokeDasharray: 60, strokeDashoffset: 60 }}
      />
    </svg>
  </div>
);

/* ─── Stepper ────────────────────────────────────────────────────── */

interface StepperProps {
  steps: string[];
  currentStep: number;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => (
  <div className="flex items-center justify-center gap-1.5 flex-wrap px-2">
    {steps.map((label, idx) => {
      const isCompleted = idx < currentStep;
      const isActive = idx === currentStep;
      return (
        <React.Fragment key={idx}>
          {idx > 0 && (
            <div
              className={`hidden sm:block h-px w-4 transition-colors duration-300 ${
                isCompleted ? "bg-brand-accent" : "bg-white/10"
              }`}
            />
          )}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
              isActive
                ? "bg-brand-accent/15 text-brand-accent border border-brand-accent/30 shadow-[0_0_12px_rgba(0,191,165,0.15)]"
                : isCompleted
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-white/5 text-zinc-500 border border-white/5"
            }`}
          >
            {isCompleted ? (
              <Check className="w-3 h-3" />
            ) : (
              <span className="w-3 text-center">{idx + 1}</span>
            )}
            <span className="hidden sm:inline max-w-[80px] truncate">{label}</span>
          </div>
        </React.Fragment>
      );
    })}
  </div>
);

/* ─── Dropzone ───────────────────────────────────────────────────── */

interface DropzoneProps {
  slot: UploadSlot;
  onFileSelected: (file: File) => void;
  onRemoveFile: () => void;
}

const Dropzone: React.FC<DropzoneProps> = ({ slot, onFileSelected, onRemoveFile }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files?.[0]) onFileSelected(e.dataTransfer.files[0]);
    },
    [onFileSelected],
  );

  // Uploading state — show progress ring
  if (slot.uploading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 rounded-2xl border-2 border-dashed border-brand-accent/30 bg-brand-accent/5">
        <ProgressRing progress={slot.progress} />
        <span className="text-[9px] font-black uppercase tracking-widest text-brand-accent mt-3">
          Uploading… {slot.progress}%
        </span>
      </div>
    );
  }

  // Selected state — show preview
  if (slot.file) {
    return (
      <div className="rounded-2xl border border-brand-accent/20 bg-brand-accent/5 p-4 space-y-3">
        <div className="flex items-start gap-3">
          {/* Thumbnail or file icon */}
          {slot.thumbnailUrl ? (
            <img
              src={slot.thumbnailUrl}
              alt="Preview"
              className="w-16 h-16 rounded-xl object-cover border border-white/10"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <FileText className="w-7 h-7 text-zinc-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-full bg-brand-accent/10 flex items-center justify-center border border-brand-accent/20">
                <Check className="w-3 h-3 text-brand-accent" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-accent">
                Selected
              </span>
            </div>
            {slot.displayFilename && (
              <p className="text-[10px] font-mono text-zinc-400 truncate" title={slot.displayFilename}>
                {slot.displayFilename}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onRemoveFile}
            className="shrink-0 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer p-1"
            aria-label="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Empty state — dropzone
  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center py-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 ${
        dragActive
          ? "border-brand-accent bg-brand-accent/5 shadow-[0_0_24px_rgba(0,191,165,0.1)]"
          : "border-zinc-700 hover:border-brand-accent/40 bg-black/10"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) onFileSelected(e.target.files[0]);
        }}
      />
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 ${
          dragActive
            ? "bg-brand-accent/15 border border-brand-accent/30"
            : "bg-white/5 border border-white/10"
        }`}
      >
        <FileUp
          className={`w-5 h-5 transition-colors duration-300 ${
            dragActive ? "text-brand-accent" : "text-zinc-500"
          }`}
        />
      </div>
      {/* Desktop text */}
      <span className="hidden sm:block text-[10px] font-black uppercase tracking-widest text-foreground">
        Drag & Drop or Click to Upload
      </span>
      {/* Mobile text */}
      <span className="sm:hidden text-[10px] font-black uppercase tracking-widest text-foreground">
        Tap to Upload
      </span>
      <span className="text-[8px] text-zinc-500 uppercase tracking-widest mt-1.5">
        PDF, PNG, or JPG — Max 5 MB
      </span>
      {slot.error && (
        <p className="text-[8.5px] font-bold text-red-400 uppercase tracking-wider mt-3 px-4 text-center">
          {slot.error}
        </p>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export const SubmitCredentialsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  /* ─── State ───────────────────────────────────────────────────── */
  const [loading, setLoading] = useState(true);
  const [requestData, setRequestData] = useState<any>(null);
  const [staffName, setStaffName] = useState<string>("");
  const [slots, setSlots] = useState<UploadSlot[]>([]);
  const [openEnded, setOpenEnded] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ─── Derived ─────────────────────────────────────────────────── */
  // Steps = one per cert + "Review"
  const stepLabels = [...slots.map((s) => s.cert.split(" ").slice(0, 2).join(" ")), "Review"];
  const isReviewStep = currentStep === slots.length;
  const totalSteps = stepLabels.length;

  /* ─── Fetch request details ───────────────────────────────────── */
  useEffect(() => {
    if (token) {
      fetchRequestDetails();
    } else {
      setErrorMsg("No upload token provided. Please use a valid submission link.");
      setLoading(false);
    }
  }, [token]);

  const fetchRequestDetails = async () => {
    try {
      // Try the SECURITY DEFINER RPC first (returns worker_name via staff join)
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_document_request_details",
        { p_request_id: token! },
      );

      let reqData: any = null;

      if (!rpcError && rpcData) {
        // RPC succeeded — use its result
        reqData = rpcData;
        setStaffName(rpcData.worker_name || "Staff Member");
      } else {
        // Fallback: direct table query (worker name may be null due to RLS)
        const { data: fallback, error: fallbackError } = await supabase
          .from("document_requests")
          .select("*, staff:worker_id(name)")
          .eq("id", token!)
          .single();

        if (fallbackError || !fallback) {
          throw new Error("Link is invalid, expired, or has already been used.");
        }

        reqData = fallback;
        setStaffName(fallback.staff?.name || "Staff Member");
      }

      setRequestData(reqData);

      const certs = reqData.requested_certs;
      if (!certs || certs.length === 0) {
        setOpenEnded(true);
        setSlots([emptySlot()]);
      } else {
        setSlots(certs.map((cert: string) => ({ ...emptySlot(), cert })));
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      setErrorMsg(err.message || "Access Denied: Invalid or expired upload link.");
    } finally {
      setLoading(false);
    }
  };

  /* ─── Slot helpers ────────────────────────────────────────────── */

  const updateSlot = (index: number, updates: Partial<UploadSlot>) => {
    setSlots((prev) => prev.map((s, idx) => (idx === index ? { ...s, ...updates } : s)));
  };

  const addSlot = () => {
    setSlots((prev) => [...prev, emptySlot()]);
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, idx) => idx !== index));
    // Adjust current step if we removed a step before or at the current position
    if (currentStep >= slots.length - 1) {
      setCurrentStep(Math.max(0, slots.length - 2));
    }
  };

  /* ─── File selection handler ──────────────────────────────────── */

  const handleFileSelected = async (index: number, file: File) => {
    if (!file) return;

    // Validate type
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      updateSlot(index, { error: "Only PDF and image files (PNG, JPG) are allowed." });
      return;
    }

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      updateSlot(index, { error: "File size must be under 5 MB." });
      return;
    }

    // Generate local object URL thumbnail for preview
    let thumbnailUrl: string | null = null;
    if (file.type.startsWith("image/")) {
      thumbnailUrl = URL.createObjectURL(file);
    }

    // Build the auto-renamed filename
    const fileExt = file.name.split(".").pop() || "pdf";
    const displayFilename = buildFilename(staffName, slots[index].cert, fileExt);

    updateSlot(index, {
      file,
      error: null,
      thumbnailUrl,
      displayFilename,
      uploadedUrl: null, // Reset uploaded url if they replace the file
    });
  };

  /* ─── Navigation ──────────────────────────────────────────────── */

  const canAdvance = (): boolean => {
    if (isReviewStep) return false;
    const slot = slots[currentStep];
    if (!slot) return false;
    return !!slot.file && !!slot.expiryDate;
  };

  const goNext = () => {
    if (currentStep < totalSteps - 1) setCurrentStep((s) => s + 1);
  };

  const goBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const goToStep = (idx: number) => {
    setCurrentStep(idx);
  };

  /* ─── Submit handler (uploads files now) ───────────────────────── */

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (slots.length === 0) {
      setErrorMsg("Please add at least one certification.");
      return;
    }

    // Validate all slots locally
    for (const slot of slots) {
      if (!slot.file) {
        setErrorMsg(`Please select a file for: ${slot.cert}`);
        return;
      }
      if (!slot.expiryDate) {
        setErrorMsg(`Please select the Expiration Date for: ${slot.cert}`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const uploadedTickets = [];

      // Upload each file one by one
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        
        // If it was already uploaded, we can skip it, but since we defer, upload now:
        updateSlot(i, { uploading: true, progress: 10 });
        
        const fileExt = slot.file!.name.split(".").pop() || "pdf";
        const slug = certSlug(slot.cert);
        const initials = getInitials(staffName) || "XX";
        const filePath = `requests/${token}/${initials}_${slug}.${fileExt.toLowerCase()}`;

        // Simulate progress for visual feedback
        let simProgress = 10;
        const progressInterval = setInterval(() => {
          simProgress = Math.min(90, simProgress + 20);
          updateSlot(i, { progress: simProgress });
        }, 150);

        const { error: uploadError } = await supabase.storage
          .from("compliance-documents")
          .upload(filePath, slot.file!, {
            cacheControl: "3600",
            upsert: true, // We can safely upsert: true on final submit because we want the latest file submitted
          });

        clearInterval(progressInterval);

        if (uploadError) {
          updateSlot(i, { uploading: false, progress: 0, error: uploadError.message });
          throw new Error(`Failed to upload ${slot.cert}: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("compliance-documents").getPublicUrl(filePath);

        updateSlot(i, {
          uploadedUrl: publicUrl,
          progress: 100,
          uploading: false,
        });

        uploadedTickets.push({
          type: slot.cert,
          expiryDate: slot.expiryDate,
          ticketNumber: null,
          documentUrl: publicUrl,
        });
      }

      // Call secure database RPC function
      const { error: submitError } = await supabase.rpc("submit_worker_documents", {
        p_request_id: token!,
        p_new_tickets: uploadedTickets,
      });

      if (submitError) throw submitError;

      setSubmitSuccess(true);
    } catch (err: any) {
      console.error("Submit error:", err);
      setErrorMsg(err.message || "Submission failed. Please check your inputs and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER STATES
     ═══════════════════════════════════════════════════════════════ */

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-accent/20 border-t-brand-accent animate-spin" />
      </div>
    );
  }

  // Error (no request data)
  if (errorMsg && !requestData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-red-500/20 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl shadow-red-500/5">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
            Access Denied
          </h3>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-relaxed">
            {errorMsg}
          </p>
        </div>
      </div>
    );
  }

  // Success
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-emerald-500/20 rounded-2xl p-10 max-w-md w-full text-center space-y-6 shadow-2xl">
          <AnimatedCheckmark />
          <div className="space-y-2">
            <p className="text-[9px] font-black text-brand-accent uppercase tracking-[0.3em] font-archivo">
              OPUS FORM
            </p>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              Submission Complete
            </h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
              Your credentials have been uploaded successfully and are now pending admin
              verification.
            </p>
          </div>
          <div className="h-px bg-white/5" />
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest">
            You can safely close this tab
          </p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     MAIN FORM — MULTI-STEP WIZARD
     ═══════════════════════════════════════════════════════════════ */

  const activeSlot = !isReviewStep ? slots[currentStep] : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Keyframe animations */}
      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes drawCheck {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* ─── Header / Branding ─────────────────────────────────── */}
        <div className="text-center space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.35em] font-archivo text-foreground">
            OPUS FORM
          </p>
          <div className="h-0.5 w-10 bg-brand-accent mx-auto rounded-full" />
          <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-accent">
            Credential Submission Portal
          </h1>
        </div>

        {/* ─── Greeting Card ─────────────────────────────────────── */}
        <div className="bg-card border border-white/10 rounded-2xl p-5 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center shrink-0 border border-brand-accent/20">
              <AlertCircle className="w-5 h-5 text-brand-accent" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                Hi, {staffName}
              </h4>
              <p className="text-[9px] text-zinc-400 uppercase tracking-widest mt-1.5 leading-relaxed">
                {openEnded
                  ? "Please upload every on-site certification you currently hold. Select the type, upload a clear copy, and enter the expiration date."
                  : `Please upload clear copies of ${slots.length === 1 ? "the" : "each"} requested certification below. Enter the expiration date as shown on your card.`}
              </p>
            </div>
          </div>
        </div>

        {/* ─── Stepper ───────────────────────────────────────────── */}
        <Stepper steps={stepLabels} currentStep={currentStep} />

        {/* ─── Step Content ──────────────────────────────────────── */}
        <div
          key={currentStep}
          className="animate-[fadeSlideUp_0.3s_ease-out]"
        >
          {/* ─── PER-CERT STEP ─────────────────────────────────── */}
          {!isReviewStep && activeSlot && (
            <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5">
              {/* Cert header */}
              <div className="pb-4 border-b border-white/5 flex items-center justify-between gap-3">
                {openEnded ? (
                  <select
                    value={activeSlot.cert}
                    onChange={(e) => updateSlot(currentStep, { cert: e.target.value })}
                    className="flex-1 min-w-0 bg-black/20 border border-border hover:border-muted-foreground/50 focus:border-brand-accent rounded-xl px-3 py-2.5 text-xs text-foreground uppercase font-black tracking-wider outline-none appearance-none transition-colors"
                  >
                    {ON_SITE_CERTIFICATIONS.map((cert) => (
                      <option key={cert} value={cert}>
                        {cert}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <p className="text-[8px] text-zinc-500 uppercase tracking-widest mb-1">
                      Step {currentStep + 1} of {slots.length}
                    </p>
                    <h4 className="text-xs font-black uppercase tracking-widest text-foreground leading-normal">
                      {activeSlot.cert}
                    </h4>
                  </div>
                )}
                {openEnded && slots.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSlot(currentStep)}
                    className="shrink-0 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-red-500/10"
                    aria-label="Remove certification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dropzone */}
              <Dropzone
                slot={activeSlot}
                onFileSelected={(file) => handleFileSelected(currentStep, file)}
                onRemoveFile={() =>
                  updateSlot(currentStep, {
                    file: null,
                    uploadedUrl: null,
                    progress: 0,
                    thumbnailUrl: null,
                    displayFilename: null,
                  })
                }
              />

              {/* Expiry Date */}
              <div className="space-y-2">
                <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={activeSlot.expiryDate}
                  onChange={(e) => updateSlot(currentStep, { expiryDate: e.target.value })}
                  className="w-full bg-black/20 border border-border hover:border-muted-foreground/50 focus:border-brand-accent rounded-xl px-4 py-3 text-xs text-foreground outline-none transition-colors min-h-[48px]"
                />
              </div>

              {/* In-step error */}
              {errorMsg && (
                <p className="text-[8.5px] font-bold text-red-400 uppercase tracking-wider text-center">
                  {errorMsg}
                </p>
              )}
            </div>
          )}

          {/* ─── REVIEW STEP ───────────────────────────────────── */}
          {isReviewStep && (
            <div className="space-y-4">
              <div className="bg-card border border-white/10 rounded-2xl p-5 shadow-2xl">
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground mb-4 pb-3 border-b border-white/5">
                  Review Your Submissions
                </h4>
                <div className="space-y-3">
                  {slots.map((slot, idx) => (
                    <div
                      key={slot.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors"
                    >
                      {/* Thumbnail */}
                      {slot.thumbnailUrl ? (
                        <img
                          src={slot.thumbnailUrl}
                          alt={slot.cert}
                          className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-zinc-500" />
                        </div>
                      )}
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-foreground truncate">
                          {slot.cert}
                        </p>
                        {slot.displayFilename && (
                          <p className="text-[9px] font-mono text-zinc-500 truncate">
                            {slot.displayFilename}
                          </p>
                        )}
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5">
                          Expires:{" "}
                          {slot.expiryDate
                            ? new Date(slot.expiryDate).toLocaleDateString("en-GB")
                            : "—"}
                        </p>
                      </div>
                      {/* Status + edit */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-5 h-5 rounded-full bg-brand-accent/15 flex items-center justify-center border border-brand-accent/30">
                          <Check className="w-3 h-3 text-brand-accent" />
                        </div>
                        <button
                          type="button"
                          onClick={() => goToStep(idx)}
                          className="text-zinc-500 hover:text-brand-accent transition-colors cursor-pointer p-1"
                          aria-label={`Edit ${slot.cert}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit error */}
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                  <p className="text-[9px] font-bold text-red-400 uppercase tracking-wider">
                    {errorMsg}
                  </p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-4 bg-brand-accent hover:bg-brand-accent/80 disabled:opacity-50 text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-brand-accent/20 transition-all min-h-[52px] cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Submit All Documents
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ─── Open-ended: Add cert button ───────────────────────── */}
        {openEnded && !isReviewStep && (
          <button
            type="button"
            onClick={addSlot}
            className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-zinc-700 hover:border-brand-accent/40 rounded-xl text-[9.5px] font-black uppercase tracking-widest text-zinc-400 hover:text-foreground transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Another Certification
          </button>
        )}

        {/* ─── Navigation ────────────────────────────────────────── */}
        {!isReviewStep && (
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-foreground transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              disabled={!canAdvance()}
              className={`flex-1 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all min-h-[48px] flex items-center justify-center gap-2 cursor-pointer ${
                canAdvance()
                  ? "bg-brand-accent hover:bg-brand-accent/80 text-primary-foreground shadow-lg shadow-brand-accent/20"
                  : "bg-white/5 text-zinc-600 border border-white/5 cursor-not-allowed"
              }`}
            >
              {currentStep === slots.length - 1 ? "Review" : "Next"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Back button on Review step */}
        {isReviewStep && (
          <button
            type="button"
            onClick={goBack}
            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-foreground transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Editing
          </button>
        )}

        {/* ─── Footer ────────────────────────────────────────────── */}
        <div className="text-center pt-4 border-t border-white/5">
          <p className="text-[8px] text-zinc-600 uppercase tracking-widest">
            Opus Form Ltd — Secure Document Portal
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubmitCredentialsPage;
