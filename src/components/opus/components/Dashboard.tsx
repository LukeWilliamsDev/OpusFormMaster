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
  CloudSun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Job } from '../types/erp';
import { QuoteInvoiceBuilder } from './QuoteInvoiceBuilder';
import { PipelineRegistry } from './PipelineRegistry';
import { JobDetails } from './JobDetails';
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
  const [currentView, setCurrentView] = useState<'ledger' | 'quote-builder' | 'pipeline-registry' | 'job-details'>('ledger');
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<Job['status'] | 'all'>('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
            <div className="hidden md:flex items-center space-x-6">
              <button 
                onClick={() => setCurrentView('ledger')}
                className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${currentView === 'ledger' ? 'text-brand-accent' : 'text-brand-white/70 hover:text-brand-white'}`}
              >
                Dashboard
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
              className="hidden md:flex items-center space-x-2 px-4 py-2 border border-white/10 rounded hover:bg-white/5 transition-all group active:scale-95"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-brand-white">Terminate Session</span>
              <LogOut className="w-4 h-4 text-white/40 group-hover:text-brand-white" />
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-brand-white hover:bg-white/5 rounded transition-colors"
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-3/4 max-w-sm bg-[#1A1B1E] border-l border-white/5 z-[70] md:hidden p-6 flex flex-col shadow-2xl"
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
      ) : currentView === 'job-details' && selectedJobId && jobs.find(j => j.id === selectedJobId) ? (
        <JobDetails 
          job={jobs.find(j => j.id === selectedJobId)!}
          onBack={() => setCurrentView('ledger')}
          onUpdateJob={handleUpdateJob}
        />
      ) : (
        <main className="pt-24 pb-12 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
        {/* Dynamic Alerts Group */}
        <div className="space-y-2.5">
          {/* Active Site Weather Warnings */}
          {(() => {
            // Find active/pending jobs with impactful weather
            const activeJobs = jobs.filter(j => j.status === 'in-progress' || j.status === 'pending');
            const warnedJobs = activeJobs.map(job => {
              const weatherInfo = getWeatherForJob(job);
              return { job, weather: weatherInfo };
            }).filter(item => item.weather.isImpactful);

            if (warnedJobs.length === 0) return null;

            return (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full bg-[#3a2024]/40 border border-[#522b30] rounded-lg overflow-hidden group transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center px-4 py-3 gap-3 md:gap-6">
                  <div className="flex items-center text-[10px] font-black text-[#ff8591] uppercase tracking-widest shrink-0">
                    <CloudSun className="w-4 h-4 mr-3 animate-pulse text-[#ff8591]" />
                    Weather Alerts ({warnedJobs.length})
                  </div>
                  
                  <div className="h-4 w-px bg-[#522b30]/50 shrink-0 hidden md:block"></div>
                  
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    {warnedJobs.map(({ job, weather }) => {
                      let WeatherIcon = CloudRain;
                      if (weather.condition === 'Frost') WeatherIcon = Snowflake;
                      if (weather.condition === 'Wind') WeatherIcon = Wind;
                      
                      return (
                        <button
                          key={job.id}
                          onClick={() => {
                            setSelectedJobId(job.id);
                            setCurrentView('job-details');
                          }}
                          title={weather.advice}
                          className="px-2.5 py-1 rounded bg-[#ff8591]/5 hover:bg-[#ff8591]/15 border border-[#ff8591]/10 hover:border-[#ff8591]/30 text-[8px] font-black text-[#ff8591] uppercase tracking-widest transition-colors flex items-center gap-1.5 focus:outline-none"
                        >
                          <WeatherIcon className="w-3 h-3 text-[#ff8591]" />
                          <span>{job.siteName}: {weather.condition} ({weather.temperature}°C)</span>
                        </button>
                      );
                    })}
                    <div className="text-[8px] font-bold text-white/30 uppercase tracking-widest md:ml-auto">
                      Click site to adjust pour plans
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {/* Alert & Follow-Up Strip */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-[#3a2e20]/40 border border-[#52412b] rounded-lg overflow-hidden group transition-all"
          >
            <div className="flex flex-col md:flex-row md:items-center px-4 py-3 gap-3 md:gap-6">
              <div className="flex items-center text-[10px] font-black text-[#f59e0b] uppercase tracking-widest shrink-0">
                <AlertCircle className="w-4 h-4 mr-3 animate-pulse text-[#f59e0b]" />
                Follow-Ups Pending (3)
              </div>
              
              <div className="h-4 w-px bg-[#52412b]/50 shrink-0 hidden md:block"></div>
              
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {[
                  { name: 'Riverside P2', keyword: 'Riverside', fallbackId: '1' },
                  { name: 'Marina Dev', keyword: 'Marina', fallbackId: '5' },
                  { name: 'Oakwood Hub', keyword: 'Oakwood', fallbackId: '2' }
                ].map((followup) => {
                  const targetJobId = jobs.find(j => j.siteName.toLowerCase().includes(followup.keyword.toLowerCase()))?.id || followup.fallbackId;
                  
                  return (
                    <button
                      key={followup.name}
                      onClick={() => {
                        setSelectedJobId(targetJobId);
                        setCurrentView('job-details');
                      }}
                      className="px-2.5 py-1 rounded bg-[#f59e0b]/5 hover:bg-[#f59e0b]/15 border border-[#f59e0b]/10 hover:border-[#f59e0b]/30 text-[8px] font-black text-[#f59e0b] uppercase tracking-widest transition-colors flex items-center gap-1.5 focus:outline-none"
                    >
                      <ArrowUpRight className="w-3 h-3 text-[#f59e0b]" />
                      <span>{followup.name}</span>
                    </button>
                  );
                })}
                <div className="text-[8px] font-bold text-white/30 uppercase tracking-widest md:ml-auto">
                  Click site to authorize follow-up action
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Contract & Job Ledger */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 text-[11px] font-extrabold tracking-widest uppercase text-[#e0e0e0]">
              <div className="w-[3px] h-4 bg-[#b0b8c4] rounded-[2px]" />
              Active Job Ledger
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-[#242424] border border-[#333] rounded-lg p-[3px] gap-[2px]">
                {(['all', 'in-progress', 'pending', 'completed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`rounded-md px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase whitespace-nowrap transition-colors duration-150 ${
                      filterStatus === status 
                        ? 'bg-[#333] text-[#e0e0e0]' 
                        : 'text-[#666] hover:text-[#aaa]'
                    }`}
                  >
                    {status.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#242424] border border-[#333] rounded-xl overflow-hidden">
            {/* Table Header - hidden on mobile, shown on tablet/desktop */}
            <div className="hidden md:grid md:grid-cols-[110px_1fr_140px_110px] lg:grid-cols-[110px_1fr_140px_110px_110px] px-4 py-2.5 border-b border-[#2e2e2e]">
              <span className="text-[9px] font-bold tracking-widest uppercase text-[#555]">Job Ref</span>
              <span className="text-[9px] font-bold tracking-widest uppercase text-[#555]">Site / Contractor</span>
              <span className="text-[9px] font-bold tracking-widest uppercase text-[#555]">Pour Status</span>
              <span className="text-[9px] font-bold tracking-widest uppercase text-[#555] hidden lg:block">Schedule Value</span>
              <span className="text-[9px] font-bold tracking-widest uppercase text-[#555] text-right">Action</span>
            </div>

            <div className="divide-y divide-[#2a2a2a]">
              <AnimatePresence mode="popLayout">
                {filteredJobs.length === 0 ? (
                  <div className="px-4 py-12 text-center text-[10px] font-bold uppercase tracking-widest text-[#555]">
                    No active jobs found
                  </div>
                ) : (
                  filteredJobs.map((job) => (
                    <motion.div 
                      key={job.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      layout
                      className="flex flex-col md:grid md:grid-cols-[110px_1fr_140px_110px] lg:grid-cols-[110px_1fr_140px_110px_110px] px-4 py-4 md:py-0 md:min-h-[64px] items-center hover:bg-[#292929] transition-colors duration-120 gap-3 md:gap-0"
                    >
                      {/* Job Ref */}
                      <div className="flex justify-between items-center w-full md:w-auto md:contents">
                        <button 
                          onClick={() => {
                            setSelectedJobId(job.id);
                            setCurrentView('job-details');
                          }}
                          className="text-[11px] font-bold text-[#b0b8c4] hover:text-white tracking-wide hover:underline transition-colors text-left focus:outline-none"
                        >
                          {job.jobRef}
                        </button>
                        {/* Mobile-only status badge */}
                        <div className="md:hidden">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[8px] font-extrabold tracking-wider uppercase border ${
                            job.status === 'in-progress' ? 'bg-[#1e2a3a] border-[#2a4060] text-[#6090c0]' :
                            job.status === 'pending' ? 'bg-[#2a2a1e] border-[#44440a] text-[#888844]' :
                            'bg-[#1a2e1a] border-[#2a5a2a] text-[#4a9a4a]'
                          }`}>
                            {job.status === 'in-progress' ? 'In Progress' : job.status}
                          </span>
                        </div>
                      </div>

                      {/* Site / Contractor */}
                      <div className="w-full md:w-auto">
                        <div className="text-[12px] font-extrabold text-[#e0e0e0] tracking-wide uppercase">
                          {job.siteName}
                        </div>
                        <div className="text-[10px] text-[#555] tracking-widest uppercase mt-0.5">
                          {job.mainContractor}
                        </div>
                      </div>

                      {/* Pour Status (Desktop/Tablet-only) */}
                      <div className="hidden md:block">
                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[9px] font-extrabold tracking-wider uppercase border ${
                          job.status === 'in-progress' ? 'bg-[#1e2a3a] border-[#2a4060] text-[#6090c0]' :
                          job.status === 'pending' ? 'bg-[#2a2a1e] border-[#44440a] text-[#888844]' :
                          'bg-[#1a2e1a] border-[#2a5a2a] text-[#4a9a4a]'
                        }`}>
                          {job.status === 'in-progress' ? 'In Progress' : job.status}
                        </span>
                      </div>

                      {/* Schedule Value (Desktop-only) */}
                      <div className="hidden lg:block">
                        <span className="text-[13px] font-bold text-[#e0e0e0]">
                          £{job.scheduleValue.toLocaleString()}
                        </span>
                      </div>

                      {/* Action (Manage) */}
                      <div className="flex justify-between items-center w-full md:w-auto md:justify-end">
                        {/* Mobile-only Schedule Value */}
                        <div className="lg:hidden text-[11px] font-bold text-[#e0e0e0]">
                          <span className="text-[9px] text-[#555] uppercase tracking-wider font-extrabold mr-1">Value: </span>
                          £{job.scheduleValue.toLocaleString()}
                        </div>
                        
                        <button 
                          onClick={() => {
                            setSelectedJobId(job.id);
                            setCurrentView('job-details');
                          }}
                          className="group flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase text-[#555] hover:text-[#b0b8c4] transition-colors duration-150 focus:outline-none"
                        >
                          <span>Manage</span>
                          <svg className="w-2.5 h-2.5 transform group-hover:translate-x-0.5 transition-transform text-[#555] group-hover:text-[#b0b8c4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </button>
                      </div>
                    </motion.div>
                  ))
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
