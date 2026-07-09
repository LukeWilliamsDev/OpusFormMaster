// @ts-nocheck
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
  Calendar,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Job, Worker, ScheduledShift } from '../types/erp';
import { INITIAL_ROSTER, INITIAL_SHIFTS } from '../data/roster';
import { QuoteInvoiceBuilder } from './QuoteInvoiceBuilder';
import { PipelineRegistry } from './PipelineRegistry';
import { JobDetails } from './JobDetails';
import { LaborRosterCalendar } from './LaborRosterCalendar';
import { getWeatherForJob } from '../utils/weather';
import { ExpiryRadar } from './ExpiryRadar';
import { ActiveJobLedger } from './ActiveJobLedger';

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
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('opus_workers');
      return stored ? JSON.parse(stored) : INITIAL_ROSTER;
    }
    return INITIAL_ROSTER;
  });
  
  const [shifts, setShifts] = useState<ScheduledShift[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('opus_shifts');
      return stored ? JSON.parse(stored) : INITIAL_SHIFTS;
    }
    return INITIAL_SHIFTS;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('opus_workers', JSON.stringify(workers));
    }
  }, [workers]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('opus_shifts', JSON.stringify(shifts));
    }
  }, [shifts]);

  const [jobs, setJobs] = useState<Job[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('opus_jobs');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse jobs', e);
        }
      }
    }
    return INITIAL_JOBS;
  });

  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const scrollPositionRef = React.useRef<number>(0);

  // Keep jobs synchronized to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('opus_jobs', JSON.stringify(jobs));
    }
  }, [jobs]);

  // Scroll to top when view or selected item changes, with scroll retention for ledger -> job details and back
  useEffect(() => {
    if (currentView === 'ledger' && scrollPositionRef.current > 0) {
      const savedPosition = scrollPositionRef.current;
      scrollPositionRef.current = 0;
      setTimeout(() => {
        window.scrollTo({ top: savedPosition, behavior: 'instant' });
      }, 50);
    } else if (currentView !== 'job-details') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentView, selectedJobId, selectedQuoteId]);

  // Proactive automatic upgrade for legacy/small mock data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('opus_shifts');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length < 10) {
            localStorage.setItem('opus_shifts', JSON.stringify(INITIAL_SHIFTS));
            setShifts(INITIAL_SHIFTS);
            localStorage.setItem('opus_jobs', JSON.stringify(INITIAL_JOBS));
            setJobs(INITIAL_JOBS);
          }
        } catch (e) {
          console.error('Failed to parse stored shifts for upgrade check', e);
        }
      }
    }
  }, []);

  const handleReloadDemoData = () => {
    if (window.confirm("Are you sure you want to restore the default active jobs, full crew list, and rich deployment histories? This will replace your current browser session state.")) {
      localStorage.removeItem('opus_workers');
      localStorage.removeItem('opus_shifts');
      localStorage.removeItem('opus_jobs');
      setWorkers(INITIAL_ROSTER);
      setShifts(INITIAL_SHIFTS);
      setJobs(INITIAL_JOBS);
      alert("Demo dataset successfully loaded! Explore the staff profiles to view active deployments and the new 'Deployment History' records.");
    }
  };

  const expiringTickets = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const list: {
      workerId: string;
      workerName: string;
      workerRole: string;
      ticketId: string;
      ticketType: string;
      expiryDate: string;
      ticketNumber: string;
      diffDays: number;
      isExpired: boolean;
      isExpiringSoon: boolean;
    }[] = [];
    
    workers.forEach(worker => {
      worker.tickets?.forEach(ticket => {
        const expiry = new Date(ticket.expiryDate);
        expiry.setHours(0, 0, 0, 0);
        
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const isExpired = diffDays < 0;
        const isExpiringSoon = diffDays >= 0 && diffDays <= 30;
        
        if (isExpired || isExpiringSoon) {
          list.push({
            workerId: worker.id,
            workerName: worker.name,
            workerRole: worker.role,
            ticketId: ticket.id,
            ticketType: ticket.type,
            expiryDate: ticket.expiryDate,
            ticketNumber: ticket.ticketNumber,
            diffDays,
            isExpired,
            isExpiringSoon
          });
        }
      });
    });
    
    return list.sort((a, b) => a.diffDays - b.diffDays);
  }, [workers]);

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
              onClick={handleReloadDemoData}
              className="hidden lg:flex items-center space-x-2 px-4 py-2 border border-[#333] hover:border-brand-accent/50 rounded bg-[#222]/40 hover:bg-[#252525] transition-all group active:scale-95"
              title="Reset application to complete initial demo dataset with active and historical shifts"
            >
              <Database className="w-4 h-4 text-brand-accent/80 group-hover:text-brand-accent" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/70 group-hover:text-white">Seed Demo Data</span>
            </button>
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
                </div>
              </div>

              <div className="mt-auto space-y-2 w-full">
                <button 
                  onClick={() => { setIsMobileMenuOpen(false); handleReloadDemoData(); }}
                  className="flex items-center justify-center space-x-3 w-full py-4 border border-[#333] hover:border-brand-accent/30 rounded text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all text-brand-accent"
                >
                  <Database className="w-4 h-4" />
                  <span>Seed Demo Data</span>
                </button>
                <button 
                  onClick={onLogout}
                  className="flex items-center justify-center space-x-3 w-full py-4 border border-white/10 rounded text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Terminate Session</span>
                </button>
              </div>
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
            selectedWorkerId={selectedWorkerId}
            onSelectWorker={setSelectedWorkerId}
          />
        </main>
      ) : (
        <>
          <main className="pt-20 pb-8 px-4 sm:px-6 max-w-6xl mx-auto space-y-8">
            {/* Top Row: 30-Day Expiry Radar Widget */}
            <ExpiryRadar 
              expiringTickets={expiringTickets} 
              onSelectWorker={(workerId) => {
                scrollPositionRef.current = window.scrollY;
                setSelectedWorkerId(workerId);
                setCurrentView('staff');
              }}
            />

            {/* Bottom Row: Active Job Ledger */}
            <ActiveJobLedger 
              filteredJobs={filteredJobs}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              onSelectJob={(id) => {
                scrollPositionRef.current = window.scrollY;
                setSelectedJobId(id);
                setCurrentView('job-details');
              }}
              getJobActionRequired={getJobActionRequired}
            />
          </main>

          {/* Job Details Drawer Overlay */}
          <AnimatePresence>
            {currentView === 'job-details' && selectedJobId && jobs.find(j => j.id === selectedJobId) && (
              <JobDetails 
                job={jobs.find(j => j.id === selectedJobId)!}
                workers={workers}
                onBack={() => setCurrentView('ledger')}
                onUpdateJob={handleUpdateJob}
              />
            )}
          </AnimatePresence>
        </>
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
