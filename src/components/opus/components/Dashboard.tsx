import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  LogOut, 
  ChevronRight, 
  AlertCircle, 
  ArrowUpRight,
  ClipboardList,
  Target,
  Truck,
  Wallet,
  MoreVertical,
  Plus,
  FileText,
  CloudRain,
  Snowflake,
  Wind,
  Sun,
  AlertTriangle,
  CloudSun,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Job, Worker, ScheduledShift } from '../types/erp';
import { INITIAL_ROSTER, INITIAL_SHIFTS } from '../data/roster';
import { QuoteInvoiceBuilder } from './QuoteInvoiceBuilder';
import { PipelineRegistry } from './PipelineRegistry';
import { JobDetails } from './JobDetails';
import { LaborRosterCalendar } from './LaborRosterCalendar';
import { getWeatherForJob } from '../utils/weather';

interface DashboardProps {
  onLogout: () => void;
}

const INITIAL_JOBS: Job[] = [
  { id: '1', jobRef: 'OP-4921-X', siteName: 'Riverside Phase 2', mainContractor: 'Balfour Beatty', postcode: 'SW1A 1AA', currentPours: 5, contractMaxPours: 4, status: 'in-progress', scheduleValue: 42500 },
  { id: '2', jobRef: 'OP-5102-Y', siteName: 'Oakwood Grounds', mainContractor: 'Laing O\'Rourke', postcode: 'M1 1AE', currentPours: 2, contractMaxPours: 6, status: 'pending', scheduleValue: 18200 },
  { id: '3', jobRef: 'OP-3884-Z', siteName: 'Brentwood Hub', mainContractor: 'Kier Group', postcode: 'CM14 4BA', currentPours: 8, contractMaxPours: 8, status: 'completed', scheduleValue: 65400 },
  { id: '4', jobRef: 'OP-2291-A', siteName: 'Central Square', mainContractor: 'Skanska', postcode: 'B1 1BB', currentPours: 1, contractMaxPours: 10, status: 'in-progress', scheduleValue: 89000 },
  { id: '5', jobRef: 'OP-9921-B', siteName: 'Marina Development', mainContractor: 'Morgan Sindall', postcode: 'EH1 1YZ', currentPours: 12, contractMaxPours: 10, status: 'in-progress', scheduleValue: 54000 },
];

