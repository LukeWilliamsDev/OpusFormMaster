import React, { useState } from "react";
import { X, Send, Check, Copy } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { usePortal } from "../context/PortalContext";
import { ON_SITE_CERTIFICATIONS } from "./RosterView";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RequestCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: any;
}

export const RequestCredentialsModal: React.FC<RequestCredentialsModalProps> = ({
  isOpen,
  onClose,
  worker,
}) => {
  const { profile } = usePortal();
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);
  const [customCertInput, setCustomCertInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [emailSent, setEmailSent] = useState(false);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && worker) {
      // Find expired or expiring certifications
      const expiredOrExpiring = (worker.tickets || [])
        .filter((t: any) => {
          const expiry = new Date(t.expiryDate);
          const now = new Date();
          const soon = new Date();
          soon.setDate(now.getDate() + 30); // 30 days expiring-soon window
          return expiry < now || (expiry >= now && expiry <= soon);
        })
        .map((t: any) => t.type);

      // Pre-populate only valid certifications
      const initialSelected = expiredOrExpiring.filter((cert: string) =>
        ON_SITE_CERTIFICATIONS.includes(cert),
      );

      setSelectedCerts(initialSelected);
      setGeneratedLink(null);
      setEmailSent(false);
      setEmailErrorMsg(null);
    }
  }, [isOpen, worker]);

  if (!worker) return null;

  const handleToggleCert = (cert: string) => {
    setSelectedCerts((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert],
    );
  };

  const handleCreateRequest = async () => {
    if (selectedCerts.length === 0) {
      setError("Please select at least one certification to request");
      return;
    }

    if (!profile?.tenant_id) {
      setError("Unable to determine your organization. Please refresh and try again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      const { data, error: insertError } = await supabase
        .from("document_requests")
        .insert({
          worker_id: worker.id,
          requested_certs: selectedCerts,
          expires_at: expiresAt.toISOString(),
          tenant_id: profile.tenant_id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Expire other pending requests for the same worker
      await supabase
        .from("document_requests")
        .update({ expires_at: new Date().toISOString() })
        .eq("worker_id", worker.id)
        .neq("id", data.id)
        .is("completed_at", null);

      // Construct the secure upload link
      const uploadUrl = `${window.location.origin}/submit-credentials?token=${data.id}`;

      // Call edge function send-compliance-email
      let emailSentResult = false;
      let emailErrorResult = "";
      if (sendEmail && worker.email) {
        try {
          const { error: emailError } = await supabase.functions.invoke("send-compliance-email", {
            body: {
              toEmail: worker.email,
              workerName: worker.name,
              requestedCerts: selectedCerts,
              uploadUrl: uploadUrl,
              expiresAt: expiresAt.toISOString(),
            },
          });
          if (emailError) {
            console.error("Failed to send email:", emailError);
            emailErrorResult = emailError.message;
            setEmailErrorMsg(emailError.message);
          } else {
            emailSentResult = true;
            setEmailSent(true);
          }
        } catch (e: any) {
          console.error("Email send exception:", e);
          emailErrorResult = e.message || "Unknown error";
          setEmailErrorMsg(emailErrorResult);
        }
      }

      // Create admin audit log entry for request creation
      const { error: auditError } = await supabase.rpc("log_anonymous_audit", {
        p_user_email: "admin@opusform.co.uk",
        p_action: "CREATE_DOCUMENT_REQUEST",
        p_target_type: "staff",
        p_target_id: worker.id,
        p_details: {
          request_id: data.id,
          requested_certs: selectedCerts,
          email_sent: emailSentResult,
          email_error: emailErrorResult || undefined,
        },
      });
      if (auditError) console.error("Failed to log audit:", auditError);

      // Transition to success screen only after all async steps (email & audit) complete
      setGeneratedLink(uploadUrl);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate request link");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="w-full max-w-lg overflow-hidden p-0 gap-0 rounded-lg border border-border bg-card text-card-foreground flex flex-col max-h-[90vh] text-left [&>button]:hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border flex items-start justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
              <Send className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-[9px] text-[13px] font-bold uppercase tracking-wider text-card-foreground">
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_25%,transparent)]" />
                <span>Request Credentials</span>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-normal mt-1">
                Generate secure upload link
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground shrink-0"
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl text-[12px] font-semibold text-destructive uppercase tracking-normal">
            {error}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-grow">
          {!generatedLink ? (
            <>
              <div>
                <p className="text-[13px] font-bold text-card-foreground/90 uppercase tracking-normal mb-2">
                  Requesting credentials for:{" "}
                  <span className="text-card-foreground font-bold">{worker.name}</span>
                </p>
                <p className="text-[12px] text-muted-foreground uppercase tracking-normal leading-relaxed">
                  Select the on-site certifications you need this worker to submit. The worker will
                  receive a passwordless page with dedicated upload slots.
                </p>
              </div>

              {/* Certifications Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Select Certifications Required
                  </label>
                  {selectedCerts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCerts([])}
                      className="text-[11px] font-bold text-destructive uppercase tracking-normal hover:underline cursor-pointer"
                    >
                      Clear All ({selectedCerts.length})
                    </button>
                  )}
                </div>

                {/* Tag Cloud Selector */}
                <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto p-1.5 bg-background/40 border border-border rounded-xl">
                  {Array.from(new Set([...ON_SITE_CERTIFICATIONS, ...selectedCerts])).map(
                    (cert) => {
                      const isChecked = selectedCerts.includes(cert);
                      const isCustom = !ON_SITE_CERTIFICATIONS.includes(cert);
                      return (
                        <button
                          key={cert}
                          type="button"
                          onClick={() => handleToggleCert(cert)}
                          className={cn(
                            "px-3 py-1.5 rounded-md text-[12px] font-bold uppercase tracking-normal border transition-all cursor-pointer flex items-center gap-1",
                            isChecked
                              ? "bg-primary/25 border-primary/40 text-card-foreground shadow-sm"
                              : "bg-secondary/40 border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-card-foreground",
                          )}
                        >
                          <span>{cert}</span>
                          {isCustom && isChecked && (
                            <span className="text-[9.5px] text-primary/80 font-normal italic lowercase">
                              (custom)
                            </span>
                          )}
                        </button>
                      );
                    },
                  )}
                </div>

                {/* Custom Write-in Field */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type custom credential & hit enter..."
                    value={customCertInput}
                    onChange={(e) => setCustomCertInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const trimmed = customCertInput.trim();
                        if (trimmed && !selectedCerts.includes(trimmed)) {
                          setSelectedCerts((prev) => [...prev, trimmed]);
                        }
                        setCustomCertInput("");
                      }
                    }}
                    className="flex-1 bg-background border border-border hover:border-muted-foreground/40 focus:border-primary rounded-lg px-3 py-2 text-[12px] font-medium text-card-foreground uppercase tracking-normal outline-none placeholder:text-muted-foreground/70 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = customCertInput.trim();
                      if (trimmed && !selectedCerts.includes(trimmed)) {
                        setSelectedCerts((prev) => [...prev, trimmed]);
                      }
                      setCustomCertInput("");
                    }}
                    className="px-3.5 py-2 bg-secondary border border-border hover:border-muted-foreground/40 text-card-foreground text-[12px] font-bold uppercase tracking-normal rounded-lg transition-all cursor-pointer shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Send Email Checkbox */}
              {worker.email && (
                <label className="flex items-center space-x-3 cursor-pointer p-3.5 border border-border bg-background/40 rounded-xl hover:bg-background/70 transition-all select-none">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-0 focus:ring-offset-0 bg-background cursor-pointer"
                  />
                  <div>
                    <span className="text-[12px] font-bold uppercase tracking-normal text-card-foreground">
                      Send request via email
                    </span>
                    <span className="block text-[11px] text-muted-foreground font-medium tracking-normal mt-0.5">
                      To: {worker.email}
                    </span>
                  </div>
                </label>
              )}
            </>
          ) : (
            <div className="space-y-6 py-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-success/10 border border-success/20 text-success flex items-center justify-center mx-auto mb-2.5">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-sm font-bold uppercase tracking-wide text-card-foreground">
                  {emailSent ? "Email Sent" : "Link Generated"}
                </h4>
                <p className="text-[12px] text-muted-foreground font-medium tracking-normal max-w-sm mx-auto leading-relaxed px-4">
                  {emailSent
                    ? `The compliance upload request has been successfully emailed to ${worker.email}.`
                    : "The secure compliance document upload link is ready."}
                </p>
              </div>

              {!emailSent && (
                <div className="space-y-3 pt-2 text-left max-w-md mx-auto px-4 w-full">
                  {emailErrorMsg && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-[12px] font-semibold text-destructive uppercase tracking-normal">
                      Email dispatch failed: {emailErrorMsg}
                    </div>
                  )}

                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-normal text-muted-foreground block">
                      Manual Upload Link
                    </span>
                    <div className="flex items-center gap-2 bg-background border border-border p-2.5 rounded-lg w-full">
                      <span className="text-[12px] text-muted-foreground font-mono select-all truncate flex-1 leading-normal">
                        {generatedLink}
                      </span>
                      <button
                        onClick={copyToClipboard}
                        className="p-2 bg-secondary border border-border hover:border-muted-foreground/40 text-card-foreground rounded-lg transition-all shrink-0 cursor-pointer flex items-center justify-center min-w-[32px]"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-secondary/10 border-t border-border flex items-center space-x-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 py-3 h-auto min-h-[42px] text-[12px] font-bold uppercase tracking-wider"
          >
            {generatedLink ? "Close" : "Cancel"}
          </Button>
          {!generatedLink && (
            <Button
              type="button"
              onClick={handleCreateRequest}
              disabled={loading}
              className="flex-1 py-3 h-auto min-h-[42px] text-[12px] font-bold uppercase tracking-wider"
            >
              {loading ? "Generating..." : "Generate Request Link"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
