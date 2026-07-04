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
    const stored = localStorage.getItem('opus_saved_quotes');
    let loadedQuotes: Quote[] = [];
    if (stored) {
      try {
        loadedQuotes = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse saved quotes', e);
      }
    }
    
    if (!stored || loadedQuotes.length === 0) {
      const mockQuotes: Quote[] = [
        {
          id: 'mock-q1',
          reference: 'QTE-4921-X',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
          clientInfo: {
            entity: 'Balfour Beatty',
            email: 'procurement@balfourbeatty.com',
            site: 'Riverside Extension Phase 3',
            postcode: 'SW1A 1AA'
          },
          items: [
            { id: '1', description: 'Concrete Pour Type A3', quantity: 120, unit: 'm³', rate: 145, isIncluded: false },
            { id: '2', description: 'Rebar Reinforcement Install', quantity: 250, unit: 'm²', rate: 45, isIncluded: false }
          ],
          vatRate: 20,
          totals: { netTotal: 28650, vatAmount: 5730, grossTotal: 34380 }
        },
        {
          id: 'mock-q2',
          reference: 'QTE-8812-Y',
          date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
          clientInfo: {
            entity: 'Laing O\'Rourke',
            email: 'estimates@laingorourke.com',
            site: 'Oakwood Commercial Foundations',
            postcode: 'M1 1AE'
          },
          items: [
            { id: '1', description: 'C30 Concrete Base Slabs', quantity: 1, unit: 'SUM', rate: 'Included', isIncluded: true },
            { id: '2', description: 'Sub-base excavation and levelling', quantity: 450, unit: 'm²', rate: 85, isIncluded: false }
          ],
          vatRate: 20,
          totals: { netTotal: 38250, vatAmount: 7650, grossTotal: 45900 }
        },
        {
          id: 'mock-q3',
          reference: 'QTE-3391-Z',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
          clientInfo: {
            entity: 'Kier Group',
            email: 'contracts@kier.co.uk',
            site: 'Brentwood Depot Slab',
            postcode: 'CM14 4BA'
          },
          items: [
            { id: '1', description: 'High-Strength Concrete Pours', quantity: 380, unit: 'm³', rate: 160, isIncluded: false }
          ],
          vatRate: 20,
          totals: { netTotal: 60800, vatAmount: 12160, grossTotal: 72960 }
        },
        {
          id: 'mock-q4',
          reference: 'QTE-1102-A',
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
          clientInfo: {
            entity: 'Skanska',
            email: 'estimates.uk@skanska.co.uk',
            site: 'Central Square Basement',
            postcode: 'B1 1BB'
          },
          items: [
            { id: '1', description: 'RC Foundation Slab Pour', quantity: 500, unit: 'm³', rate: 135, isIncluded: false },
            { id: '2', description: 'Formwork and Shuttering Prep', quantity: 1, unit: 'SUM', rate: 12000, isIncluded: false }
          ],
          vatRate: 20,
          totals: { netTotal: 79500, vatAmount: 15900, grossTotal: 95400 }
        },
        {
          id: 'mock-q5',
          reference: 'QTE-9938-B',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
          clientInfo: {
            entity: 'Morgan Sindall',
            email: 'procurement@morgansindall.com',
            site: 'Marina Development Quay Wall',
            postcode: 'EH1 1YZ'
          },
          items: [
            { id: '1', description: 'Marine-Grade Concrete Pour', quantity: 220, unit: 'm³', rate: 195, isIncluded: false }
          ],
          vatRate: 20,
          totals: { netTotal: 42900, vatAmount: 8580, grossTotal: 51480 }
        }
      ];
      setQuotes(mockQuotes);
      localStorage.setItem('opus_saved_quotes', JSON.stringify(mockQuotes));
    } else {
      setQuotes(loadedQuotes);
    }
  };

  const handleManualSeed = () => {
    const mockQuotes: Quote[] = [
      {
        id: 'mock-q1-' + Date.now(),
        reference: 'QTE-4921-X',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
        clientInfo: {
          entity: 'Balfour Beatty',
          email: 'procurement@balfourbeatty.com',
          site: 'Riverside Extension Phase 3',
          postcode: 'SW1A 1AA'
        },
        items: [
          { id: '1', description: 'Concrete Pour Type A3', quantity: 120, unit: 'm³', rate: 145, isIncluded: false },
          { id: '2', description: 'Rebar Reinforcement Install', quantity: 250, unit: 'm²', rate: 45, isIncluded: false }
        ],
        vatRate: 20,
        totals: { netTotal: 28650, vatAmount: 5730, grossTotal: 34380 }
      },
      {
        id: 'mock-q2-' + Date.now(),
        reference: 'QTE-8812-Y',
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
        clientInfo: {
          entity: 'Laing O\'Rourke',
          email: 'estimates@laingorourke.com',
          site: 'Oakwood Commercial Foundations',
          postcode: 'M1 1AE'
        },
        items: [
          { id: '1', description: 'C30 Concrete Base Slabs', quantity: 1, unit: 'SUM', rate: 'Included', isIncluded: true },
          { id: '2', description: 'Sub-base excavation and levelling', quantity: 450, unit: 'm²', rate: 85, isIncluded: false }
        ],
        vatRate: 20,
        totals: { netTotal: 38250, vatAmount: 7650, grossTotal: 45900 }
      },
      {
        id: 'mock-q3-' + Date.now(),
        reference: 'QTE-3391-Z',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
        clientInfo: {
          entity: 'Kier Group',
          email: 'contracts@kier.co.uk',
          site: 'Brentwood Depot Slab',
          postcode: 'CM14 4BA'
        },
        items: [
          { id: '1', description: 'High-Strength Concrete Pours', quantity: 380, unit: 'm³', rate: 160, isIncluded: false }
        ],
        vatRate: 20,
        totals: { netTotal: 60800, vatAmount: 12160, grossTotal: 72960 }
      },
      {
        id: 'mock-q4-' + Date.now(),
        reference: 'QTE-1102-A',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
        clientInfo: {
          entity: 'Skanska',
          email: 'estimates.uk@skanska.co.uk',
          site: 'Central Square Basement',
          postcode: 'B1 1BB'
        },
        items: [
          { id: '1', description: 'RC Foundation Slab Pour', quantity: 500, unit: 'm³', rate: 135, isIncluded: false },
          { id: '2', description: 'Formwork and Shuttering Prep', quantity: 1, unit: 'SUM', rate: 12000, isIncluded: false }
        ],
        vatRate: 20,
        totals: { netTotal: 79500, vatAmount: 15900, grossTotal: 95400 }
      },
      {
        id: 'mock-q5-' + Date.now(),
        reference: 'QTE-9938-B',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
        clientInfo: {
          entity: 'Morgan Sindall',
          email: 'procurement@morgansindall.com',
          site: 'Marina Development Quay Wall',
          postcode: 'EH1 1YZ'
        },
        items: [
          { id: '1', description: 'Marine-Grade Concrete Pour', quantity: 220, unit: 'm³', rate: 195, isIncluded: false }
        ],
        vatRate: 20,
        totals: { netTotal: 42900, vatAmount: 8580, grossTotal: 51480 }
      }
    ];
    setQuotes(mockQuotes);
    localStorage.setItem('opus_saved_quotes', JSON.stringify(mockQuotes));
    triggerToast('Quote Management populated with 5 test estimates ⚡');
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
    localStorage.setItem('opus_saved_quotes', JSON.stringify(updated));
    setSelectedQuoteToDelete(null);
    triggerToast('Quote deleted successfully', 'success');
  };

  const handleConvertToJob = () => {
    if (!convertingQuote) return;

    // Load active jobs
    let currentJobs: Job[] = [];
    const storedJobs = localStorage.getItem('opus_jobs');
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
    localStorage.setItem('opus_jobs', JSON.stringify(updatedJobs));

    // Remove quote from registry and save
    const updatedQuotes = quotes.filter(q => q.id !== convertingQuote.id);
    setQuotes(updatedQuotes);
    localStorage.setItem('opus_saved_quotes', JSON.stringify(updatedQuotes));

    // Cleanup state
    setConvertingQuote(null);
    triggerToast(`Converted ${convertingQuote.reference} to Active Job ${newJob.jobRef}`);
  };

  const filteredQuotes = quotes.filter(quote => !quote.isSavedLocal || quote.isSent === true);

  return (
    <div className="min-h-screen bg-[#1A1B1E] text-brand-white font-sans selection:bg-brand-accent/30 selection:text-white pb-24 pt-16">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 right-6 z-[200] bg-brand-charcoal border-l-4 border-brand-accent p-4 rounded shadow-2xl flex items-center space-x-3 animate-in slide-in-from-right duration-300">
          <div className="w-2 h-2 rounded-full bg-brand-accent animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-white">{showToast.message}</span>
        </div>
      )}

      {/* Sub-Header Section */}
      <div className="border-b border-white/5 bg-[#222428] py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest font-archivo text-white leading-tight">
              Quote Management
            </h1>
          </div>

          {/* Controls Section */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <button
              onClick={handleManualSeed}
              className="px-4 py-3 bg-[#5C7285]/10 border border-[#5C7285]/30 hover:bg-[#5C7285]/20 text-brand-accent text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center space-x-2 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Seed Test Quotes</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-10">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 text-[11px] font-extrabold tracking-widest uppercase text-[#e0e0e0]">
              <div className="w-[3px] h-4 bg-[#b0b8c4] rounded-[2px]" />
              Pipeline Estimates Ledger
            </div>
          </div>

          <div className="bg-[#242424] border border-[#333] rounded-xl overflow-hidden">
            {/* Table Header - hidden on mobile, shown on tablet/desktop */}
            <div className="hidden md:grid md:grid-cols-[110px_1fr_120px_110px_180px] px-4 py-2.5 border-b border-[#2e2e2e]">
              <span className="text-[9px] font-bold tracking-widest uppercase text-[#555]">Quote Ref</span>
              <span className="text-[9px] font-bold tracking-widest uppercase text-[#555]">Main Contractor / Site</span>
              <span className="text-[9px] font-bold tracking-widest uppercase text-[#555]">Estimated Value</span>
              <span className="text-[9px] font-bold tracking-widest uppercase text-[#555]">Date Issued</span>
              <span className="text-[9px] font-bold tracking-widest uppercase text-[#555] text-right">Pipeline Actions</span>
            </div>

            <div className="divide-y divide-[#2a2a2a]">
              <AnimatePresence mode="popLayout">
                {filteredQuotes.length === 0 ? (
                  <div className="px-4 py-12 text-center text-[10px] font-bold uppercase tracking-widest text-[#555]">
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
                      className="flex flex-col md:grid md:grid-cols-[110px_1fr_120px_110px_180px] px-4 py-4 md:py-0 md:min-h-[64px] items-center hover:bg-[#292929] transition-colors duration-120 gap-3 md:gap-0"
                    >
                      {/* Quote Ref */}
                      <div className="flex justify-between items-center w-full md:w-auto md:contents">
                        <button 
                          onClick={() => onEditQuote(quote.id)}
                          className="text-[11px] font-bold text-[#b0b8c4] hover:text-white tracking-wide flex items-center gap-1 hover:underline transition-colors"
                        >
                          <span>{quote.reference || `QTE-${quote.id.substring(0, 4).toUpperCase()}`}</span>
                          <ExternalLink className="w-3 h-3 text-[#555]" />
                        </button>
                        {/* Mobile-only date */}
                        <span className="md:hidden text-[9px] font-bold text-[#555] uppercase tracking-wider">
                          {quote.date || 'Pending'}
                        </span>
                      </div>

                      {/* Site / Contractor */}
                      <div className="w-full md:w-auto">
                        <div className="text-[12px] font-extrabold text-[#e0e0e0] tracking-wide uppercase">
                          {quote.clientInfo?.entity || 'No Contractor Data'}
                        </div>
                        <div className="text-[10px] text-[#555] tracking-widest uppercase mt-0.5">
                          {quote.clientInfo?.site || 'No site info'} ({quote.clientInfo?.postcode || 'N/A'})
                        </div>
                      </div>

                      {/* Estimated Value */}
                      <div className="w-full md:w-auto flex justify-between md:block">
                        <span className="md:hidden text-[9px] text-[#555] uppercase tracking-wider font-extrabold">Value:</span>
                        <span className="text-[13px] font-bold text-[#e0e0e0]">
                          £{(quote.totals?.grossTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Date Issued */}
                      <div className="hidden md:block text-[11px] text-[#777] font-medium uppercase tracking-wide">
                        {quote.date || 'Pending'}
                      </div>

                      {/* Pipeline Actions */}
                      <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-3 pt-3 md:pt-0 border-t border-[#2a2a2a] md:border-0">
                        <span className="md:hidden text-[9px] text-[#555] uppercase tracking-wider font-extrabold">Actions:</span>
                        
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setConvertingQuote(quote)}
                            className="px-3 py-1.5 bg-[#5C7285] hover:bg-[#6c8295] text-white text-[9px] font-bold uppercase tracking-wider rounded transition-colors"
                          >
                            Convert to Job
                          </button>
                          <button
                            onClick={() => setSelectedQuoteToDelete(quote)}
                            className="px-3 py-1.5 bg-[#451e22] hover:bg-[#5c2329] text-[#ff8591] text-[9px] font-bold uppercase tracking-wider rounded transition-colors"
                          >
                            Delete
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
              <p className="text-xs font-medium text-white/60 leading-relaxed uppercase tracking-wide">
                Are you absolutely sure you want to permanently delete the estimate <span className="font-bold text-white">{selectedQuoteToDelete.reference}</span> for <span className="font-bold text-white">{selectedQuoteToDelete.clientInfo?.entity}</span>?
              </p>
              <div className="p-4 bg-white/5 border border-white/5 rounded-lg text-[9px] font-bold text-red-400 uppercase tracking-widest leading-relaxed">
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
              <p className="text-xs font-medium text-white/60 leading-relaxed uppercase tracking-wide">
                You are about to authorize estimate <span className="font-bold text-white">{convertingQuote.reference}</span> and convert it into a live contract under the Active Job Ledger.
              </p>

              <div className="bg-white/5 border border-white/5 rounded-lg p-4 space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Main Contractor:</span>
                  <span className="text-[9px] font-black text-white uppercase">{convertingQuote.clientInfo?.entity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Site Name:</span>
                  <span className="text-[9px] font-black text-white uppercase max-w-[180px] text-right truncate">{convertingQuote.clientInfo?.site}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Schedule Value:</span>
                  <span className="text-[9px] font-black text-[#5C7285] uppercase">£{(convertingQuote.totals?.grossTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
