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
import { usePortal } from '../context/PortalContext';
import { supabase } from '@/integrations/supabase/client';

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
  const { jobs, setJobs } = usePortal();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuoteToDelete, setSelectedQuoteToDelete] = useState<Quote | null>(null);
  const [convertingQuote, setConvertingQuote] = useState<Quote | null>(null);
  const [selectedQuoteForControl, setSelectedQuoteForControl] = useState<Quote | null>(null);
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load quotes from Supabase
  const loadQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const loadedQuotes: Quote[] = (data || []).map(row => ({
        id: row.id,
        reference: row.reference,
        date: row.date,
        clientInfo: row.client_info,
        items: row.items,
        vatRate: Number(row.vat_rate),
        totals: row.totals,
        isSent: row.is_sent
      }));
      setQuotes(loadedQuotes);
    } catch (e) {
      console.error('Failed to load quotes from Supabase', e);
      triggerToast('Failed to load quotes', 'error');
    }
  };

  useEffect(() => {
    loadQuotes();
  }, []);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleDelete = async () => {
    if (!selectedQuoteToDelete) return;
    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', selectedQuoteToDelete.id);

      if (error) throw error;

      setQuotes(quotes.filter(q => q.id !== selectedQuoteToDelete.id));
      setSelectedQuoteToDelete(null);
      triggerToast('Quote deleted successfully', 'success');
    } catch (e) {
      console.error('Failed to delete quote', e);
      triggerToast('Failed to delete quote', 'error');
    }
  };

  const handleConvertToJob = async () => {
    if (!convertingQuote) return;

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

    // Prepend new job and persist through the portal context (Supabase-backed).
    setJobs(prev => [newJob, ...prev]);

    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', convertingQuote.id);

      if (error) throw error;

      setQuotes(quotes.filter(q => q.id !== convertingQuote.id));
      setConvertingQuote(null);
      triggerToast(`Converted ${convertingQuote.reference} to Active Job ${newJob.jobRef}`);
    } catch (e) {
      console.error('Failed to remove converted quote from database', e);
      triggerToast('Failed to complete conversion', 'error');
    }
  };

  const filteredQuotes = quotes;

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
            <div className="hidden md:grid md:grid-cols-[130px_3fr_150px_100px] gap-4 px-4 py-3 border-b border-[#2e2e2e] bg-[#222]">
              <span className="text-[8.5px] font-black tracking-widest uppercase text-gray-400">Quote Ref</span>
              <span className="text-[8.5px] font-black tracking-widest uppercase text-gray-400">Main Contractor / Site</span>
              <span className="text-[8.5px] font-black tracking-widest uppercase text-gray-400">Status & Date</span>
              <span className="text-[8.5px] font-black tracking-widest uppercase text-gray-400 text-right">Estimated Value</span>
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
                      className="flex flex-col md:grid md:grid-cols-[130px_3fr_150px_100px] gap-4 px-4 py-4 md:py-0 md:min-h-[64px] items-center hover:bg-[#242424] transition-colors duration-150 cursor-pointer"
                      onClick={() => setSelectedQuoteForControl(quote)}
                    >
                      {/* Quote Ref */}
                      <div className="w-full md:w-auto font-mono text-xs font-semibold text-gray-300">
                        {quote.reference || `QTE-${quote.id.substring(0, 4).toUpperCase()}`}
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

                      {/* Status & Date */}
                      <div className="w-full md:w-auto flex justify-between md:contents">
                        <span className="md:hidden text-[8.5px] text-gray-500 uppercase tracking-widest font-black">Status:</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider ${
                            quote.isSent 
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                              : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                          }`}>
                            {quote.isSent ? 'Sent' : 'Draft'}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">
                            {quote.date || 'Pending'}
                          </span>
                        </div>
                      </div>

                      {/* Estimated Value */}
                      <div className="w-full md:w-auto flex justify-between md:block md:text-right">
                        <span className="md:hidden text-[8.5px] text-gray-500 uppercase tracking-widest font-black">Value:</span>
                        <span className="text-xs font-mono font-semibold text-[#e0e0e0] tracking-wide">
                          £{(quote.totals?.grossTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
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

      {/* Quote Control Center Drawer Overlay */}
      <AnimatePresence>
        {selectedQuoteForControl && (
          <div className="fixed inset-0 z-[150] flex justify-end">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedQuoteForControl(null)} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl bg-[#1e1e24] border-l border-white/10 shadow-2xl h-full flex flex-col z-10"
            >
              {/* Sticky Header */}
              <div className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Quote Control Center</h3>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                    selectedQuoteForControl.isSent 
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                      : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                  }`}>
                    {selectedQuoteForControl.isSent ? 'Sent' : 'Draft'}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedQuoteForControl(null)}
                  className="p-1 rounded-lg bg-[#2a2a30] hover:bg-[#333] border border-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#18191d] border border-white/5 p-4 rounded-xl">
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">Contractor</span>
                    <span className="text-xs font-semibold text-white">{selectedQuoteForControl.clientInfo?.entity || 'N/A'}</span>
                  </div>
                  <div className="bg-[#18191d] border border-white/5 p-4 rounded-xl">
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">Reference</span>
                    <span className="text-xs font-mono font-semibold text-white">{selectedQuoteForControl.reference}</span>
                  </div>
                  <div className="bg-[#18191d] border border-white/5 p-4 rounded-xl">
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">Site / Project</span>
                    <span className="text-xs font-semibold text-white">{selectedQuoteForControl.clientInfo?.site || 'N/A'}</span>
                  </div>
                  <div className="bg-[#18191d] border border-white/5 p-4 rounded-xl">
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">Postcode</span>
                    <span className="text-xs font-semibold text-white">{selectedQuoteForControl.clientInfo?.postcode || 'N/A'}</span>
                  </div>
                </div>

                {/* Items list */}
                <div className="space-y-2">
                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Bill of Quantities</span>
                  <div className="bg-[#18191d] border border-white/5 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-[1fr_60px_60px_80px] gap-2 p-3 bg-white/[0.02] border-b border-white/5 text-[8px] font-black uppercase text-gray-400 tracking-widest">
                      <span>Description</span>
                      <span className="text-right">Qty</span>
                      <span>Unit</span>
                      <span className="text-right">Rate</span>
                    </div>
                    <div className="divide-y divide-white/5">
                      {selectedQuoteForControl.items && selectedQuoteForControl.items.length > 0 ? (
                        selectedQuoteForControl.items.map((item) => (
                          <div key={item.id} className="grid grid-cols-[1fr_60px_60px_80px] gap-2 p-3 text-xs">
                            <span className="text-white/80 font-medium">{item.description}</span>
                            <span className="text-right font-mono font-semibold text-white/50">{item.quantity}</span>
                            <span className="text-white/40 italic">{item.unit}</span>
                            <span className="text-right font-mono font-semibold text-white">
                              {typeof item.rate === 'string' && (item.rate.toUpperCase() === 'INCLUDED' || item.rate.toUpperCase() === 'INCL')
                                ? 'INCL'
                                : `£${Number(item.rate || 0).toFixed(2)}`}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-white/30 italic">No billable items added</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Summary Totals */}
                <div className="bg-[#18191d] border border-white/5 p-4 rounded-xl grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[7.5px] font-black text-gray-500 uppercase tracking-widest block mb-0.5">Net Subtotal</span>
                    <span className="text-xs font-mono font-semibold text-white">
                      £{(selectedQuoteForControl.totals?.netTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[7.5px] font-black text-gray-500 uppercase tracking-widest block mb-0.5">VAT ({selectedQuoteForControl.vatRate || 20}%)</span>
                    <span className="text-xs font-mono font-semibold text-white">
                      £{(selectedQuoteForControl.totals?.vatAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-[#24262b] border border-white/10 rounded-lg p-2">
                    <span className="text-[7.5px] font-black text-brand-accent uppercase tracking-widest block mb-0.5">Gross Total</span>
                    <span className="text-xs font-mono font-black text-brand-white">
                      £{(selectedQuoteForControl.totals?.grossTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sticky Footer Actions */}
              <div className="p-6 border-t border-white/5 bg-white/[0.01] flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setSelectedQuoteForControl(null);
                    onEditQuote(selectedQuoteForControl.id);
                  }}
                  className="flex-1 py-3 bg-[#2a2a30] hover:bg-[#333] border border-white/10 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all text-center focus:outline-none"
                >
                  Edit Quote
                </button>
                <button
                  onClick={() => {
                    const quote = selectedQuoteForControl;
                    setSelectedQuoteForControl(null);
                    setConvertingQuote(quote);
                  }}
                  className="flex-1 py-3 bg-[#5C7285] hover:brightness-110 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all text-center focus:outline-none"
                >
                  Convert to Job
                </button>
                <button
                  onClick={() => {
                    const quote = selectedQuoteForControl;
                    setSelectedQuoteForControl(null);
                    setSelectedQuoteToDelete(quote);
                  }}
                  className="py-3 px-4 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all focus:outline-none"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
