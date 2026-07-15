// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList,
  Target,
  UserCheck,
  TrendingUp,
  Search,
  AlertTriangle,
  Clock,
  Plus,
  ArrowRight,
  Send,
  UserPlus,
  Calculator,
  History,
  CheckCircle,
  FileText,
  X,
  MapPin,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { supabase } from '@/integrations/supabase/client';

export const DashboardPage: React.FC = () => {
  const { workers, setWorkers, jobs, setJobs, shifts, role, user } = usePortal();
  const navigate = useNavigate();

  // Search & Command Bar State
  const [commandInput, setCommandInput] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [snoozedAlertIds, setSnoozedAlertIds] = useState(new Set());
  const [notifications, setNotifications] = useState([]);

  // Modals state
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);

  // New Job Form State
  const [jobForm, setJobForm] = useState({
    siteName: '',
    mainContractor: '',
    postcode: '',
    contractMaxPours: 6,
    scheduleValue: 25000,
  });

  // New Worker Form State
  const [workerForm, setWorkerForm] = useState({
    name: '',
    role: 'Operative',
    phone: '',
    email: '',
    postcode: '',
    ticketType: 'CSCS',
    ticketNo: '',
    ticketExpiry: '',
  });

  // Toast trigger
  const triggerNotification = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  // Load quotes on mount to support global search
  useEffect(() => {
    const loadQuotes = async () => {
      try {
        const { data } = await supabase.from('quotes').select('*');
        if (data) {
          setQuotes(data.map(q => ({
            id: q.id,
            reference: q.reference || 'EST-DRAFT',
            clientName: q.client_info?.entity || 'Unknown Client',
            netTotal: q.totals?.netTotal || 0,
            date: q.date
          })));
        }
      } catch (e) {
        console.error('Failed to load quotes for dashboard search', e);
      }
    };
    loadQuotes();
  }, []);

  // Compute metrics
  const activeJobs = useMemo(() => jobs.filter(j => j.status === 'in-progress' || j.status === 'active'), [jobs]);
  const activePoursCount = useMemo(() => activeJobs.reduce((sum, j) => sum + (j.currentPours || 0), 0), [activeJobs]);
  const contractMaxPoursCount = useMemo(() => activeJobs.reduce((sum, j) => sum + (j.contractMaxPours || 0), 0), [activeJobs]);

  const scheduledWorkersCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysShifts = shifts.filter(s => s.date === todayStr && !s.isRemoved);
    // Count unique workers active today
    return new Set(todaysShifts.map(s => s.workerId)).size;
  }, [shifts]);

  const pipelineValue = useMemo(() => {
    return activeJobs.reduce((sum, j) => sum + (Number(j.scheduleValue) || 0), 0);
  }, [activeJobs]);

  // Compute expiring tickets
  const expiringTickets = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const list = [];
    
    workers.forEach(worker => {
      worker.tickets?.forEach(ticket => {
        const expiry = new Date(ticket.expiryDate);
        expiry.setHours(0, 0, 0, 0);
        
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const isExpired = diffDays < 0;
        const isExpiringSoon = diffDays >= 0 && diffDays <= 30;
        
        const alertId = `${worker.id}-${ticket.id}`;
        
        if ((isExpired || isExpiringSoon) && !snoozedAlertIds.has(alertId)) {
          list.push({
            alertId,
            workerId: worker.id,
            workerName: worker.name,
            workerRole: worker.role,
            workerPhone: worker.phone,
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
  }, [workers, snoozedAlertIds]);

  // Filter Search Assets
  const searchResults = useMemo(() => {
    if (!commandInput.trim()) return null;
    const query = commandInput.toLowerCase();
    
    const matchedJobs = jobs.filter(j => 
      (j.siteName || '').toLowerCase().includes(query) || 
      (j.jobRef || '').toLowerCase().includes(query) ||
      (j.mainContractor && j.mainContractor.toLowerCase().includes(query))
    ).slice(0, 4);

    const matchedWorkers = workers.filter(w => 
      (w.name || '').toLowerCase().includes(query) || 
      (w.role || '').toLowerCase().includes(query)
    ).slice(0, 4);

    const matchedQuotes = quotes.filter(q => 
      (q.reference || '').toLowerCase().includes(query) || 
      (q.clientName || '').toLowerCase().includes(query)
    ).slice(0, 4);

    return {
      jobs: matchedJobs,
      workers: matchedWorkers,
      quotes: matchedQuotes,
      hasAny: matchedJobs.length > 0 || matchedWorkers.length > 0 || matchedQuotes.length > 0
    };
  }, [commandInput, jobs, workers, quotes]);

  // Command input handlers
  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults && searchResults.hasAny) {
      // Navigate to the first matching item if present
      if (searchResults.jobs.length > 0) {
        navigate(`/portal/ledger?jobId=${searchResults.jobs[0].id}`);
      } else if (searchResults.workers.length > 0) {
        navigate(`/portal/roster?view=staff&workerId=${searchResults.workers[0].id}`);
      }
      setCommandInput('');
    }
  };

  // Inline Alert Actions
  const handleRemindAlert = (alert) => {
    triggerNotification(`SMS & Email compliance warning dispatched to ${alert.workerName} (${alert.workerPhone || 'no phone'})`, 'success');
  };

  const handleSnoozeAlert = (alertId) => {
    setSnoozedAlertIds(prev => {
      const next = new Set(prev);
      next.add(alertId);
      return next;
    });
    triggerNotification('Alert snoozed for 24 hours', 'info');
  };

  const handleUpdateAlert = (workerId) => {
    navigate(`/portal/roster?view=staff&workerId=${workerId}`);
  };

  // Add new job submission
  const handleAddJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobForm.siteName.trim() || !jobForm.mainContractor.trim()) {
      triggerNotification('Site name and Contractor are required', 'warning');
      return;
    }

    const jobRefVal = `OP-${Math.floor(1000 + Math.random() * 9000)}-${jobForm.siteName.substring(0, 2).toUpperCase()}`;
    const newJob = {
      id: `job-${Math.random().toString(36).substring(2, 9)}`,
      jobRef: jobRefVal,
      siteName: jobForm.siteName,
      mainContractor: jobForm.mainContractor,
      postcode: jobForm.postcode || 'SW1A 1AA',
      currentPours: 0,
      contractMaxPours: Number(jobForm.contractMaxPours),
      status: 'pending',
      scheduleValue: Number(jobForm.scheduleValue),
      assignedWorkers: []
    };

    setJobs(prev => [...prev, newJob]);
    setIsJobModalOpen(false);
    setJobForm({ siteName: '', mainContractor: '', postcode: '', contractMaxPours: 6, scheduleValue: 25000 });
    triggerNotification(`New project ${jobRefVal} created!`, 'success');
  };

  // Add new worker submission
  const handleAddWorkerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerForm.name.trim()) {
      triggerNotification('Worker name is required', 'warning');
      return;
    }

    const newWorkerId = `worker-${Math.random().toString(36).substring(2, 9)}`;
    const newTickets = [];
    if (workerForm.ticketType && workerForm.ticketNo && workerForm.ticketExpiry) {
      newTickets.push({
        id: `ticket-${Math.random().toString(36).substring(2, 9)}`,
        type: workerForm.ticketType,
        ticketNumber: workerForm.ticketNo,
        expiryDate: workerForm.ticketExpiry,
      });
    }

    const newWorker = {
      id: newWorkerId,
      name: workerForm.name,
      role: workerForm.role,
      phone: workerForm.phone || '+44 7700 900100',
      email: workerForm.email || `${workerForm.name.toLowerCase().replace(/\s+/g, '.')}@opusconcrete.co.uk`,
      postcode: workerForm.postcode || 'SW1A 1AA',
      tickets: newTickets,
      uploadedCertificates: [],
      isArchived: false
    };

    setWorkers(prev => [...prev, newWorker]);
    setIsWorkerModalOpen(false);
    setWorkerForm({ name: '', role: 'Operative', phone: '', email: '', postcode: '', ticketType: 'CSCS', ticketNo: '', ticketExpiry: '' });
    triggerNotification(`Worker ${workerForm.name} added to roster!`, 'success');
  };

  return (
    <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl mx-auto space-y-8 animate-fade-in font-sans">
      
      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-4 rounded-lg shadow-lg border text-sm font-semibold flex items-center justify-between pointer-events-auto bg-[#1a1a1e] ${
                n.type === 'warning' ? 'border-[#f59e0b] text-[#f59e0b]' :
                n.type === 'info' ? 'border-[#6C8295] text-[#E4E4E7]' :
                'border-[#10b981] text-[#10b981]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                {n.type === 'warning' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                <span>{n.message}</span>
              </div>
              <button 
                onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
                className="ml-4 text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-archivo uppercase">
            Concrete Operations Center
          </h1>
          <p className="text-sm text-[#9a9a9e] mt-1 font-medium">
            Overview for <span className="text-[#6C8295] font-semibold">{user?.email}</span> — role: <span className="text-[#10b981] font-semibold capitalize">{role}</span>
          </p>
        </div>
        <div className="flex items-center space-x-3 text-[#9a9a9e] text-[13px] bg-[#1a1a1e] border border-[#2a2a30] py-2 px-3 rounded-lg self-start">
          <Clock className="w-4 h-4 text-[#6C8295]" />
          <span className="font-semibold">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
        </div>
      </div>

      {/* Premium Interactive Command Search Bar */}
      <div className="relative">
        <form onSubmit={handleCommandSubmit} className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className={`w-5 h-5 transition-colors duration-200 ${isSearchFocused ? 'text-[#6C8295]' : 'text-[#9a9a9e]'}`} />
          </div>
          <input
            type="text"
            className="w-full bg-[#1a1a1e] border border-[#2a2a30] focus:border-[#6C8295] focus:ring-1 focus:ring-[#6C8295]/40 rounded-xl pl-12 pr-28 py-3.5 text-sm text-white placeholder-[#9a9a9e]/60 outline-none transition-all duration-200 min-h-[48px]"
            placeholder="Search site, staff name, role, or estimate ref..."
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          />
          <div className="absolute inset-y-0 right-3 flex items-center space-x-2">
            <kbd className="hidden sm:inline-flex items-center bg-[#2a2a30] border border-[#3a3a42] text-[11px] px-2 py-0.5 rounded font-mono text-[#9a9a9e] font-semibold">
              ESC
            </kbd>
            {commandInput && (
              <button
                type="button"
                onClick={() => setCommandInput('')}
                className="p-1 hover:bg-[#2a2a30] rounded text-[#9a9a9e] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        {/* Dropdown Floating Panel for matches */}
        <AnimatePresence>
          {isSearchFocused && commandInput.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute left-0 right-0 mt-2 bg-[#1a1a1e] border border-[#2a2a30] rounded-xl shadow-2xl z-50 overflow-hidden"
            >

              {/* Data search matches */}
              {searchResults && (
                <div className="max-h-80 overflow-y-auto divide-y divide-[#2a2a30] p-2 space-y-3">
                  {/* Job Matches */}
                  {searchResults.jobs.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-[#6C8295] uppercase tracking-wider px-3 py-1 block">Matching Jobs</span>
                      <div className="space-y-0.5">
                        {searchResults.jobs.map(job => (
                          <div
                            key={job.id}
                            onMouseDown={() => navigate(`/portal/ledger?jobId=${job.id}`)}
                            className="px-3 py-2 hover:bg-[#2a2a30] rounded-lg cursor-pointer flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-2.5">
                              <Briefcase className="w-4 h-4 text-[#6C8295]" />
                              <span className="text-[13px] font-semibold text-white">{job.siteName}</span>
                              <span className="text-[11px] font-mono text-[#9a9a9e] bg-[#2a2a30] px-1.5 py-0.5 rounded">{job.jobRef}</span>
                            </div>
                            <span className="text-[11px] text-[#9a9a9e] uppercase font-bold">{job.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Worker Matches */}
                  {searchResults.workers.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-[#6C8295] uppercase tracking-wider px-3 py-1 block">Matching Staff</span>
                      <div className="space-y-0.5">
                        {searchResults.workers.map(worker => (
                          <div
                            key={worker.id}
                            onMouseDown={() => navigate(`/portal/roster?view=staff&workerId=${worker.id}`)}
                            className="px-3 py-2 hover:bg-[#2a2a30] rounded-lg cursor-pointer flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-2.5">
                              <UserCheck className="w-4 h-4 text-[#6C8295]" />
                              <span className="text-[13px] font-semibold text-white">{worker.name}</span>
                              <span className="text-[11px] text-[#9a9a9e] bg-[#2a2a30] px-1.5 py-0.5 rounded">{worker.role}</span>
                            </div>
                            <span className="text-[11px] text-[#10b981] font-semibold">Ready</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quote Matches */}
                  {searchResults.quotes.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-[#6C8295] uppercase tracking-wider px-3 py-1 block">Matching Estimates</span>
                      <div className="space-y-0.5">
                        {searchResults.quotes.map(quote => (
                          <div
                            key={quote.id}
                            onMouseDown={() => navigate(`/portal/pipeline?view=pipeline-registry`)}
                            className="px-3 py-2 hover:bg-[#2a2a30] rounded-lg cursor-pointer flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-2.5">
                              <FileText className="w-4 h-4 text-[#6C8295]" />
                              <span className="text-[13px] font-semibold text-white">{quote.clientName}</span>
                              <span className="text-[11px] font-mono text-[#9a9a9e] bg-[#2a2a30] px-1.5 py-0.5 rounded">{quote.reference}</span>
                            </div>
                            <span className="text-[12px] font-mono text-white font-semibold">£{quote.netTotal.toLocaleString('en-GB')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!searchResults.hasAny && (
                    <div className="p-4 text-center text-[13px] text-[#9a9a9e]">
                      No matched jobs, staff, or quotes found for "{commandInput}"
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3 Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Metric 1 */}
        <div className="bg-[#1a1a1e] border border-[#2a2a30] hover:border-[#6C8295]/40 rounded-xl p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-16 w-16 bg-[#6C8295]/5 rounded-bl-full flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-[#6C8295] group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#9a9a9e] uppercase tracking-wider">Active Job Sites</span>
            <div className="text-3xl font-bold text-white mt-1 font-mono tracking-tight">
              {activeJobs.length}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#2a2a30] flex items-center justify-between text-[12px] text-[#9a9a9e]">
            <span className="font-medium">Active pours progress</span>
            <span className="font-mono text-white font-bold">{activePoursCount} / {contractMaxPoursCount} Pours</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#1a1a1e] border border-[#2a2a30] hover:border-[#6C8295]/40 rounded-xl p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-16 w-16 bg-[#10b981]/5 rounded-bl-full flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-[#10b981] group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#9a9a9e] uppercase tracking-wider">Scheduled Crew Today</span>
            <div className="text-3xl font-bold text-white mt-1 font-mono tracking-tight">
              {scheduledWorkersCount}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#2a2a30] flex items-center justify-between text-[12px] text-[#9a9a9e]">
            <span className="font-medium">Total available staff</span>
            <span className="font-mono text-white font-bold">{workers.length} Personnel</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#1a1a1e] border border-[#2a2a30] hover:border-[#6C8295]/40 rounded-xl p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-16 w-16 bg-[#6C8295]/5 rounded-bl-full flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[#6C8295] group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#9a9a9e] uppercase tracking-wider">Active Pipeline Value</span>
            <div className="text-3xl font-bold text-[#6C8295] mt-1 font-mono tracking-tight">
              £{pipelineValue.toLocaleString('en-GB')}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#2a2a30] flex items-center justify-between text-[12px] text-[#9a9a9e]">
            <span className="font-medium">Total contracts ledger</span>
            <span className="font-mono text-white font-bold">Excludes VAT</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Compliance Alerts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Compliance Alerts (2/3 width) */}
        <div className="lg:col-span-2 bg-[#1a1a1e] border border-[#2a2a30] rounded-xl p-6 flex flex-col space-y-6">
          <div className="flex items-center justify-between border-b border-[#2a2a30] pb-4">
            <div className="flex items-center space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />
              <h2 className="text-base font-bold text-white font-archivo uppercase tracking-wide">
                Compliance Warnings
              </h2>
            </div>
            <span className="text-[12px] bg-[#ef4444]/10 text-[#ef4444] px-2.5 py-1 rounded-md font-bold font-mono">
              {expiringTickets.length} Action Required
            </span>
          </div>

          <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[360px] pr-1">
            {expiringTickets.map((alert) => (
              <div 
                key={alert.alertId}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all duration-200 hover:bg-[#16161a] ${
                  alert.isExpired ? 'bg-[#ef4444]/5 border-[#ef4444]/20' : 'bg-[#f59e0b]/5 border-[#f59e0b]/20'
                }`}
              >
                {/* Alert Info */}
                <div className="flex items-start space-x-3.5">
                  <div className={`mt-0.5 p-2 rounded-lg ${alert.isExpired ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'}`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-[13px] font-bold text-white leading-none">{alert.workerName}</h4>
                      <span className="text-[11px] text-[#9a9a9e] bg-[#2a2a30] px-1.5 py-0.5 rounded font-medium">{alert.workerRole}</span>
                    </div>
                    <p className="text-[12px] text-[#E4E4E7] font-medium mt-1">
                      {alert.ticketType} Card expiry: <span className="font-mono text-white font-bold">{alert.expiryDate}</span>
                    </p>
                    <p className="text-[11px] text-[#9a9a9e] mt-0.5">
                      No: <span className="font-mono">{alert.ticketNumber}</span> &bull; {
                        alert.isExpired 
                          ? <span className="text-[#ef4444] font-bold">EXPIRED {Math.abs(alert.diffDays)} days ago</span>
                          : <span className="text-[#f59e0b] font-bold">Expires in {alert.diffDays} days</span>
                      }
                    </p>
                  </div>
                </div>

                {/* Alert Actions */}
                <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => handleRemindAlert(alert)}
                    className="h-9 px-3.5 rounded bg-[#2a2a30] hover:bg-[#3a3a42] text-[12px] font-semibold text-white transition-colors cursor-pointer min-h-[36px]"
                  >
                    Remind
                  </button>
                  <button
                    onClick={() => handleSnoozeAlert(alert.alertId)}
                    className="h-9 px-3.5 rounded bg-[#2a2a30] hover:bg-[#3a3a42] text-[12px] font-semibold text-[#9a9a9e] hover:text-white transition-colors cursor-pointer min-h-[36px]"
                  >
                    Snooze
                  </button>
                  <button
                    onClick={() => handleUpdateAlert(alert.workerId)}
                    className="h-9 px-3.5 rounded bg-[#6C8295] hover:bg-[#6C8295]/80 text-[12px] font-semibold text-white transition-colors cursor-pointer min-h-[36px]"
                  >
                    Update
                  </button>
                </div>
              </div>
            ))}

            {expiringTickets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <CheckCircle className="w-12 h-12 text-[#10b981]/80" />
                <div>
                  <h4 className="text-[13px] font-bold text-white">Roster Fully Compliant</h4>
                  <p className="text-[12px] text-[#9a9a9e] mt-1">All active operatives have up-to-date qualifications.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Actions Panel (1/3 width) */}
        <div className="bg-[#1a1a1e] border border-[#2a2a30] rounded-xl p-6 flex flex-col space-y-6">
          <div className="border-b border-[#2a2a30] pb-4">
            <h2 className="text-base font-bold text-white font-archivo uppercase tracking-wide">
              Quick Operations
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {/* Create Job */}
            <button
              onClick={() => setIsJobModalOpen(true)}
              className="w-full text-left p-4 rounded-xl bg-[#16161a] border border-[#2a2a30] hover:border-[#6C8295]/40 hover:bg-[#202026] transition-all group flex items-center justify-between cursor-pointer min-h-[44px]"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 rounded-lg bg-[#6C8295]/10 text-[#6C8295] group-hover:bg-[#6C8295] group-hover:text-white transition-all">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-white">Create New Job</h3>
                  <p className="text-[11px] text-[#9a9a9e] mt-0.5">Initialize a site reference and set pour limits</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>

            {/* Add Staff */}
            <button
              onClick={() => setIsWorkerModalOpen(true)}
              className="w-full text-left p-4 rounded-xl bg-[#16161a] border border-[#2a2a30] hover:border-[#10b981]/40 hover:bg-[#202026] transition-all group flex items-center justify-between cursor-pointer min-h-[44px]"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 rounded-lg bg-[#10b981]/10 text-[#10b981] group-hover:bg-[#10b981] group-hover:text-white transition-all">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-white">Add New Staff</h3>
                  <p className="text-[11px] text-[#9a9a9e] mt-0.5">Register a worker and upload safety certifications</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>

            {/* Create Quote */}
            <button
              onClick={() => navigate('/portal/pipeline?view=quote-builder')}
              className="w-full text-left p-4 rounded-xl bg-[#16161a] border border-[#2a2a30] hover:border-[#6C8295]/40 hover:bg-[#202026] transition-all group flex items-center justify-between cursor-pointer min-h-[44px]"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 rounded-lg bg-[#6C8295]/10 text-[#6C8295] group-hover:bg-[#6C8295] group-hover:text-white transition-all">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-white">Create Quote</h3>
                  <p className="text-[11px] text-[#9a9a9e] mt-0.5">Build a client invoice with custom VAT/CIS settings</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>

            {/* View Audit Trail */}
            <button
              onClick={() => navigate('/portal/audit')}
              className="w-full text-left p-4 rounded-xl bg-[#16161a] border border-[#2a2a30] hover:border-[#f59e0b]/40 hover:bg-[#202026] transition-all group flex items-center justify-between cursor-pointer min-h-[44px]"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 rounded-lg bg-[#f59e0b]/10 text-[#f59e0b] group-hover:bg-[#f59e0b] group-hover:text-white transition-all">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-white">View Audit Trail</h3>
                  <p className="text-[11px] text-[#9a9a9e] mt-0.5">Inspect system change history and operator events</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>

      </div>

      {/* JOB CREATION MODAL */}
      <AnimatePresence>
        {isJobModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsJobModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#1a1a1e] border border-[#2a2a30] rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-[#2a2a30] flex items-center justify-between">
                <h3 className="text-base font-bold text-white font-archivo uppercase">Create New Project Job</h3>
                <button onClick={() => setIsJobModalOpen(false)} className="text-[#9a9a9e] hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddJobSubmit} className="p-6 space-y-4 text-[13px]">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9a9a9e] mb-1.5">Site Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Riverside Phase 3"
                    className="w-full bg-[#16161a] border border-[#2a2a30] focus:border-[#6C8295] focus:ring-1 focus:ring-[#6C8295] rounded-lg px-3.5 py-2.5 text-white outline-none min-h-[44px]"
                    value={jobForm.siteName}
                    onChange={e => setJobForm({...jobForm, siteName: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9a9a9e] mb-1.5">Main Contractor *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Balfour Beatty"
                      className="w-full bg-[#16161a] border border-[#2a2a30] focus:border-[#6C8295] focus:ring-1 focus:ring-[#6C8295] rounded-lg px-3.5 py-2.5 text-white outline-none min-h-[44px]"
                      value={jobForm.mainContractor}
                      onChange={e => setJobForm({...jobForm, mainContractor: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9a9a9e] mb-1.5">Postcode</label>
                    <input
                      type="text"
                      placeholder="e.g. SW1A 1AA"
                      className="w-full bg-[#16161a] border border-[#2a2a30] focus:border-[#6C8295] focus:ring-1 focus:ring-[#6C8295] rounded-lg px-3.5 py-2.5 text-white outline-none min-h-[44px]"
                      value={jobForm.postcode}
                      onChange={e => setJobForm({...jobForm, postcode: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9a9a9e] mb-1.5">Contract Max Pours</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="w-full bg-[#16161a] border border-[#2a2a30] focus:border-[#6C8295] focus:ring-1 focus:ring-[#6C8295] rounded-lg px-3.5 py-2.5 text-white outline-none font-mono min-h-[44px]"
                      value={jobForm.contractMaxPours}
                      onChange={e => setJobForm({...jobForm, contractMaxPours: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9a9a9e] mb-1.5">Schedule Value (£)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="w-full bg-[#16161a] border border-[#2a2a30] focus:border-[#6C8295] focus:ring-1 focus:ring-[#6C8295] rounded-lg px-3.5 py-2.5 text-white outline-none font-mono min-h-[44px]"
                      value={jobForm.scheduleValue}
                      onChange={e => setJobForm({...jobForm, scheduleValue: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end space-x-3 border-t border-[#2a2a30] mt-6">
                  <button
                    type="button"
                    onClick={() => setIsJobModalOpen(false)}
                    className="h-11 px-5 rounded-lg bg-[#2a2a30] hover:bg-[#3a3a42] text-white transition-colors cursor-pointer min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-11 px-5 rounded-lg bg-[#6C8295] hover:bg-[#6C8295]/80 text-white font-semibold transition-colors cursor-pointer min-h-[44px]"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* STAFF CREATION MODAL */}
      <AnimatePresence>
        {isWorkerModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWorkerModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#1a1a1e] border border-[#2a2a30] rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-[#2a2a30] flex items-center justify-between">
                <h3 className="text-base font-bold text-white font-archivo uppercase">Register New Operative</h3>
                <button onClick={() => setIsWorkerModalOpen(false)} className="text-[#9a9a9e] hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddWorkerSubmit} className="p-6 space-y-4 text-[13px] max-h-[500px] overflow-y-auto">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9a9a9e] mb-1.5">Worker Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Connor O'Neill"
                    className="w-full bg-[#16161a] border border-[#2a2a30] focus:border-[#6C8295] focus:ring-1 focus:ring-[#6C8295] rounded-lg px-3.5 py-2.5 text-white outline-none min-h-[44px]"
                    value={workerForm.name}
                    onChange={e => setWorkerForm({...workerForm, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9a9a9e] mb-1.5">Operational Role</label>
                    <select
                      className="w-full bg-[#16161a] border border-[#2a2a30] focus:border-[#6C8295] focus:ring-1 focus:ring-[#6C8295] rounded-lg px-3.5 py-2.5 text-white outline-none min-h-[44px] cursor-pointer"
                      value={workerForm.role}
                      onChange={e => setWorkerForm({...workerForm, role: e.target.value})}
                    >
                      <option value="Operative">Operative</option>
                      <option value="Supervisor">Supervisor</option>
                      <option value="Telehandler">Telehandler</option>
                      <option value="Groundworker">Groundworker</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9a9a9e] mb-1.5">Postcode</label>
                    <input
                      type="text"
                      placeholder="e.g. SW1A 1AA"
                      className="w-full bg-[#16161a] border border-[#2a2a30] focus:border-[#6C8295] focus:ring-1 focus:ring-[#6C8295] rounded-lg px-3.5 py-2.5 text-white outline-none min-h-[44px]"
                      value={workerForm.postcode}
                      onChange={e => setWorkerForm({...workerForm, postcode: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9a9a9e] mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. +44 7700 900100"
                      className="w-full bg-[#16161a] border border-[#2a2a30] focus:border-[#6C8295] focus:ring-1 focus:ring-[#6C8295] rounded-lg px-3.5 py-2.5 text-white outline-none min-h-[44px]"
                      value={workerForm.phone}
                      onChange={e => setWorkerForm({...workerForm, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9a9a9e] mb-1.5">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. connor@opusconcrete.co.uk"
                      className="w-full bg-[#16161a] border border-[#2a2a30] focus:border-[#6C8295] focus:ring-1 focus:ring-[#6C8295] rounded-lg px-3.5 py-2.5 text-white outline-none min-h-[44px]"
                      value={workerForm.email}
                      onChange={e => setWorkerForm({...workerForm, email: e.target.value})}
                    />
                  </div>
                </div>

                {/* Inline Ticket fields */}
                <div className="border-t border-[#2a2a30] pt-4 mt-2 space-y-3.5">
                  <span className="text-[11px] font-bold text-[#6C8295] uppercase tracking-wider block">Compliance Qualification Ticket</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9a9a9e] mb-1.5">Ticket Type</label>
                      <select
                        className="w-full bg-[#16161a] border border-[#2a2a30] focus:border-[#6C8295] focus:ring-1 focus:ring-[#6C8295] rounded-lg px-3.5 py-2.5 text-white outline-none min-h-[44px] cursor-pointer"
                        value={workerForm.ticketType}
                        onChange={e => setWorkerForm({...workerForm, ticketType: e.target.value})}
                      >
                        <option value="CSCS">CSCS</option>
                        <option value="NPORS">NPORS</option>
                        <option value="CPCS">CPCS</option>
                        <option value="Telehandler">Telehandler</option>
                        <option value="Supervisor">Supervisor</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9a9a9e] mb-1.5">Ticket Number</label>
                      <input
                        type="text"
                        placeholder="e.g. CSCS-449200"
                        className="w-full bg-[#16161a] border border-[#2a2a30] focus:border-[#6C8295] focus:ring-1 focus:ring-[#6C8295] rounded-lg px-3.5 py-2.5 text-white outline-none font-mono min-h-[44px]"
                        value={workerForm.ticketNo}
                        onChange={e => setWorkerForm({...workerForm, ticketNo: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9a9a9e] mb-1.5">Expiry Date</label>
                    <input
                      type="date"
                      className="w-full bg-[#16161a] border border-[#2a2a30] focus:border-[#6C8295] focus:ring-1 focus:ring-[#6C8295] rounded-lg px-3.5 py-2.5 text-white outline-none font-mono min-h-[44px]"
                      value={workerForm.ticketExpiry}
                      onChange={e => setWorkerForm({...workerForm, ticketExpiry: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end space-x-3 border-t border-[#2a2a30] mt-6">
                  <button
                    type="button"
                    onClick={() => setIsWorkerModalOpen(false)}
                    className="h-11 px-5 rounded-lg bg-[#2a2a30] hover:bg-[#3a3a42] text-white transition-colors cursor-pointer min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-11 px-5 rounded-lg bg-[#10b981] hover:bg-[#10b981]/80 text-white font-semibold transition-colors cursor-pointer min-h-[44px]"
                  >
                    Register Worker
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
