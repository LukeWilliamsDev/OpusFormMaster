import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../../integrations/supabase/client";
import { ShieldAlert, FileUp, Check, AlertCircle, Calendar, Hash, Plus, X } from "lucide-react";
import { ON_SITE_CERTIFICATIONS } from "../components/RosterView";

interface UploadSlot {
  id: string;
  cert: string;
  file: File | null;
  refNo: string;
  expiryDate: string;
  uploading: boolean;
  progress: number;
  uploadedUrl: string | null;
  error: string | null;
}

const makeSlotId = () => `slot-${Math.random().toString(36).slice(2)}`;

const emptySlot = (): UploadSlot => ({
  id: makeSlotId(),
  cert: ON_SITE_CERTIFICATIONS[0],
  file: null,
  refNo: "",
  expiryDate: "",
  uploading: false,
  progress: 0,
  uploadedUrl: null,
  error: null,
});

export const SubmitCredentialsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [requestData, setRequestData] = useState<any>(null);
  const [staffName, setStaffName] = useState<string>("");
  const [slots, setSlots] = useState<UploadSlot[]>([]);
  const [openEnded, setOpenEnded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      const { data, error } = await supabase
        .from("document_requests")
        .select("*, staff:worker_id(name)")
        .eq("id", token!)
        .single();

      if (error || !data) {
        throw new Error("Link is invalid, expired, or has already been used.");
      }

      setRequestData(data);
      setStaffName(data.staff?.name || "Staff Member");

      if (!data.requested_certs || data.requested_certs.length === 0) {
        // Open-ended request: let the worker add every cert they hold.
        setOpenEnded(true);
        setSlots([emptySlot()]);
      } else {
        // Initialize slots for each requested cert
        const initialSlots = data.requested_certs.map((cert: string) => ({
          id: makeSlotId(),
          cert,
          file: null,
          refNo: "",
          expiryDate: "",
          uploading: false,
          progress: 0,
          uploadedUrl: null,
          error: null,
        }));
        setSlots(initialSlots);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Access Denied: Invalid or expired upload link.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (index: number, file: File) => {
    if (!file) return;

    // Validate type
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      updateSlot(index, { error: "Only PDF and image files (PNG, JPG) are allowed." });
      return;
    }

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      updateSlot(index, { error: "File size must be under 5MB." });
      return;
    }

    updateSlot(index, { file, error: null, uploading: true, progress: 10 });

    try {
      const fileExt = file.name.split(".").pop();
      const slug = slots[index].cert.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const filePath = `requests/${token}/${slug}-${Date.now()}.${fileExt}`;

      // Upload to Storage
      const { data, error: uploadError } = await supabase.storage
        .from("compliance-documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public or resource URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("compliance-documents").getPublicUrl(filePath);

      updateSlot(index, {
        uploadedUrl: publicUrl,
        progress: 100,
        uploading: false,
      });
    } catch (err: any) {
      console.error(err);
      updateSlot(index, {
        error: "Failed to upload file. Please try again.",
        uploading: false,
        progress: 0,
      });
    }
  };

  const updateSlot = (index: number, updates: Partial<UploadSlot>) => {
    setSlots((prev) => prev.map((s, idx) => (idx === index ? { ...s, ...updates } : s)));
  };

  const addSlot = () => {
    setSlots((prev) => [...prev, emptySlot()]);
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (slots.length === 0) {
      setErrorMsg("Please add at least one certification.");
      return;
    }

    // Validate all slots
    for (const slot of slots) {
      if (!slot.uploadedUrl) {
        setErrorMsg(`Please upload the file for: ${slot.cert}`);
        return;
      }
      if (!slot.expiryDate) {
        setErrorMsg(`Please select the Expiration Date for: ${slot.cert}`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const newTickets = slots.map((slot) => ({
        type: slot.cert,
        expiryDate: slot.expiryDate,
        ticketNumber: slot.refNo.trim() || null,
        documentUrl: slot.uploadedUrl,
      }));

      // Call secure database RPC function
      const { error: submitError } = await supabase.rpc("submit_worker_documents", {
        p_request_id: token!,
        p_new_tickets: newTickets,
      });

      if (submitError) throw submitError;

      setSubmitSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Submission failed. Please check your inputs and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1B1E] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-accent/20 border-t-brand-accent animate-spin" />
      </div>
    );
  }

  if (errorMsg && !submitSuccess) {
    return (
      <div className="min-h-screen bg-[#1A1B1E] flex items-center justify-center p-4">
        <div className="bg-[#222428] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">
            Access Denied
          </h3>
          <p className="text-xs text-[#aaa] leading-relaxed uppercase tracking-wider">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-[#1A1B1E] flex items-center justify-center p-4">
        <div className="bg-[#222428] border border-emerald-500/20 rounded-2xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">
              Submission Complete
            </h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1.5 leading-relaxed">
              Your credentials have been uploaded successfully. The link has been deactivated, and
              your records are now pending admin verification.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1B1E] text-brand-white py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Portal Header */}
        <div className="text-center space-y-2">
          <div className="h-0.5 w-12 bg-brand-accent mx-auto" />
          <h1 className="text-lg font-black tracking-tighter uppercase font-archivo">
            OPUS FORM CREDENTIAL PORTAL
          </h1>
          <p className="text-[9px] font-black text-brand-accent uppercase tracking-[0.25em]">
            Secure Document Submission
          </p>
        </div>

        {/* Info card */}
        <div className="bg-[#222428] border border-white/10 rounded-2xl p-5 shadow-xl flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center shrink-0 border border-brand-accent/20">
            <AlertCircle className="w-5 h-5 text-brand-accent" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white">
              Hi, {staffName}
            </h4>
            <p className="text-[9px] text-[#aaa] uppercase tracking-widest mt-1.5 leading-relaxed">
              {openEnded
                ? "Please add and upload every on-site certification you currently hold. Enter the correct reference number and expiration date as stated on each card."
                : "Please upload clear copies of the requested certifications below. Enter the correct reference number and expiration dates as stated on the cards."}
            </p>
          </div>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {slots.map((slot, index) => (
              <div
                key={slot.id}
                className="bg-[#222428] border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg hover:border-brand-accent/20 transition-all"
              >
                <div className="pb-3 border-b border-white/5 flex items-center justify-between gap-3">
                  {openEnded ? (
                    <select
                      value={slot.cert}
                      onChange={(e) => updateSlot(index, { cert: e.target.value })}
                      className="flex-1 min-w-0 bg-black/10 border border-[#333] hover:border-[#444] focus:border-brand-accent rounded-lg px-3 py-2 text-xs text-white uppercase font-black tracking-wider outline-none appearance-none"
                    >
                      {ON_SITE_CERTIFICATIONS.map((cert) => (
                        <option key={cert} value={cert}>
                          {cert}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <h4 className="text-xs font-black uppercase tracking-widest text-white leading-normal">
                      {slot.cert}
                    </h4>
                  )}
                  {openEnded && slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSlot(index)}
                      className="shrink-0 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                      aria-label="Remove certification"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Dropzone */}
                <div>
                  {!slot.uploadedUrl ? (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 hover:border-brand-accent/40 rounded-xl p-6 cursor-pointer bg-black/10 transition-colors">
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileChange(index, e.target.files[0]);
                          }
                        }}
                      />
                      <FileUp className="w-6 h-6 text-zinc-500 mb-2" />
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-white">
                        {slot.uploading ? `Uploading (${slot.progress}%)` : "Select or Drop File"}
                      </span>
                      <span className="text-[8px] text-zinc-500 uppercase tracking-widest mt-1">
                        PDF, PNG, or JPG up to 5MB
                      </span>
                    </label>
                  ) : (
                    <div className="flex items-center justify-between bg-emerald-950/10 border border-emerald-900/20 p-3.5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                          <Check className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                          Document Uploaded
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateSlot(index, { file: null, uploadedUrl: null, progress: 0 })
                        }
                        className="text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {slot.error && (
                    <p className="text-[8.5px] font-bold text-red-400 uppercase tracking-wider mt-2">
                      {slot.error}
                    </p>
                  )}
                </div>

                {/* Meta Inputs (Ref & Expiry) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest text-[#666] flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" />
                      Reference / Card No. (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. OP-123456"
                      value={slot.refNo}
                      onChange={(e) => updateSlot(index, { refNo: e.target.value })}
                      className="w-full bg-black/10 border border-[#333] hover:border-[#444] focus:border-brand-accent rounded-lg px-3 py-2 text-xs text-white uppercase font-black tracking-wider outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest text-[#666] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Expiration Date
                    </label>
                    <input
                      type="date"
                      value={slot.expiryDate}
                      onChange={(e) => updateSlot(index, { expiryDate: e.target.value })}
                      className="w-full bg-black/10 border border-[#333] hover:border-[#444] focus:border-brand-accent rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {openEnded && (
            <button
              type="button"
              onClick={addSlot}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-700 hover:border-brand-accent/40 rounded-xl text-[9.5px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Certification
            </button>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-brand-accent hover:bg-brand-accent/80 text-white transition-all rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-brand-accent/20 min-h-[48px] disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Submitting Documents..." : "Submit All Documents"}
          </button>
        </form>
      </div>
    </div>
  );
};
export default SubmitCredentialsPage;
