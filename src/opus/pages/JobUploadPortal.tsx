import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../integrations/supabase/client";
import { FileUp, Check, AlertCircle, Loader, UploadCloud, X } from "lucide-react";
import { usePortal } from "../context/PortalContext";
import { compressImageFile } from "../lib/compressImage";
import {
  createDataFetchState,
  createFileUploadState,
  createAsyncState,
} from "../utils/stateGrouping";
import { handleError } from "../utils/errorHandler";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
const DOC_TYPES = ["Invoice", "Quote", "Expense", "Other"] as const;
type DocType = (typeof DOC_TYPES)[number];

export const JobUploadPortalPage: React.FC = () => {
  const { theme } = usePortal();
  const logoSrc =
    theme === "light" ? "/opus-form-primary-light.svg" : "/opus-form-primary-dark.svg";
  const { token } = useParams<{ token: string }>();

  /* ────────────────── State ────────────────── */
  // Request data fetching state
  const [requestFetch, setRequestFetch] =
    useState(
      createDataFetchState<{ jobRef: string; siteName: string; existingTotalBytes: number }>(),
    );
  // File upload state
  const [uploadState, setUploadState] = useState(createFileUploadState());
  // UI state (drag, etc.)
  const [dragActive, setDragActive] = useState(false);
  // Per-file document type, kept in sync with uploadState.files by index
  const [fileCategories, setFileCategories] = useState<DocType[]>([]);
  // Submit state
  const [submitState, setSubmitState] = useState(createAsyncState());
  // Error state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ────────────────── Derived ────────────────── */
  const loading = requestFetch.loading;
  const jobData = requestFetch.data;
  const existingTotalBytes = requestFetch.data?.existingTotalBytes || 0;
  const files = uploadState.files;
  const uploading = submitState.loading;
  const uploadSuccess = submitState.success;

  /* ────────────────── Fetch request details ────────────────── */
  useEffect(() => {
    if (token) {
      fetchRequestDetails();
    } else {
      setErrorMsg("No upload token provided. Please use a valid submission link.");
      setRequestFetch((prev) => ({ ...prev, loading: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchRequestDetails = async () => {
    setRequestFetch((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase.rpc("get_job_document_request_details", {
        p_token: token!,
      });

      if (error || !data) {
        throw new Error("This upload link is invalid, expired, or has already been completed.");
      }

      // data.job is the raw jobs row (to_jsonb in the RPC) — snake_case, not
      // the camelCase Job type used everywhere else in the app. RPC returns
      // jsonb, so the generated type is the generic Json union; the actual
      // shape here comes from get_job_document_request_details's jsonb_build_object.
      const details = data as {
        job: { job_ref: string; site_name: string };
        existing_total_bytes: number;
      };
      setRequestFetch((prev) => ({
        ...prev,
        data: {
          jobRef: details.job.job_ref,
          siteName: details.job.site_name,
          existingTotalBytes: details.existing_total_bytes,
        },
        loading: false,
      }));
    } catch (err) {
      console.error(err);
      const { message } = handleError(err, { message: "Failed to fetch request details" });
      setRequestFetch((prev) => ({ ...prev, loading: false, error: message }));
      setErrorMsg(message);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
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
    if (candidates.length > 0) {
      setUploadState((prev) => ({ ...prev, files: [...prev.files, ...candidates] }));
      setFileCategories((prev) => [...prev, ...candidates.map(() => "Other" as DocType)]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

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
    setUploadState((prev) => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }));
    setFileCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setSubmitState((prev) => ({ ...prev, loading: true, error: null }));
    setErrorMsg(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const category = fileCategories[i] ?? "Other";
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

        // Category is folded into the file name (not a DB column) so the
        // existing MediaTab.tsx regex grouping (/invoice/i, /quote/i, else
        // Other) picks it up automatically on the job side.
        const categorizedName = category === "Other" ? file.name : `${category}_${file.name}`;

        // Log the attachment via a token-scoped RPC (job_id/tenant_id derived server-side)
        const { error: insertError } = await supabase.rpc("submit_job_attachment", {
          p_token: token!,
          p_file_name: categorizedName,
          p_file_url: publicUrl,
          p_file_size_bytes: uploadFile.size,
        });

        if (insertError) throw insertError;
      }

      // Mark document request as completed
      await supabase.rpc("complete_job_document_request", { p_token: token! });

      setSubmitState((prev) => ({ ...prev, loading: false, success: true }));
    } catch (err) {
      console.error(err);
      const { message } = handleError(err, { message: "File upload failed" });
      setSubmitState((prev) => ({ ...prev, loading: false, error: message }));
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center gap-6 p-4 py-12 font-sans text-foreground">
      <img src={logoSrc} alt="Opus Form" className="h-7 w-auto opacity-90" />
      <div className="w-full max-w-lg bg-card border border-border rounded-xl md:shadow-2xl overflow-hidden">
        {/* Header band */}
        <div className="flex items-center gap-3 px-6 md:px-8 py-5 border-b border-border bg-muted/40">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border-2 border-border shrink-0">
            <FileUp className="w-5 h-5 text-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-foreground font-archivo uppercase tracking-wide truncate">
              Job Document Portal
            </h1>
            <p className="text-xs text-muted-foreground truncate">{jobData?.siteName}</p>
          </div>
          <div className="ml-auto shrink-0 px-2.5 py-1 bg-secondary border border-border rounded text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
            {jobData?.jobRef?.replace("-X", "")}
          </div>
        </div>

        <div className="p-6 md:p-8">
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
                  dragActive
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-muted-foreground/40 bg-muted/20"
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
                  <div className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center">
                    <UploadCloud className="w-6 h-6 text-muted-foreground" />
                  </div>
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
                  <div className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
                    Files to Upload ({files.length})
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg pl-3 pr-1.5 py-1.5 text-xs"
                      >
                        <span className="truncate flex-1 min-w-0 text-foreground font-mono">
                          {file.name}
                        </span>
                        <select
                          value={fileCategories[idx] ?? "Other"}
                          onChange={(e) =>
                            setFileCategories((prev) =>
                              prev.map((c, i) => (i === idx ? (e.target.value as DocType) : c)),
                            )
                          }
                          className="shrink-0 bg-background border border-border rounded px-1.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground cursor-pointer min-h-[28px] max-w-[84px] sm:max-w-none"
                        >
                          {DOC_TYPES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          aria-label="Remove file"
                          className="shrink-0 w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="w-3.5 h-3.5" />
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
                    : "bg-primary hover:bg-primary/90 text-white cursor-pointer shadow-md"
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
      <p className="text-[11px] text-muted-foreground/70 text-center max-w-lg">
        Secure upload link · files are attached directly to job {jobData?.jobRef?.replace("-X", "")}
      </p>
    </div>
  );
};
