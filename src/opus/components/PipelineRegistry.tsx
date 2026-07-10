// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Trash2, 
  Check, 
  Search, 
  SlidersHorizontal, 
  X, 
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowRightLeft
} from 'lucide-react';
import { Job } from '../types/erp';

interface MeasuredItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number | string;
  isIncluded?: boolean;
}

interface Quote {
  id: string;
  reference: string;
  date: string;
  clientInfo: {
    entity: string;
    email: string;
    site: string;
    postcode: string;
  };
  items: MeasuredItem[];
  vatRate: number;
  totals: {
    netTotal: number;
    vatAmount: number;
    grossTotal: number;
  };
  isSavedLocal?: boolean;
  isSent?: boolean;
}

interface PipelineRegistryProps {
  onEditQuote: (quoteId: string) => void;
  onBack: () => void;
}

export const PipelineRegistry: React.FC<PipelineRegistryProps> = ({ onEditQuote, onBack }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuoteToDelete, setSelectedQuoteToDelete] = useState<Quote | null>(null);
  const [convertingQuote, setConvertingQuote] = useState<Quote | null>(null);
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load quotes from localStorage
  const loadQuotes = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('opus_saved_quotes');
      let loadedQuotes: Quote[] = [];
      if (stored) {
        try {
          loadedQuotes = JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse saved quotes', e);
        }
      }
      setQuotes(loadedQuotes);
    }
  };

  useEffect(() => {
    loadQuotes();
  }, []);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleDelete = () => {
    if (!selectedQuoteToDelete) return;
    const updated = quotes.filter(q => q.id !== selectedQuoteToDelete.id);
    setQuotes(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('opus_saved_quotes', JSON.stringify(updated));
    }
    setSelectedQuoteToDelete(null);
    triggerToast('Quote deleted successfully', 'success');
  };

  const handleConvertToJob = () => {
    if (!convertingQuote) return;

    // Load active jobs
    let currentJobs: Job[] = [];
    const storedJobs = typeof window !== 'undefined' ? localStorage.getItem('opus_jobs') : null;
    if (storedJobs) {
      try {
        currentJobs = JSON.parse(storedJobs);
      } catch (e) {
        console.error('Failed to parse jobs', e);
      }
    } else {
      // fallback to initial mock values from Dashboard if we need to
      const INITIAL_JOBS: Job[] = [
        { id: '1', jobRef: 'OP-4921-X', siteName: 'Riverside Phase 2', mainContractor: 'Balfour Beatty', postcode: 'SW1A 1AA', currentPours: 5, contractMaxPours: 4, status: 'in-progress', scheduleValue: 42500 },
        { id: '2', jobRef: 'OP-5102-Y', siteName: 'Oakwood Grounds', mainContractor: 'Laing O\'Rourke', postcode: 'M1 1AE', currentPours: 2, contractMaxPours: 6, status: 'pending', scheduleValue: 18200 },
        { id: '3', jobRef: 'OP-3884-Z', siteName: 'Brentwood Hub', mainContractor: 'Kier Group', postcode: 'CM14 4BA', currentPours: 8, contractMaxPours: 8, status: 'completed', scheduleValue: 65400 },
        { id: '4', jobRef: 'OP-2291-A', siteName: 'Central Square', mainContractor: 'Skanska', postcode: 'B1 1BB', currentPours: 1, contractMaxPours: 10, status: 'in-progress', scheduleValue: 89000 },
        { id: '5', jobRef: 'OP-9921-B', siteName: 'Marina Development', mainContractor: 'Morgan Sindall', postcode: 'EH1 1YZ', currentPours: 12, contractMaxPours: 10, status: 'in-progress', scheduleValue: 54000 },
      ];
      currentJobs = INITIAL_JOBS;
    }

    // Create a new active Job object
    const newJob: Job = {
      id: Math.random().toString(36).substr(2, 9),
      jobRef: convertingQuote.reference.replace('QTE', 'OP').replace('JOB', 'OP'),
      siteName: convertingQuote.clientInfo.site || 'New Unassigned Site',
      mainContractor: convertingQuote.clientInfo.entity || 'Contractor',
      postcode: convertingQuote.clientInfo.postcode || 'N/A',
      currentPours: 0,
      contractMaxPours: 10,
      status: 'in-progress',
      scheduleValue: convertingQuote.totals?.grossTotal || 0
    };

    // Prepend new job and save
    const updatedJobs = [newJob, ...currentJobs];
    if (typeof window !== 'undefined') {
      localStorage.setItem('opus_jobs', JSON.stringify(updatedJobs));
    }

    // Remove quote from registry and save
    const updatedQuotes = quotes.filter(q => q.id !== convertingQuote.id);
    setQuotes(updatedQuotes);
    if (typeof window !== 'undefined') {
      localStorage.setItem('opus_saved_quotes', JSON.stringify(updatedQuotes));
    }

    // Cleanup state
    setConvertingQuote(null);
    triggerToast(`Converted ${convertingQuote.reference} to Active Job ${newJob.jobRef}`);
  };

  const filteredQuotes = quotes.filter(quote => !quote.isSavedLocal || quote.isSent === true);

  return (
    <div className="flex flex-col flex-1 w-full text-brand-white pb-24">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 right-6 z-[200] bg-brand-charcoal border-l-4 border-brand-accent p-4 rounded shadow-2xl flex items-center space-x-3 animate-in slide-in-from-right duration-300">
          <div className="w-2 h-2 rounded-full bg-brand-accent animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-white">{showToast.message}</span>
        </div>
      )}

      <main className="mt-0 pb-8 space-y-6">
        <div className="space-y-4">
          <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-2xl">
            {/* Table Header - hidden on mobile, shown on tablet/desktop */}
            <div className="hidden md:grid md:grid-cols-[120px_3fr_140px_100px_180px] gap-4 px-4 py-3 border-b border-[#2e2e2e] bg-[#222]">
              <span className="text-[8.5px] font-black tracking-widest uppercase text-gray-400">Quote Ref</span>
              <span className="text-[8.5px] font-black tracking-widest uppercase text-gray-400">Main Contractor / Site</span>
              <span className="text-[8.5px] font-black tracking-widest uppercase text-gray-400 text-right">Estimated Value</span>
              <span className="text-[8.5px] font-black tracking-widest uppercase text-gray-400">Date Issued</span>
              <span className="text-[8.5px] font-black tracking-widest uppercase text-gray-400 text-right">Pipeline Actions</span>
            </div>

            <div className="divide-y divide-[#2e2e2e]">
              <AnimatePresence mode="popLayout">
                {filteredQuotes.length === 0 ? (
                  <div className="px-4 py-12 text-center text-xs font-bold uppercase tracking-wider text-gray-500">
                    No matching pipeline estimates found
                  </div>
                ) : (
                  filteredQuotes.map((quote) => (
                    <motion.div 
                      key={quote.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      layout
                      className="flex flex-col md:grid md:grid-cols-[120px_3fr_140px_100px_180px] gap-4 px-4 py-4 md:py-0 md:min-h-[64px] items-center hover:bg-[#242424] transition-colors duration-150"
                    >
                      {/* Quote Ref */}
                      <div className="flex justify-between items-center w-full md:w-auto md:contents">
                        <button 
                          onClick={() => onEditQuote(quote.id)}
                          className="text-xs font-mono font-semibold text-[#8a9bb0] hover:text-white flex items-center gap-1.5 hover:underline transition-colors focus:outline-none"
                        >
                          <span>{quote.reference || `QTE-${quote.id.substring(0, 4).toUpperCase()}`}</span>
                          <ExternalLink className="w-3 h-3 text-gray-500" />
                        </button>
                        {/* Mobile-only date */}
                        <span className="md:hidden text-[8px] font-black text-gray-500 uppercase tracking-widest">
                          {quote.date || 'Pending'}
                        </span>
                      </div>

                      {/* Site / Contractor */}
                      <div className="w-full md:w-auto space-y-1 py-1.5">
                        <div className="text-sm font-semibold text-white">
                          {quote.clientInfo?.entity || 'No Contractor Data'}
                        </div>
                        <div className="text-xs font-medium text-gray-400">
                          {quote.clientInfo?.site || 'No site info'} ({quote.clientInfo?.postcode || 'N/A'})
                        </div>
                      </div>

                      {/* Estimated Value */}
                      <div className="w-full md:w-auto flex justify-between md:block md:text-right">
                        <span className="md:hidden text-[8.5px] text-gray-500 uppercase tracking-widest font-black">Value:</span>
                        <span className="text-xs font-mono font-semibold text-[#e0e0e0] tracking-wide">
                          £{(quote.totals?.grossTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Date Issued */}
                      <div className="hidden md:block text-xs text-gray-400 font-medium">
                        {quote.date || 'Pending'}
                      </div>

                      {/* Pipeline Actions */}
                      <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-3 pt-3 md:pt-0 border-t border-[#2a2a2a] md:border-0">
                        <span className="md:hidden text-[8.5px] text-gray-500 uppercase tracking-widest font-black">Actions:</span>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setConvertingQuote(quote)}
                            className="px-2.5 py-1.5 bg-[#2a2a2a] hover:bg-[#333] border border-[#3c3c3c] text-gray-400 hover:text-white text-[8px] font-black uppercase tracking-widest rounded-lg transition-all focus:outline-none"
                          >
                            Convert to Job
                          </button>
                          <button
                            onClick={() => setSelectedQuoteToDelete(quote)}
                            className="p-1.5 bg-[#2a2a2a] hover:bg-[#451e22] border border-[#3c3c3c] hover:border-[#5c2329] text-gray-400 hover:text-[#ff8591] rounded-lg transition-all focus:outline-none"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {selectedQuoteToDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setSelectedQuoteToDelete(null)} />
          <div className="bg-[#222428] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 pb-4 border-b border-white/5 bg-white/[0.01] flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Purge Pipeline Draft</h3>
                <p className="text-[8px] font-semibold text-white/30 uppercase tracking-widest mt-0.5">Permanent Database Deletion</p>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm font-medium text-white/80 leading-relaxed">
                Are you absolutely sure you want to permanently delete the estimate <span className="font-bold text-white">{selectedQuoteToDelete.reference}</span> for <span className="font-bold text-white">{selectedQuoteToDelete.clientInfo?.entity}</span>?
              </p>
              <div className="p-4 bg-white/5 border border-white/5 rounded-lg text-xs font-medium text-red-400 leading-relaxed">
                This action is irreversible and will permanently delete this record from the archive and data stores.
              </div>
            </div>

            <div className="p-6 bg-white/[0.01] border-t border-white/5 flex items-center space-x-3">
              <button
                onClick={() => setSelectedQuoteToDelete(null)}
                className="flex-1 py-3.5 border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-all rounded text-[9px] font-black uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white transition-all rounded text-[9px] font-black uppercase tracking-widest shadow-lg shadow-red-600/10"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Job Confirmation Modal */}
      {convertingQuote && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setConvertingQuote(null)} />
          <div className="bg-[#222428] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 pb-4 border-b border-white/5 bg-white/[0.01] flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-full bg-[#5C7285]/10 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-5 h-5 text-[#5C7285]" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Pipeline Authorization</h3>
                <p className="text-[8px] font-semibold text-white/30 uppercase tracking-widest mt-0.5">Transition Draft into Live Project</p>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm font-medium text-white/80 leading-relaxed">
                You are about to authorize estimate <span className="font-bold text-white">{convertingQuote.reference}</span> and convert it into a live contract under the Active Job Ledger.
              </p>
              <div className="bg-white/5 border border-white/5 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-white/50">Main Contractor:</span>
                  <span className="text-sm font-semibold text-white">{convertingQuote.clientInfo?.entity}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-white/50">Site Name:</span>
                  <span className="text-sm font-semibold text-white max-w-[180px] text-right truncate">{convertingQuote.clientInfo?.site}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                  <span className="text-xs font-medium text-white/50">Schedule Value:</span>
                  <span className="text-sm font-bold text-[#5C7285]">£{(convertingQuote.totals?.grossTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white/[0.01] border-t border-white/5 flex items-center space-x-3">
              <button
                onClick={() => setConvertingQuote(null)}
                className="flex-1 py-3.5 border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-all rounded text-[9px] font-black uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertToJob}
                className="flex-1 py-3.5 bg-[#5C7285] hover:brightness-110 text-white transition-all rounded text-[9px] font-black uppercase tracking-widest shadow-lg shadow-[#5C7285]/20 flex items-center justify-center space-x-1.5"
              >
                <span>Authorize & Deploy</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