const METRICS = [
  { label: 'Total Projects', value: '38', icon: ClipboardList, color: 'text-white' },
  { label: 'Quotes Out', value: '12', icon: Target, color: 'text-white' },
  { label: 'Pours Pending Bill', value: '07', icon: Truck, color: 'text-amber-500' },
  { label: 'Slab Value', value: '£4.2M', icon: Wallet, color: 'text-brand-accent' },
];

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [currentView, setCurrentView] = useState<'ledger' | 'quote-builder' | 'pipeline-registry' | 'job-details' | 'calendar' | 'staff'>('ledger');
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<Job['status'] | 'all'>('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [workers, setWorkers] = useState<Worker[]>(() => {
    const stored = localStorage.getItem('opus_workers');
    return stored ? JSON.parse(stored) : INITIAL_ROSTER;
  });
  
  const [shifts, setShifts] = useState<ScheduledShift[]>(() => {
    const stored = localStorage.getItem('opus_shifts');
    return stored ? JSON.parse(stored) : INITIAL_SHIFTS;
  });

  useEffect(() => {
    localStorage.setItem('opus_workers', JSON.stringify(workers));
  }, [workers]);

  useEffect(() => {
    localStorage.setItem('opus_shifts', JSON.stringify(shifts));
  }, [shifts]);

  const [jobs, setJobs] = useState<Job[]>(() => {
    const stored = localStorage.getItem('opus_jobs');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse jobs', e);
      }
    }
    return INITIAL_JOBS;
  });

  // Keep jobs synchronized to localStorage
  useEffect(() => {
    localStorage.setItem('opus_jobs', JSON.stringify(jobs));
  }, [jobs]);

  // Scroll to top when view or selected item changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentView, selectedJobId, selectedQuoteId]);

  const followups = [
    { name: 'Riverside P2', keyword: 'Riverside', fallbackId: '1', reason: 'Site Access Auth' },
    { name: 'Marina Dev', keyword: 'Marina', fallbackId: '5', reason: 'Design Variation' },
    { name: 'Oakwood Hub', keyword: 'Oakwood', fallbackId: '2', reason: 'Materials Delay' }
  ];

  const getJobActionRequired = (job: Job) => {
    const weather = getWeatherForJob(job);
    const followup = followups.find(f => job.siteName.toLowerCase().includes(f.keyword.toLowerCase()));
    
    if (weather.isImpactful || followup) {
      return {
        hasAction: true,
        weather: weather.isImpactful ? weather : null,
        followup: followup || null
      };
    }
    return { hasAction: false, weather: null, followup: null };
  };

  const filteredJobs = jobs.filter(job => filterStatus === 'all' || job.status === filterStatus);

  const handleUpdateJob = (updatedJob: Job) => {
    setJobs(prevJobs => prevJobs.map(job => job.id === updatedJob.id ? updatedJob : job));
  };

  return (
    <div className="min-h-screen bg-[#1A1B1E] text-brand-white font-sans selection:bg-brand-accent/30 selection:text-white">
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-[#1A1B1E] border-b border-white/5 z-50 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center group cursor-pointer" onClick={() => setCurrentView('ledger')}>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tighter leading-none transition-colors group-hover:text-brand-accent font-archivo uppercase">OPUS FORM</span>
                <div className="h-0.5 w-full bg-brand-accent mt-1"></div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-6">
              <button 
                onClick={() => setCurrentView('ledger')}
                className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${currentView === 'ledger' ? 'text-brand-accent' : 'text-brand-white/70 hover:text-brand-white'}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setCurrentView('calendar')}
                className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${currentView === 'calendar' ? 'text-brand-accent' : 'text-brand-white/70 hover:text-brand-white'}`}
              >
                Calendar
              </button>
              <button 
                onClick={() => setCurrentView('staff')}
                className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${currentView === 'staff' ? 'text-brand-accent' : 'text-brand-white/70 hover:text-brand-white'}`}
              >
                Staff
              </button>
              <button 
                onClick={() => setCurrentView('quote-builder')}
                className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${currentView === 'quote-builder' ? 'text-brand-accent' : 'text-brand-white/70 hover:text-brand-white'}`}
              >
                Quote
              </button>
              <button 
                onClick={() => setCurrentView('pipeline-registry')}
                className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${currentView === 'pipeline-registry' ? 'text-brand-accent' : 'text-brand-white/70 hover:text-brand-white'}`}
              >
                Quote Management
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={onLogout}
              className="hidden lg:flex items-center space-x-2 px-4 py-2 border border-white/10 rounded hover:bg-white/5 transition-all group active:scale-95"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-brand-white">Terminate Session</span>
              <LogOut className="w-4 h-4 text-white/40 group-hover:text-brand-white" />
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-brand-white hover:bg-white/5 rounded transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-3/4 max-w-sm bg-[#1A1B1E] border-l border-white/5 z-[70] lg:hidden p-6 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center group cursor-pointer" onClick={() => { setCurrentView('ledger'); setIsMobileMenuOpen(false); }}>
                  <div className="flex flex-col">
                    <span className="text-xl font-black tracking-tighter leading-none font-archivo uppercase">OPUS FORM</span>
                    <div className="h-0.5 w-full bg-brand-accent mt-1"></div>
                  </div>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-white/40">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6 flex-1">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4">Main Menu</p>
                  <button 
                    onClick={() => { setCurrentView('ledger'); setIsMobileMenuOpen(false); }} 
                    className={`block w-full text-left py-3 text-sm font-bold uppercase tracking-widest border-b border-white/5 transition-colors ${currentView === 'ledger' ? 'text-brand-accent' : 'text-white/40 hover:text-white'}`}
                  >
                    Dashboard
                  </button>
                  <button 
                    onClick={() => { setCurrentView('calendar'); setIsMobileMenuOpen(false); }} 
                    className={`block w-full text-left py-3 text-sm font-bold uppercase tracking-widest border-b border-white/5 transition-colors ${currentView === 'calendar' ? 'text-brand-accent' : 'text-white/40 hover:text-white'}`}
                  >
                    Calendar
                  </button>
                  <button 
                    onClick={() => { setCurrentView('staff'); setIsMobileMenuOpen(false); }} 
                    className={`block w-full text-left py-3 text-sm font-bold uppercase tracking-widest border-b border-white/5 transition-colors ${currentView === 'staff' ? 'text-brand-accent' : 'text-white/40 hover:text-white'}`}
                  >
                    Staff
                  </button>
                  <button 
                    onClick={() => { setCurrentView('quote-builder'); setIsMobileMenuOpen(false); }} 
                    className={`block w-full text-left py-3 text-sm font-bold uppercase tracking-widest border-b border-white/5 transition-colors ${currentView === 'quote-builder' ? 'text-brand-accent' : 'text-white/40 hover:text-white'}`}
                  >
                    Quote
                  </button>
                  <button 
                    onClick={() => { setCurrentView('pipeline-registry'); setIsMobileMenuOpen(false); }} 
                    className={`block w-full text-left py-3 text-sm font-bold uppercase tracking-widest border-b border-white/5 transition-colors ${currentView === 'pipeline-registry' ? 'text-brand-accent' : 'text-white/40 hover:text-white'}`}
                  >
                    Quote Management
                  </button>
                  <a href="#" className="block py-3 text-sm font-bold uppercase tracking-widest text-white/40 hover:text-brand-white transition-colors border-b border-white/5">Analytics</a>
                </div>
              </div>

              <button 
                onClick={onLogout}
                className="mt-auto flex items-center justify-center space-x-3 w-full py-4 border border-white/10 rounded text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Terminate Session</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {currentView === 'quote-builder' ? (
        <QuoteInvoiceBuilder 
          onLogout={onLogout} 
          onBack={() => setCurrentView('ledger')} 
          quoteToLoadId={selectedQuoteId}
          onQuoteLoaded={() => setSelectedQuoteId(null)}
        />
      ) : currentView === 'pipeline-registry' ? (
        <PipelineRegistry 
          onEditQuote={(quoteId) => {
            setSelectedQuoteId(quoteId);
            setCurrentView('quote-builder');
          }}
          onBack={() => setCurrentView('ledger')}
        />
      ) : currentView === 'calendar' || currentView === 'staff' ? (
        <main className="pt-24 pb-12 px-4 sm:px-6 max-w-7xl mx-auto">
          <LaborRosterCalendar 
            view={currentView}
            jobs={jobs}
            workers={workers}
            setWorkers={setWorkers}
            shifts={shifts}
            setShifts={setShifts}
            onBack={() => setCurrentView('ledger')}
            onNavigate={(view) => setCurrentView(view)}
          />
        </main>
      ) : currentView === 'job-details' && selectedJobId && jobs.find(j => j.id === selectedJobId) ? (
        <JobDetails 
          job={jobs.find(j => j.id === selectedJobId)!}
          workers={workers}
          onBack={() => setCurrentView('ledger')}
          onUpdateJob={handleUpdateJob}
        />
      ) : (
        <main className="pt-20 pb-8 px-4 sm:px-6 max-w-6xl mx-auto space-y-6">
        {/* Contract & Job Ledger */}
        <div className="space-y-4 max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 border-b border-[#2a2a2a] pb-3">
            <div className="flex items-center gap-2 text-[11px] font-black tracking-widest uppercase text-white">
              <div className="w-1 h-4 bg-[#b0b8c4] rounded-sm" />
              Active Job Ledger
            </div>
            <div className="w-full sm:w-auto overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-1 sm:pb-0">
              <div className="flex items-center bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg p-1 gap-1 shadow-inner min-w-max">
                {(['all', 'in-progress', 'pending', 'completed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`rounded-md px-3 py-1.5 text-[9px] font-black tracking-widest uppercase whitespace-nowrap transition-all duration-200 ${
                      filterStatus === status 
                        ? 'bg-[#333] text-white shadow-md border border-[#444]' 
                        : 'text-[#777] hover:text-[#aaa] hover:bg-[#252525]'
                    }`}
                  >
                    {status.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-2xl">
            {/* Table Header - hidden on mobile, shown on tablet/desktop */}
            <div className="hidden md:grid md:grid-cols-[120px_2fr_1fr_140px_100px] gap-4 px-4 py-3 border-b border-[#2e2e2e] bg-[#222]">
              <span className="text-[8.5px] font-black tracking-widest uppercase text-[#888]">Job Ref</span>
              <span className="text-[8.5px] font-black tracking-widest uppercase text-[#888]">Site / Contractor</span>
              <span className="text-[8.5px] font-black tracking-widest uppercase text-[#888]">Site Warnings</span>
              <span className="text-[8.5px] font-black tracking-widest uppercase text-[#888]">Job Status</span>
              <span className="text-[8.5px] font-black tracking-widest uppercase text-[#888] text-right">Action</span>
            </div>

            <div className="divide-y divide-[#2e2e2e]">
              <AnimatePresence mode="popLayout">
                {filteredJobs.length === 0 ? (
                  <div className="px-4 py-12 text-center text-[11px] font-black uppercase tracking-widest text-[#555]">
                    No active jobs found
                  </div>
                ) : (
                  filteredJobs.map((job) => {
                    const action = getJobActionRequired(job);
                    return (
                    <motion.div 
                      key={job.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      layout
                      className="flex flex-col md:grid md:grid-cols-[120px_2fr_1fr_140px_100px] gap-4 px-4 py-4 md:py-0 md:min-h-[64px] items-center hover:bg-[#242424] transition-colors duration-150"
                    >
                      {/* Job Ref */}
                      <div className="flex justify-between items-center w-full md:w-auto md:contents">
                        <button 
                          onClick={() => {
                            setSelectedJobId(job.id);
                            setCurrentView('job-details');
                          }}
                          className="text-[10.5px] font-black text-[#8a9bb0] hover:text-white tracking-widest hover:underline transition-colors text-left focus:outline-none"
                        >
                          {job.jobRef}
                        </button>
                        {/* Mobile-only status badge */}
                        <div className="md:hidden">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[8px] font-black tracking-widest uppercase border ${
                            job.status === 'in-progress' ? 'bg-[#1e2a3a]/80 border-[#2a4060] text-[#6090c0]' :
                            job.status === 'pending' ? 'bg-[#2a2a1e]/80 border-[#44440a] text-[#888844]' :
                            'bg-[#1a2e1a]/80 border-[#2a5a2a] text-[#4a9a4a]'
                          }`}>
                            {job.status === 'in-progress' ? 'In Progress' : job.status}
                          </span>
                        </div>
                      </div>

                      {/* Site / Contractor */}
                      <div className="w-full md:w-auto space-y-1.5 py-1">
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-black text-white tracking-wider uppercase">
                            {job.siteName}
                          </div>
                          <div className="text-[9px] font-bold text-[#777] tracking-widest uppercase">
                            {job.mainContractor}
                          </div>
                        </div>
                        {/* Mobile Action Required Badges */}
                        <div className="md:hidden flex flex-wrap items-center gap-1.5 mt-2">
                          {(action.weather || action.followup) && (
                            <>
                              {action.weather && (
                                <span className="inline-flex items-center gap-1 rounded bg-[#3a2024]/40 px-1.5 py-0.5 border border-[#ff8591]/20 text-[8.5px] font-black tracking-widest uppercase text-[#ff8591]">
                                  <CloudSun className="w-2.5 h-2.5" />
                                  {action.weather.condition} ({action.weather.temperature}°C)
                                </span>
                              )}
                              {action.followup && (
                                <span className="inline-flex items-center gap-1 rounded bg-[#3a2e20]/40 px-1.5 py-0.5 border border-[#f59e0b]/20 text-[8.5px] font-black tracking-widest uppercase text-[#f59e0b]">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  {action.followup.reason}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Desktop Action Required Badges Column */}
                      <div className="hidden md:flex flex-col items-start gap-1.5 py-1">
                        {(action.weather || action.followup) && (
                          <>
                            {action.weather && (
                              <span className="inline-flex items-center gap-1 rounded bg-[#3a2024]/40 px-1.5 py-0.5 border border-[#ff8591]/20 text-[8.5px] font-black tracking-widest uppercase text-[#ff8591]">
                                <CloudSun className="w-2.5 h-2.5" />
                                {action.weather.condition} ({action.weather.temperature}°C)
                              </span>
                            )}
                            {action.followup && (
                              <span className="inline-flex items-center gap-1 rounded bg-[#3a2e20]/40 px-1.5 py-0.5 border border-[#f59e0b]/20 text-[8.5px] font-black tracking-widest uppercase text-[#f59e0b]">
                                <AlertCircle className="w-2.5 h-2.5" />
                                {action.followup.reason}
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Job Status (Desktop/Tablet-only) */}
                      <div className="hidden md:block">
                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[8.5px] font-black tracking-widest uppercase border ${
                          job.status === 'in-progress' ? 'bg-[#1e2a3a]/80 border-[#3a5a8a] text-[#8ab4f8] shadow-[0_0_10px_rgba(138,180,248,0.1)]' :
                          job.status === 'pending' ? 'bg-[#2a2a1e]/80 border-[#66661a] text-[#c0c040] shadow-[0_0_10px_rgba(192,192,64,0.1)]' :
                          'bg-[#1a2e1a]/80 border-[#3a7a3a] text-[#81c995] shadow-[0_0_10px_rgba(129,201,149,0.1)]'
                        }`}>
                          {job.status === 'in-progress' ? 'In Progress' : job.status}
                        </span>
                      </div>

                      {/* Action (Manage) */}
                      <div className="flex justify-between items-center w-full md:w-auto md:justify-end">
                        <button 
                          onClick={() => {
                            setSelectedJobId(job.id);
                            setCurrentView('job-details');
                          }}
                          className="group flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-[#2a2a2a] hover:bg-[#333] border border-[#3c3c3c] rounded-lg text-[8px] font-black tracking-widest uppercase text-[#aaa] hover:text-white transition-all duration-200 focus:outline-none"
                        >
                          <span>Manage</span>
                          <ChevronRight className="w-3 h-3 text-[#777] group-hover:text-white transition-colors" />
                        </button>
                      </div>
                    </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    )}

      {/* Footer Attribution */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center space-y-4">
          <div className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em] text-center">
            OPUS FORM &bull; 2026
          </div>
          <div className="flex items-center space-x-8 text-[8px] font-black text-white/10 uppercase tracking-widest">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>


    </div>
  );
};
