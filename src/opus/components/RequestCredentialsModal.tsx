import React, { useState } from 'react';
import { X, Send, Check, Copy } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { ON_SITE_CERTIFICATIONS } from './RosterView';

interface RequestCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: any;
}

export const RequestCredentialsModal: React.FC<RequestCredentialsModalProps> = ({
  isOpen,
  onClose,
  worker
}) => {
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);
  const [customCertInput, setCustomCertInput] = useState('');
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
        ON_SITE_CERTIFICATIONS.includes(cert)
      );

      setSelectedCerts(initialSelected);
      setGeneratedLink(null);
      setEmailSent(false);
      setEmailErrorMsg(null);
    }
  }, [isOpen, worker]);

  if (!isOpen || !worker) return null;

  const handleToggleCert = (cert: string) => {
    setSelectedCerts(prev =>
      prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]
    );
  };

  const handleCreateRequest = async () => {
    if (selectedCerts.length === 0) {
      setError('Please select at least one certification to request');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      const { data, error: insertError } = await supabase
        .from('document_requests')
        .insert({
          worker_id: worker.id,
          requested_certs: selectedCerts,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Construct the secure upload link
      const uploadUrl = `${window.location.origin}/submit-credentials?token=${data.id}`;

      // Call edge function send-compliance-email
      let emailSentResult = false;
      let emailErrorResult = '';
      if (sendEmail && worker.email) {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-compliance-email', {
            body: {
              toEmail: worker.email,
              workerName: worker.name,
              requestedCerts: selectedCerts,
              uploadUrl: uploadUrl,
              expiresAt: expiresAt.toISOString()
            }
          });
          if (emailError) {
            console.error('Failed to send email:', emailError);
            emailErrorResult = emailError.message;
            setEmailErrorMsg(emailError.message);
          } else {
            emailSentResult = true;
            setEmailSent(true);
          }
        } catch (e: any) {
          console.error('Email send exception:', e);
          emailErrorResult = e.message || 'Unknown error';
          setEmailErrorMsg(emailErrorResult);
        }
      }

      // Create admin audit log entry for request creation
      const { error: auditError } = await supabase.rpc('log_anonymous_audit', {
        p_user_email: 'admin@opusform.co.uk',
        p_action: 'CREATE_DOCUMENT_REQUEST',
        p_target_type: 'staff',
        p_target_id: worker.id,
        p_details: { 
          request_id: data.id, 
          requested_certs: selectedCerts,
          email_sent: emailSentResult,
          email_error: emailErrorResult || undefined
        }
      });
      if (auditError) console.error('Failed to log audit:', auditError);

      // Transition to success screen only after all async steps (email & audit) complete
      setGeneratedLink(uploadUrl);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate request link');
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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 text-left">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-[#1f2125] border border-zinc-800/80 rounded-2xl w-full max-w-lg overflow-hidden relative z-10 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-zinc-850 bg-zinc-950/10 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-brand-accent/10 flex items-center justify-center shrink-0 border border-brand-accent/20">
              <Send className="w-4 h-4 text-brand-accent" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-zinc-100">Request Credentials</h3>
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-normal mt-0.5">
                Generate secure upload link
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-[12px] font-semibold text-red-400 uppercase tracking-normal">
            {error}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-grow">
          {!generatedLink ? (
            <>
              <div>
                <p className="text-[13px] font-bold text-zinc-300 uppercase tracking-normal mb-2">
                  Requesting credentials for: <span className="text-white font-bold">{worker.name}</span>
                </p>
                <p className="text-[12px] text-zinc-450 uppercase tracking-normal leading-relaxed">
                  Select the on-site certifications you need this worker to submit. The worker will receive a passwordless page with dedicated upload slots.
                </p>
              </div>

              {/* Certifications Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Select Certifications Required
                  </label>
                  {selectedCerts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCerts([])}
                      className="text-[11px] font-bold text-red-455 text-red-400 uppercase tracking-normal hover:underline cursor-pointer"
                    >
                      Clear All ({selectedCerts.length})
                    </button>
                  )}
                </div>

                {/* Tag Cloud Selector */}
                <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto p-1.5 bg-zinc-950/20 border border-zinc-900 rounded-xl">
                  {Array.from(new Set([...ON_SITE_CERTIFICATIONS, ...selectedCerts])).map(cert => {
                    const isChecked = selectedCerts.includes(cert);
                    const isCustom = !ON_SITE_CERTIFICATIONS.includes(cert);
                    return (
                      <button
                        key={cert}
                        type="button"
                        onClick={() => handleToggleCert(cert)}
                        className={`px-3 py-1.5 rounded-md text-[12px] font-bold uppercase tracking-normal border transition-all cursor-pointer flex items-center gap-1 ${
                          isChecked 
                            ? 'bg-brand-accent/25 border-brand-accent/40 text-white shadow-sm' 
                            : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-400 hover:border-zinc-700 hover:text-white'
                        }`}
                      >
                        <span>{cert}</span>
                        {isCustom && isChecked && <span className="text-[9.5px] text-brand-accent/80 font-normal italic lowercase">(custom)</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Write-in Field */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type custom credential & hit enter..."
                    value={customCertInput}
                    onChange={(e) => setCustomCertInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const trimmed = customCertInput.trim();
                        if (trimmed && !selectedCerts.includes(trimmed)) {
                          setSelectedCerts(prev => [...prev, trimmed]);
                        }
                        setCustomCertInput('');
                      }
                    }}
                    className="flex-1 bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-brand-accent rounded-lg px-3 py-2 text-[12px] font-medium text-white uppercase tracking-normal outline-none placeholder:text-zinc-650 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = customCertInput.trim();
                      if (trimmed && !selectedCerts.includes(trimmed)) {
                        setSelectedCerts(prev => [...prev, trimmed]);
                      }
                      setCustomCertInput('');
                    }}
                    className="px-3.5 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white text-[12px] font-bold uppercase tracking-normal rounded-lg transition-all cursor-pointer shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>
              
              {/* Send Email Checkbox */}
              {worker.email && (
                <label className="flex items-center space-x-3 cursor-pointer p-3.5 border border-zinc-800 bg-zinc-950/20 rounded-xl hover:bg-zinc-950/40 transition-all select-none">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 text-brand-accent focus:ring-0 focus:ring-offset-0 bg-zinc-950 cursor-pointer"
                  />
                  <div>
                    <span className="text-[12px] font-bold uppercase tracking-normal text-white">Send request via email</span>
                    <span className="block text-[11px] text-zinc-400 font-medium tracking-normal mt-0.5">To: {worker.email}</span>
                  </div>
                </label>
              )}

            </>
          ) : (
            <div className="space-y-6 py-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2.5">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold uppercase tracking-wide text-white">
                  {emailSent ? 'Email Sent' : 'Link Generated'}
                </h4>
                <p className="text-[12px] text-zinc-400 font-medium tracking-normal max-w-sm mx-auto leading-relaxed px-4">
                  {emailSent 
                    ? `The compliance upload request has been successfully emailed to ${worker.email}.`
                    : 'The secure compliance document upload link is ready.'
                  }
                </p>
              </div>

              {!emailSent && (
                <div className="space-y-3 pt-2 text-left max-w-md mx-auto px-4 w-full">
                  {emailErrorMsg && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[12px] font-semibold text-red-400 uppercase tracking-normal">
                      Email dispatch failed: {emailErrorMsg}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-normal text-zinc-500 block">Manual Upload Link</span>
                    <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#333] p-2.5 rounded-lg w-full">
                      <span className="text-[12px] text-zinc-400 font-mono select-all truncate flex-1 leading-normal">
                        {generatedLink}
                      </span>
                      <button
                        onClick={copyToClipboard}
                        className="p-2 bg-[#252525] border border-[#333] hover:border-[#444] text-white rounded-lg transition-all shrink-0 cursor-pointer flex items-center justify-center min-w-[32px]"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-450 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white/[0.01] border-t border-white/5 flex items-center space-x-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-zinc-800/60 text-white/60 hover:text-white hover:bg-white/5 transition-all rounded-lg text-[12px] font-bold uppercase tracking-wider min-h-[42px] cursor-pointer"
          >
            {generatedLink ? 'Close' : 'Cancel'}
          </button>
          {!generatedLink && (
            <button
              onClick={handleCreateRequest}
              disabled={loading}
              className="flex-1 py-3 bg-brand-accent hover:bg-brand-accent/80 text-white transition-all rounded-lg text-[12px] font-bold uppercase tracking-wider shadow-lg shadow-brand-accent/20 min-h-[42px] disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Generating...' : 'Generate Request Link'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
