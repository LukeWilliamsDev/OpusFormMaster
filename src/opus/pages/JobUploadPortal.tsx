import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../integrations/supabase/client";
import { FileUp, Check, AlertCircle, Loader, UploadCloud } from "lucide-react";
import { usePortal } from "../context/PortalContext";
import { compressImageFile } from "../lib/compressImage";
import { 
  createDataFetchState, 
  createFileUploadState, 
  createUIState,
  createAsyncState
} from "../utils/stateGrouping";
import { handleError } from "../utils/errorHandler";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;

export const JobUploadPortalPage: React.FC = () => {
  const { theme } = usePortal();
  const logoSrc =
    theme === "light" ? "/opus-form-primary-light.svg" : "/opus-form-primary-dark.svg";
  const { token } = useParams<{ token: string }>();

  /* ────────────────── State ────────────────── */
  // Request data fetching state
  const [requestFetch, setRequestFetch] = useState(createDataFetchState());
  // File upload state
  const [uploadState, setUploadState] = useState(createFileUploadState());
  // UI state (drag, etc.)
  const [ui, setUi] = useState(createUIState());
  // Submit state
  const [submitState, setSubmitState] = useState(createAsyncState());
  // Error state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ────────────────── Derived ────────────────── */
  const loading = requestFetch.loading;
  const jobData = requestFetch.data;
  const existingTotalBytes = (requestFetch.data as any)?.existing_total_bytes || 0;
  const files = uploadState.files;
  const uploading = submitState.loading;
  const uploadSuccess = submitState.success;

  /* ────────────────── Fetch request details ────────────────── */
  useEffect(() => {
    if (token) {
      fetchRequestDetails();
    } else {
      setErrorMsg("No upload token provided. Please use a valid submission link.");
      setRequestFetch(prev => ({ ...prev, loading: false }));
    }
  }, [token]);

  const fetchRequestDetails = async () => {
    setRequestFetch(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase.rpc("get_job_document_request_details", {
        p_token: token!,
      });

      if (error || !data) {
        throw new Error("This upload link is invalid, expired, or has already been completed.");
      }

      setRequestFetch(prev => ({ ...prev, data, loading: false }));

      // data.job is the raw jobs row (to_jsonb in the RPC) — snake_case, not
      // the camelCase Job type used everywhere else in the app. RPC returns
      // jsonb, so the generated type is the generic Json union; the actual
      // shape here comes from get_job_document_request_details's jsonb_build_object.
      const details = data as {
        job: { job_ref: string; site_name: string };
        existing_total_bytes: number;
      };
    } catch (err) {
        console.error(err);
        const { message } = handleError(err, { message: "Failed to fetch request details" });
        setRequestFetch(prev => ({ ...prev, loading: false, error: message }));
        setErrorMsg(message);
      }
    };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setUi(prev => ({ ...prev, dragActive: true }));
    } else if (e.type === "dragleave") {
      setUi(prev => ({ ...prev, dragActive: false }));
    }
  };

  // Rejects oversized files up front and caps the running total (already-
  // stored attachments + everything queued) at the 100MB per-job limit.
  const addFiles = (candidates: File[]) => {
    setErrorMsg(null);
    const oversized = candidates.filter((f) => f.size > MAX_FILE_BYTES);
    if (oversized.length > 0) {
      setErrorMsg(`${oversized.map((f) => f.name).join(", ")} exceeds the 10MB per-file limit.`);
      candidates = candidates.filter((f) => f.size <= MAX_FILE_BYTES);
    }
    const queuedTotal = files.reduce((sum, f) => sum + f.size, 0);
    const incomingTotal = candidates.reduce((sum, f) => sum + f.size, 0);
    if (existingTotalBytes + queuedTotal + incomingTotal > MAX_TOTAL_BYTES) {
      setErrorMsg(
        (prev) =>
          (prev ? prev + " " : "") + "This job has reached its 100MB total attachment limit.",
      );
      return;
    }
    if (candidates.length > 0) setUploadState(prev => ({ ...prev, files: [...prev.files, ...candidates] }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUi(prev => ({ ...prev, dragActive: false }));

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      addFiles(Array.from(e.target.files));
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadState(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setSubmitState(prev => ({ ...prev, loading: true, error: null }));
    setErrorMsg(null);

    try {
      for (const file of files) {
        const uploadFile = await compressImageFile(file);
        const fileExt = file.name.split(".").pop();
        const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `requests/${token}/${cleanFileName}`;

        // Upload file to storage (path-scoped and token-validated by storage policy)
        const { error: uploadError } = await supabase.storage
          .from("job-attachments")
          .upload(filePath, uploadFile);

        if (uploadError) throw uploadError;

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("job-attachments").getPublicUrl(filePath);

        // Log the attachment via a token-scoped RPC (job_id/tenant_id derived server-side)
        const { error: insertError } = await supabase.rpc("submit_job_attachment", {
          p_token: token!,
          p_file_name: file.name,
          p_file_url: publicUrl,
          p_file_size_bytes: uploadFile.size,
        });

        if (insertError) throw insertError;
      }

      // Mark document request as completed
      await supabase.rpc("complete_job_document_request", { p_token: token! });

      setSubmitState(prev => ({ ...prev, loading: false, success: true }));
    } catch (err) {
      console.error(err);
      const { message } = handleError(err, { message: "File upload failed" });
      setSubmitState(prev => ({ ...prev, loading: false, error: message }));
      setErrorMsg(message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-4">
        <img src={logoSrc} alt="Opus Form" className="h-8 w-auto" />
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 text-primary animate-spin" />
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
            Verifying Token...
          </span>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-4">
        <img src={logoSrc} alt="Opus Form" className="h-8 w-auto" />
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 text-primary">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground uppercase tracking-wider">
            Access Denied
          </h2>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-4 font-sans text-foreground">
      <img src={logoSrc} alt="Opus Form" className="h-8 w-auto" />
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6">
        {/* Title and Job info */}
        <div className="text-center space-y-2">
          <div className="inline-flex px-3 py-1 bg-secondary border border-border rounded-full text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
            {jobData?.jobRef?.replace("-X", "")}
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Job Document Portal
          </h1>
          <p className="text-sm text-muted-foreground">
            Uploading documents for <strong className="text-foreground">{jobData?.siteName}</strong>
          </p>
        </div>

        {uploadSuccess ? (
          <div className="text-center space-y-5 py-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success/10 border border-success/20 text-success">
              <Check className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">Upload Complete</h2>
              <p className="text-sm text-muted-foreground">
                Your documents have been submitted to the site supervisor.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                ui.dragActive
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground/40 bg-background"
              }`}
            >
              <input
                type="file"
                multiple
                id="file-upload-input"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label
                htmlFor="file-upload-input"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <UploadCloud className="w-10 h-10 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">
                    Drag and drop files here, or{" "}
                    <span className="text-primary hover:underline">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports PDF, DOCX, JPEG, PNG, Excel
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    10MB per file, 100MB total per job
                  </p>
                </div>
              </label>
            </div>

            {/* Selected files list */}
            {files.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                  Files to Upload ({files.length})
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-background border border-border rounded-lg px-3 py-2 text-xs"
                    >
                      <span className="truncate max-w-[80%] text-foreground font-mono">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="text-muted-foreground hover:text-destructive font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={files.length === 0 || uploading}
              className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex justify-center items-center gap-2 ${
                files.length === 0 || uploading
                  ? "bg-secondary text-muted-foreground cursor-not-allowed"
                  : "bg-primary hover:bg-primary text-white cursor-pointer"
              }`}
            >
              {uploading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Submit Documentation"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};