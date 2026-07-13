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
  const [expiryHours, setExpiryHours] = useState<number>(48);
  const [customExpiry, setCustomExpiry] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (customExpiry) {
        expiresAt.setTime(new Date(customExpiry).getTime());
      } else {
        expiresAt.setHours(expiresAt.getHours() + expiryHours);
      }

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
      setGeneratedLink(uploadUrl);

      // Create admin audit log entry for request creation
      const { error: auditError } = await supabase.rpc('log_anonymous_audit', {
        p_user_email: 'admin@opusform.co.uk',
        p_action: 'CREATE_DOCUMENT_REQUEST',
        p_target_type: 'staff',
        p_target_id: worker.id,
        p_details: { request_id: data.id, requested_certs: selectedCerts }
      });
      if (auditError) console.error('Failed to log audit:', auditError);

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
      
      <div className="bg-[#222428] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden relative z-10 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-brand-accent/10 flex items-center justify-center shrink-0 border border-brand-accent/20">
              <Send className="w-4 h-4 text-brand-accent" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.15em] text-white">Request Credentials</h3>
              <p className="text-[8px] font-semibold text-white/30 uppercase tracking-widest mt-0.5">
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
          <div className="mx-6 mt-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-black text-red-400 uppercase tracking-wider">
            {error}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-grow">
          {!generatedLink ? (
            <>
              <div>
                <p className="text-xs font-bold text-[#aaa] uppercase tracking-wider mb-2">
                  Requesting credentials for: <span className="text-white font-black">{worker.name}</span>
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-relaxed">
                  Select the on-site certifications you need this worker to submit. The worker will receive a passwordless page with dedicated upload slots.
                </p>
              </div>

              {/* Certifications Checklist */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[#666] block">
                  Select Certifications Required
                </label>
                <div className="border border-[#333] bg-[#1a1a1a] rounded-xl p-3 max-h-[180px] overflow-y-auto space-y-1.5">
                  {ON_SITE_CERTIFICATIONS.map(cert => {
                    const isChecked = selectedCerts.includes(cert);
                    return (
                      <button
                        key={cert}
                        type="button"
                        onClick={() => handleToggleCert(cert)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-[9.5px] font-bold uppercase transition-all duration-150 border cursor-pointer ${
                          isChecked 
                            ? 'bg-brand-accent/10 border-brand-accent/30 text-white' 
                            : 'bg-[#222]/50 border-transparent text-[#999] hover:bg-[#222] hover:text-white'
                        }`}
                      >
                        <span>{cert}</span>
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                          isChecked 
                            ? 'bg-brand-accent border-brand-accent text-white' 
                            : 'border-zinc-700'
                        }`}>
                          {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expiry Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#666] block mb-1.5">
                    Link Expiration
                  </label>
                  <select
                    value={customExpiry ? 'custom' : expiryHours}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'custom') {
                        setCustomExpiry(new Date(Date.now() + 48*60*60*1000).toISOString().slice(0, 16));
                      } else {
                        setExpiryHours(Number(val));
                        setCustomExpiry('');
                      }
                    }}
                    className="w-full bg-[#1a1a1a] border border-[#333] focus:border-brand-accent rounded-lg px-3 py-2 text-xs text-white uppercase font-black tracking-wider outline-none cursor-pointer"
                  >
                    <option value={24}>24 Hours</option>
                    <option value={48}>48 Hours (Recommended)</option>
                    <option value={168}>7 Days</option>
                    <option value="custom">Custom Date/Time</option>
                  </select>
                </div>

                {customExpiry && (
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#666] block mb-1.5">
                      Expiry Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={customExpiry}
                      onChange={(e) => setCustomExpiry(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#333] focus:border-brand-accent rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-center text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
                Link Generated Successfully!
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-[#666] block">
                  Copy and Share Upload Link
                </label>
                <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#333] p-3 rounded-lg w-full">
                  <span className="text-[10px] text-zinc-400 font-mono select-all truncate flex-1 leading-normal">
                    {generatedLink}
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="p-2 bg-[#252525] border border-[#333] hover:border-[#444] text-white rounded-lg transition-all shrink-0 cursor-pointer flex items-center justify-center min-w-[36px]"
                    title="Copy Link"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-relaxed">
                You can copy the link above and send it directly to the worker via WhatsApp, SMS, or email. The link will automatically deactivate after submission or expiration.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white/[0.01] border-t border-white/5 flex items-center space-x-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-all rounded-lg text-[9px] font-black uppercase tracking-widest min-h-[42px] cursor-pointer"
          >
            {generatedLink ? 'Close' : 'Cancel'}
          </button>
          {!generatedLink && (
            <button
              onClick={handleCreateRequest}
              disabled={loading}
              className="flex-1 py-3 bg-brand-accent hover:bg-brand-accent/80 text-white transition-all rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-brand-accent/20 min-h-[42px] disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Generating...' : 'Generate Request Link'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
