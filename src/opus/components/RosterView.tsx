// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, Trash2, ShieldAlert, X, Phone, Mail, FileText, UploadCloud, Download, FilePlus, UserCheck, AlertTriangle, UserPlus, Calendar, MapPin, ChevronLeft, Edit, Send, LayoutGrid, List, RefreshCw, CheckCircle2, Clock, Link2, Copy
} from 'lucide-react';
import { Worker, Ticket, Job } from '../types/erp';
import { getTicketStatus } from '../utils/workerValidation';
import { isValidUKPostcode } from '../utils/geo';
import { TicketStatusBadge } from './TicketStatusBadge';
import { RequestCredentialsModal } from './RequestCredentialsModal';
import { supabase } from '../../integrations/supabase/client';

interface RosterViewProps {
  workers: Worker[];
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  activeWorkerToAssign: Worker | null;
  setActiveWorkerToAssign: (w: Worker | null) => void;
  setShifts: React.Dispatch<React.SetStateAction<any[]>>;
  shifts?: any[];
  jobs?: Job[];
  selectedWorkerDetailsId?: string | null;
  setSelectedWorkerDetailsId?: (id: string | null) => void;
}

export const ON_SITE_CERTIFICATIONS = [
  "Abrasive Wheels Certification",
  "Blue CPCS Competence Card",
  "Blue CSCS Skilled Worker Card",
  "CITB Health Safety and Environment Test",
  "COSHH Wet Concrete Awareness",
  "CPCS A73 Plant Signaller Vehicle Marshaller",
  "CPCS Category A06 Concrete Placing Boom",
  "CPCS Category A17 Telescopic Handler",
  "CPCS Category A44 Trailer Mounted Concrete Pump",
  "CSCS Labourer Card",
  "Emergency First Aid at Work",
  "Face Fit Testing Respirable Crystalline Silica",
  "Harness Awareness Inspection Ticket",
  "Manual Handling",
  "Site Supervisor Safety Training Scheme",
  "Suspended Loads Endorsement",
  "Working at Heights Certification"
];

export const STAFF_ROLES = [
  "Concrete Finisher",
  "Concrete Operative",
  "Concrete Pour Supervisor",
  "Concrete Pump Operator",
  "Decking Assistant",
  "Director",
  "Ganger",
  "General Construction Labourer",
  "Inbound Sales Representative",
  "IT",
  "Logistics and Operations Coordinator",
  "Material Handler",
  "Telehandler Operator"
];

export const OFFICE_ROLES = [
  "Director",
  "IT",
  "Inbound Sales Representative",
  "Logistics and Operations Coordinator"
];

export const RosterView: React.FC<RosterViewProps> = ({ 
  workers, 
  setWorkers, 
  activeWorkerToAssign, 
  setActiveWorkerToAssign,
  setShifts,
  shifts = [],
  jobs = [],
  selectedWorkerDetailsId: propSelectedWorkerDetailsId,
  setSelectedWorkerDetailsId: propSetSelectedWorkerDetailsId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddWorkerForm, setShowAddWorkerForm] = useState(false);
  
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerRole, setNewWorkerRole] = useState<string>('Concrete Operative');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [newWorkerEmail, setNewWorkerEmail] = useState('');
  const [newTicketType, setNewTicketType] = useState('CSCS Labourer Card');
  const [newTicketExpiry, setNewTicketExpiry] = useState('2027-12-31');
  const [includeCertifications, setIncludeCertifications] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [localSelectedWorkerDetailsId, setLocalSelectedWorkerDetailsId] = useState<string | null>(null);
  
  const selectedWorkerDetailsId = propSelectedWorkerDetailsId !== undefined 
    ? propSelectedWorkerDetailsId 
    : localSelectedWorkerDetailsId;
    
  const setSelectedWorkerDetailsId = propSetSelectedWorkerDetailsId !== undefined 
    ? propSetSelectedWorkerDetailsId 
    : setLocalSelectedWorkerDetailsId;

  const [selectedWorkerToDelete, setSelectedWorkerToDelete] = useState<Worker | null>(null);
  const [selectedWorkerToPermanentDelete, setSelectedWorkerToPermanentDelete] = useState<Worker | null>(null);
  const [selectedWorkerToRestore, setSelectedWorkerToRestore] = useState<Worker | null>(null);
  const [selectedDocToDelete, setSelectedDocToDelete] = useState<{ id: string; name: string } | null>(null);
  
  const [workerToEdit, setWorkerToEdit] = useState<Worker | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<string>('Concrete Operative');

  const [rosterMode, setRosterMode] = useState<'active' | 'archived'>('active');
  const [layoutMode, setLayoutMode] = useState<'list' | 'grid'>('list');
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Auto toggle cert inclusion checkbox off for office roles
  useEffect(() => {
    if (OFFICE_ROLES.includes(newWorkerRole)) {
      setIncludeCertifications(false);
    } else {
      setIncludeCertifications(true);
    }
  }, [newWorkerRole]);

  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTickets, setEditTickets] = useState<Ticket[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [showReminderConfirm, setShowReminderConfirm] = useState(false);
  const [newWorkerPostcode, setNewWorkerPostcode] = useState('');
  const [editPostcode, setEditPostcode] = useState('');

  const [activeDossierTab, setActiveDossierTab] = useState<'general' | 'assignments' | 'audit_log'>('general');
  const [dossierAuditLogs, setDossierAuditLogs] = useState<any[]>([]);
  const [dossierDocRequests, setDossierDocRequests] = useState<any[]>([]);
  const [loadingDossierLogs, setLoadingDossierLogs] = useState(false);
  const [resendingRequestMap, setResendingRequestMap] = useState<Record<string, boolean>>({});
  const [auditLogPage, setAuditLogPage] = useState(1);
  const [copiedRequestId, setCopiedRequestId] = useState<string | null>(null);

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedRequestId(id);
    setTimeout(() => setCopiedRequestId(null), 2000);
  };

  useEffect(() => {
    setShowAllHistory(false);
    setActiveDossierTab('general');
    setAuditLogPage(1);
  }, [selectedWorkerDetailsId]);

  const fetchLogsAndRequests = async () => {
    if (!selectedWorkerDetailsId) return;
    setLoadingDossierLogs(true);
    try {
      const [logsRes, reqsRes] = await Promise.all([
        supabase
          .from('audit_logs')
          .select('*')
          .eq('target_type', 'staff')
          .eq('target_id', selectedWorkerDetailsId)
          .order('created_at', { ascending: false }),
        supabase
          .from('document_requests')
          .select('*')
          .eq('worker_id', selectedWorkerDetailsId)
          .order('created_at', { ascending: false })
      ]);

      if (logsRes.error) console.error('Error loading audit logs:', logsRes.error);
      if (reqsRes.error) console.error('Error loading document requests:', reqsRes.error);

      setDossierAuditLogs(logsRes.data || []);
      setDossierDocRequests(reqsRes.data || []);
    } catch (err) {
      console.error('Fetch logs error:', err);
    } finally {
      setLoadingDossierLogs(false);
    }
  };

  useEffect(() => {
    if (selectedWorkerDetailsId) {
      fetchLogsAndRequests();
    } else {
      setDossierAuditLogs([]);
      setDossierDocRequests([]);
    }
  }, [selectedWorkerDetailsId, activeDossierTab, showReminderConfirm, workerToEdit]);

  const handleResendRequest = async (request: any) => {
    if (resendingRequestMap[request.id]) return;
    setResendingRequestMap(prev => ({ ...prev, [request.id]: true }));

    try {
      const worker = workers.find(w => w.id === selectedWorkerDetailsId);
      if (!worker || !worker.email) {
        alert('Worker email is missing. Cannot resend request.');
        return;
      }

      const newExpiresAt = new Date();
      newExpiresAt.setHours(newExpiresAt.getHours() + 48);

      const { data, error: updateError } = await supabase
        .from('document_requests')
        .update({
          expires_at: newExpiresAt.toISOString(),
          completed_at: null
        })
        .eq('id', request.id)
        .select()
        .single();

      if (updateError) throw updateError;

      const uploadUrl = `${window.location.origin}/submit-credentials?token=${request.id}`;

      const { error: emailError } = await supabase.functions.invoke('send-compliance-email', {
        body: {
          toEmail: worker.email,
          workerName: worker.name,
          requestedCerts: request.requested_certs,
          uploadUrl: uploadUrl,
          expiresAt: newExpiresAt.toISOString()
        }
      });

      let emailSentResult = !emailError;
      let emailErrorResult = emailError ? emailError.message : '';

      await supabase.rpc('log_anonymous_audit', {
        p_user_email: 'admin@opusform.co.uk',
        p_action: 'RESEND_DOCUMENT_REQUEST',
        p_target_type: 'staff',
        p_target_id: worker.id,
        p_details: { 
          request_id: request.id, 
          requested_certs: request.requested_certs,
          email_sent: emailSentResult,
          email_error: emailErrorResult || undefined
        }
      });

      // Refresh data
      const [updatedReqs, updatedLogs] = await Promise.all([
        supabase.from('document_requests').select('*').eq('worker_id', selectedWorkerDetailsId).order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').eq('target_type', 'staff').eq('target_id', selectedWorkerDetailsId).order('created_at', { ascending: false })
      ]);
      
      setDossierDocRequests(updatedReqs.data || []);
      setDossierAuditLogs(updatedLogs.data || []);

    } catch (e: any) {
      console.error('Failed to resend request:', e);
      alert('Failed to resend request: ' + (e.message || e));
    } finally {
      setResendingRequestMap(prev => ({ ...prev, [request.id]: false }));
    }
  };


  const handleViewDocument = async (documentUrl: string) => {
    if (!documentUrl) return;
    
    if (documentUrl.includes('/compliance-documents/')) {
      try {
        const parts = documentUrl.split('/compliance-documents/');
        const filePath = parts[1];
        
        const { data, error } = await supabase.storage
          .from('compliance-documents')
          .createSignedUrl(filePath, 60);
          
        if (error) throw error;
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
          return;
        }
      } catch (err) {
        console.error('Failed to generate signed URL:', err);
        window.open(documentUrl, '_blank');
        return;
      }
    }
    
    window.open(documentUrl, '_blank');
  };

  const verifyTicket = async (workerId: string, ticketId: string, approve: boolean) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    let updatedTickets = [];
    if (approve) {
      updatedTickets = worker.tickets.map(t => 
        t.id === ticketId ? { ...t, verified: true } : t
      );
    } else {
      updatedTickets = worker.tickets.filter(t => t.id !== ticketId);
    }

    const updatedWorker = {
      ...worker,
      tickets: updatedTickets
    };

    setWorkers(prev => prev.map(w => w.id === workerId ? updatedWorker : w));

    try {
      const ticket = worker.tickets.find(t => t.id === ticketId);
      await supabase.rpc('log_anonymous_audit', {
        p_user_email: 'admin@opusform.co.uk',
        p_action: approve ? 'APPROVE_DOCUMENT' : 'REJECT_DOCUMENT',
        p_target_type: 'staff',
        p_target_id: workerId,
        p_details: { ticket_id: ticketId, ticket_type: ticket?.type, ticket_number: ticket?.ticketNumber }
      });
    } catch (e) {
      console.error('Failed to log audit:', e);
    }
  };

  const handleSendReminder = () => {
    if (selectedWorkerDetails) {
      console.log(`[DISPATCH] Compliance update requested for worker ${selectedWorkerDetails.name}. Automated SMS sent to ${selectedWorkerDetails.phone || 'N/A'} and Email sent to ${selectedWorkerDetails.email || 'N/A'}.`);
    }
    setShowReminderConfirm(false);
  };
  
  const handleAddWorkerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newWorkerName.trim()) {
      setFormError('Please enter worker name');
      return;
    }

    if (newWorkerPostcode.trim() && !isValidUKPostcode(newWorkerPostcode)) {
      setFormError('Invalid Home Postcode format');
      return;
    }

    const newId = `worker-${Date.now()}`;
    const tickets: Ticket[] = [];
    if (includeCertifications) {
      tickets.push({
        id: `t-${Date.now()}-1`,
        type: newTicketType,
        expiryDate: newTicketExpiry,
        ticketNumber: `OP-${Math.floor(100000 + Math.random() * 900000)}`
      });

      const isCscsSelected = newTicketType.includes('CSCS');
      if (newWorkerRole === 'Concrete Pour Supervisor' && !isCscsSelected) {
        tickets.push({
          id: `t-${Date.now()}-2`,
          type: 'CSCS Labourer Card',
          expiryDate: '2028-12-31',
          ticketNumber: `CSCS-${Math.floor(100000 + Math.random() * 900000)}`
        });
      } else if (newWorkerRole === 'Telehandler Operator' && !isCscsSelected) {
        tickets.push({
          id: `t-${Date.now()}-2`,
          type: 'CSCS Labourer Card',
          expiryDate: '2028-12-31',
          ticketNumber: `CSCS-${Math.floor(100000 + Math.random() * 900000)}`
        });
      }
    }

    const createdWorker: Worker = {
      id: newId,
      name: newWorkerName,
      role: newWorkerRole,
      phone: newWorkerPhone.trim() || undefined,
      email: newWorkerEmail.trim() || undefined,
      postcode: newWorkerPostcode.trim().toUpperCase() || undefined,
      tickets,
      uploadedCertificates: []
    };

    setWorkers(prev => [createdWorker, ...prev]);
    setSelectedWorkerDetailsId(newId);
    
    // Reset form
    setNewWorkerName('');
    setNewWorkerPhone('');
    setNewWorkerEmail('');
    setNewWorkerPostcode('');
    setShowAddWorkerForm(false);
  };

  const filteredWorkersList = workers.filter(w => {
    const query = searchQuery.toLowerCase();
    
    // Check if worker's scheduled jobs match the query
    const workerJobMatches = (shifts || [])
      .filter(s => s.workerId === w.id && !s.isRemoved)
      .some(s => {
        const job = (jobs || []).find(j => j.id === s.jobId);
        return job && job.siteName.toLowerCase().includes(query);
      });

    const matchesSearch = !query || 
                          w.name.toLowerCase().includes(query) || 
                          (w.phone || '').toLowerCase().includes(query) || 
                          (w.email || '').toLowerCase().includes(query) || 
                          workerJobMatches;
                          
    const matchesMode = rosterMode === 'active' ? !w.isArchived : w.isArchived;
    return matchesSearch && matchesMode;
  }).sort((a, b) => a.name.localeCompare(b.name));

  const selectedWorkerDetails = workers.find(w => w.id === selectedWorkerDetailsId) || null;
  const anchorDate = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const renderEditForm = () => {
    if (!workerToEdit) return null;
    return (
      <form onSubmit={(e) => {
          e.preventDefault();
          setEditError(null);
          if (!editName.trim()) {
            setEditError('Please enter worker name');
            return;
          }

          if (editPostcode.trim() && !isValidUKPostcode(editPostcode)) {
            setEditError('Invalid Home Postcode format');
            return;
          }
          
          // Validate tickets if any
          for (const ticket of editTickets) {
            if (!ticket.type.trim()) {
              setEditError('Ticket Type cannot be empty');
              return;
            }
            if (!ticket.expiryDate) {
              setEditError('Expiry Date cannot be empty');
              return;
            }
          }

          const updatedWorker: Worker = {
            ...workerToEdit,
            name: editName.trim(),
            role: editRole,
            phone: editPhone.trim() || undefined,
            email: editEmail.trim() || undefined,
            postcode: editPostcode.trim().toUpperCase() || undefined,
            tickets: editTickets
          };

          setWorkers(prev => prev.map(w => w.id === workerToEdit.id ? updatedWorker : w));
          setWorkerToEdit(null);
        }} className="space-y-6">
          
          {editError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 uppercase tracking-wider">
              {editError}
            </div>
          )}

          {/* Form Content Grid */}
          <div className="grid grid-cols-1 gap-6">
            {/* General Info */}
            <div className="flex flex-col">
              <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-2xl flex-1 flex flex-col h-full">
                <div className="p-5 pb-4 border-b border-white/5 bg-[#161616] flex items-center space-x-3 shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">General Information</span>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[#666] mb-1.5 block">Full Name</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-[#161616] border border-[#333] rounded-lg px-3 py-2.5 text-[11px] font-medium text-white focus:outline-none focus:border-brand-accent transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[#666] mb-1.5 block">Role</label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="w-full bg-[#161616] border border-[#333] rounded-lg px-3 py-2.5 text-[11px] font-medium text-white focus:outline-none focus:border-brand-accent transition-colors uppercase font-bold"
                      >
                        {STAFF_ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[#666] mb-1.5 block">Home Postcode</label>
                      <input 
                        type="text" 
                        value={editPostcode}
                        onChange={(e) => setEditPostcode(e.target.value)}
                        className="w-full bg-[#161616] border border-[#333] rounded-lg px-3 py-2.5 text-[11px] font-semibold text-white uppercase focus:outline-none focus:border-brand-accent transition-colors"
                        placeholder="e.g. M1 1AE"
                      />
                      {editPostcode.trim() && !isValidUKPostcode(editPostcode) && (
                        <p className="text-[10px] font-bold text-red-500 uppercase mt-1">Invalid UK Postcode format</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[#666] mb-1.5 block">Phone</label>
                      <input 
                        type="tel" 
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full bg-[#161616] border border-[#333] rounded-lg px-3 py-2.5 text-[11px] font-medium text-white focus:outline-none focus:border-brand-accent transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[#666] mb-1.5 block">Email</label>
                      <input 
                        type="email" 
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full bg-[#161616] border border-[#333] rounded-lg px-3 py-2.5 text-[11px] font-medium text-white focus:outline-none focus:border-brand-accent transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tickets Info */}
            <div className="flex flex-col">
              <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-2xl flex-1 flex flex-col h-full">
                <div className="p-5 pb-4 border-b border-white/5 bg-[#161616] flex items-center space-x-3 shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Tickets & Certifications</span>
                </div>
                <div className="p-5 space-y-3">
                  {editTickets.map((ticket, index) => (
                    <div key={ticket.id} className="grid grid-cols-12 gap-2 bg-[#161616] p-2 rounded-lg border border-[#2e2e2e]">
                      <div className="col-span-5">
                        <input 
                          type="text" 
                          value={ticket.type}
                          onChange={(e) => {
                            const newTickets = [...editTickets];
                            newTickets[index].type = e.target.value;
                            setEditTickets(newTickets);
                          }}
                          className="w-full bg-transparent border-none text-[10px] font-bold text-white uppercase px-1 py-1 focus:ring-0"
                          placeholder="Ticket Type"
                        />
                      </div>
                      <div className="col-span-5">
                        <input 
                          type="date" 
                          value={ticket.expiryDate}
                          onChange={(e) => {
                            const newTickets = [...editTickets];
                            newTickets[index].expiryDate = e.target.value;
                            setEditTickets(newTickets);
                          }}
                          className="w-full bg-transparent border-none text-[10px] text-[#aaa] px-1 py-1 focus:ring-0"
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={() => setEditTickets(editTickets.filter((_, i) => i !== index))}
                        className="col-span-2 text-red-500 hover:text-red-400 flex items-center justify-center"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEditTickets([...editTickets, { id: `new-${Date.now()}`, type: '', expiryDate: '', ticketNumber: '' }])}
                    className="w-full py-2 border border-dashed border-[#333] hover:border-brand-accent/50 text-[#666] hover:text-brand-accent rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    + Add New Ticket
                  </button>
                </div>
              </div>
            </div>

          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-[#2e2e2e]">
            <button
              type="button"
              onClick={() => setWorkerToEdit(null)}
              className="w-full sm:flex-1 py-3.5 border border-[#333] hover:bg-[#222] text-[#aaa] hover:text-white transition-all rounded-lg text-[10px] font-black uppercase tracking-widest"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              className="w-full sm:flex-1 py-3.5 bg-brand-accent hover:bg-brand-accent/80 text-white transition-all rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-accent/20"
            >
              Save & Apply
            </button>
          </div>
        </form>
    );
  };

  const renderDetailsDossier = () => {
    if (!selectedWorkerDetails) return null;
    const isShiftHistory = (shift: any) => {
      const job = (jobs || []).find(j => j.id === shift.jobId);
      const isJobCompleted = job?.status === 'completed';
      
      const shiftDate = new Date(shift.date);
      shiftDate.setHours(0,0,0,0);
      
      const today = new Date();
      today.setHours(0,0,0,0);
      
      return shiftDate < today || isJobCompleted;
    };

    const activeWorkerShifts = (shifts || []).filter(
      s => s.workerId === selectedWorkerDetails.id && !s.isRemoved && !isShiftHistory(s)
    );
    const historyWorkerShifts = (shifts || []).filter(
      s => s.workerId === selectedWorkerDetails.id && !s.isRemoved && isShiftHistory(s)
    );

    const groupShifts = (shiftsList: any[]) => {
      const grouped = shiftsList.reduce((acc, shift) => {
        if (!acc[shift.jobId]) {
          acc[shift.jobId] = [];
        }
        acc[shift.jobId].push(shift.date);
        return acc;
      }, {} as Record<string, string[]>);

      Object.keys(grouped).forEach(jobId => {
        grouped[jobId].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      });

      return grouped;
    };

    const groupedShifts = groupShifts(activeWorkerShifts);
    const groupedHistoryShifts = groupShifts(historyWorkerShifts);

    const formatDateRange = (dates: string[]) => {
      if (dates.length === 0) return 'No dates scheduled';
      if (dates.length === 1) return getDayName(dates[0]);
      
      const start = dates[0];
      const end = dates[dates.length - 1];
      return `${getDayName(start)} - ${getDayName(end)}`;
    };

    const getDayName = (dateStr: string) => {
      try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const date = new Date(Date.UTC(year, month, day));
          
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const dayIndex = date.getUTCDay();
          return `${dayNames[dayIndex]}, ${monthNames[month]} ${day}`;
        }
        return dateStr;
    } catch {
        return dateStr;
      }
    };

    // Prepare events feed for Audit Log tab
    const requestEvents = dossierDocRequests.map(r => {
      const isExpired = new Date(r.expires_at) < new Date();
      const isCompleted = !!r.completed_at;
      let status = 'pending';
      if (isCompleted) status = 'completed';
      else if (isExpired) status = 'expired';

      return {
        id: `req-${r.id}`,
        rawId: r.id,
        type: 'request',
        action: 'CREATE_DOCUMENT_REQUEST',
        created_at: r.created_at,
        actor: 'admin@opusform.co.uk',
        details: {
          requested_certs: r.requested_certs,
          expires_at: r.expires_at,
          completed_at: r.completed_at,
          status,
          uploadUrl: `${window.location.origin}/submit-credentials?token=${r.id}`
        },
        rawRecord: r
      };
    });

    const auditEvents = dossierAuditLogs.map(l => ({
      id: `audit-${l.id}`,
      rawId: l.id,
      type: 'audit',
      action: l.action,
      created_at: l.created_at,
      actor: l.user_email || 'System / Operative',
      details: l.details,
      rawRecord: l
    }));

    const allEvents = [...requestEvents, ...auditEvents].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const ITEMS_PER_PAGE = 10;
    const totalPages = Math.ceil(allEvents.length / ITEMS_PER_PAGE) || 1;
    const startIndex = (auditLogPage - 1) * ITEMS_PER_PAGE;
    const paginatedEvents = allEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        {/* Profile Card Banner */}
        <div className="flex items-center space-x-3 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800">
          <div className="w-10 h-10 rounded-lg bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent text-xs font-black uppercase shrink-0">
            {selectedWorkerDetails.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider leading-tight">{selectedWorkerDetails.name}</h4>
            <span className="text-[8.5px] font-black text-brand-accent uppercase tracking-widest block mt-0.5">{selectedWorkerDetails.role}</span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-zinc-850 gap-1 bg-zinc-950/25 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveDossierTab('general')}
            className={`flex-grow sm:flex-initial text-center px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${
              activeDossierTab === 'general'
                ? 'bg-zinc-900 text-white shadow-sm border border-zinc-800'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            General Info
          </button>
          <button
            type="button"
            onClick={() => setActiveDossierTab('assignments')}
            className={`flex-grow sm:flex-initial text-center px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${
              activeDossierTab === 'assignments'
                ? 'bg-zinc-900 text-white shadow-sm border border-zinc-800'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Site Assignments
          </button>
          <button
            type="button"
            onClick={() => setActiveDossierTab('audit_log')}
            className={`flex-grow sm:flex-initial text-center px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${
              activeDossierTab === 'audit_log'
                ? 'bg-zinc-900 text-white shadow-sm border border-zinc-800'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Audit & Requests Log
          </button>
        </div>

        {/* Tab 1: General Info */}
        {activeDossierTab === 'general' && (
          <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-200">
            {/* Contact & Communication details */}
            <div className="space-y-3 bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#bbb]">
                <Phone className="w-4 h-4 text-brand-accent" />
                Contact & Communication Details
              </div>
              <div className="space-y-3">
                {/* Phone */}
                <div>
                  <span className="text-[8.5px] font-black uppercase tracking-widest text-[#666] block mb-1">Phone Number</span>
                  {selectedWorkerDetails.phone ? (
                    <div className="flex items-center justify-between bg-[#222] px-3 py-1.5 rounded-lg border border-[#333] w-full">
                      <div className="text-xs font-bold text-white tracking-wider">
                        {selectedWorkerDetails.phone}
                      </div>
                      <a
                        href={`tel:${selectedWorkerDetails.phone}`}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded text-[8.5px] font-black uppercase tracking-widest transition-all"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                    </div>
                  ) : (
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] p-2 bg-[#222] rounded-lg border border-[#333] w-full text-center">
                      No phone number registered
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <span className="text-[8.5px] font-black uppercase tracking-widest text-[#666] block mb-1">Email Address</span>
                  {selectedWorkerDetails.email ? (
                    <div className="flex items-center justify-between bg-[#222] px-3 py-1.5 rounded-lg border border-[#333] w-full">
                      <div className="text-xs font-bold text-white tracking-wide truncate pr-2" title={selectedWorkerDetails.email}>
                        {selectedWorkerDetails.email}
                      </div>
                      <a
                        href={`mailto:${selectedWorkerDetails.email}`}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-[#5C7285] hover:bg-[#6c8295] text-white rounded text-[8.5px] font-black uppercase tracking-widest transition-all shrink-0"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email</span>
                      </a>
                    </div>
                  ) : (
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] p-2 bg-[#222] rounded-lg border border-[#333] w-full text-center">
                      No email address registered
                    </div>
                  )}
                </div>

                {/* Home Postcode */}
                <div>
                  <span className="text-[8.5px] font-black uppercase tracking-widest text-[#666] block mb-1">Home Postcode</span>
                  {selectedWorkerDetails.postcode ? (
                    <div className="flex items-center gap-2 bg-[#222] px-3 py-2 rounded-lg border border-[#333] w-full text-xs font-bold text-white tracking-widest uppercase">
                      <MapPin className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                      {selectedWorkerDetails.postcode}
                    </div>
                  ) : (
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] p-2 bg-[#222] rounded-lg border border-[#333] w-full text-center">
                      No postcode registered
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Safety Tickets summary */}
            <div className="space-y-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#bbb]">
                  <ShieldAlert className="w-4 h-4 text-brand-accent" />
                  Compliance Status
                </div>
                <button
                  type="button"
                  onClick={() => setShowReminderConfirm(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#252525] border border-[#333] hover:border-brand-accent hover:text-brand-accent text-white/90 rounded-lg text-[8.5px] font-black uppercase tracking-widest transition-all duration-150 hover:bg-brand-accent/5 active:scale-98"
                  title="Request Compliance Update via Email & SMS"
                >
                  <Send className="w-3 h-3" />
                  <span>Request Update</span>
                </button>
              </div>
              <div className="space-y-2">
                {selectedWorkerDetails.tickets.map(ticket => {
                  const isPending = ticket.verified === false;
                  return (
                    <div key={ticket.id} className="flex flex-col p-3 rounded-lg border border-[#333] bg-[#222] gap-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-col space-y-0.5">
                          <span className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                            {ticket.type} Ticket
                            {isPending && (
                              <span className="px-1.5 py-0.5 rounded text-[6.5px] font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                Pending Approval
                              </span>
                            )}
                          </span>
                          <span className="text-[8.5px] font-bold text-[#bbb] uppercase tracking-widest">
                            Ref: {ticket.ticketNumber || 'N/A'} &bull; Exp: {ticket.expiryDate}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {ticket.documentUrl && (
                            <button
                              type="button"
                              onClick={() => handleViewDocument(ticket.documentUrl)}
                              className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-brand-accent text-zinc-300 hover:text-white rounded text-[7.5px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              View File
                            </button>
                          )}
                          <TicketStatusBadge ticket={ticket} />
                        </div>
                      </div>
                      
                      {isPending && (
                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => verifyTicket(selectedWorkerDetails.id, ticket.id, true)}
                            className="flex-1 py-1 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer text-center"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => verifyTicket(selectedWorkerDetails.id, ticket.id, false)}
                            className="flex-1 py-1 bg-red-950/40 hover:bg-red-950/70 border border-red-900/30 text-red-400 rounded text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer text-center"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Document Management Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#333] pb-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#bbb]">
                  <UploadCloud className="w-4 h-4 text-brand-accent" />
                  Uploaded Documents & Proofs
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    const fileNames = ['CSCS_Card_Front.jpg', 'ID_Passport_Copy.pdf', 'Manual_Handling_Cert.pdf'];
                    const randomName = fileNames[Math.floor(Math.random() * fileNames.length)];
                    const updated = { ...selectedWorkerDetails };
                    if (!updated.uploadedCertificates) updated.uploadedCertificates = [];
                    updated.uploadedCertificates.push({
                      id: `doc-${Date.now()}`,
                      name: randomName,
                      uploadedAt: new Date().toISOString().split('T')[0],
                      size: '1.2 MB'
                    });
                    setWorkers(prev => prev.map(w => w.id === updated.id ? updated : w));
                  }}
                  className="px-3 py-1.5 bg-[#5C7285] hover:bg-[#6c8295] text-white text-[9px] font-black uppercase tracking-widest rounded transition-colors flex items-center gap-1.5"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  Upload File
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {selectedWorkerDetails.uploadedCertificates && selectedWorkerDetails.uploadedCertificates.length > 0 ? (
                  selectedWorkerDetails.uploadedCertificates.map(cert => (
                    <div key={cert.id} className="p-3 rounded-xl border border-[#333] bg-[#1a1a1a] flex flex-col space-y-3.5 hover:border-brand-accent/30 transition-colors group">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-lg bg-[#252525] text-brand-accent border border-[#333] group-hover:bg-brand-accent/10 transition-colors">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black text-white uppercase tracking-widest truncate" title={cert.name}>
                            {cert.name}
                          </p>
                          <p className="text-[8.5px] font-bold text-[#bbb] uppercase tracking-widest mt-0.5">
                            Added: {cert.uploadedAt}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button type="button" className="flex-1 py-1 rounded bg-[#222] border border-[#333] hover:bg-[#333] hover:text-white text-[8.5px] font-black uppercase tracking-widest text-white/80 flex justify-center items-center gap-1 transition-colors">
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                        <button 
                          type="button"
                          onClick={() => setSelectedDocToDelete({ id: cert.id, name: cert.name })}
                          className="px-2 py-1 rounded bg-[#222] border border-[#333] hover:bg-red-950 hover:border-red-900/50 hover:text-red-400 text-[8.5px] font-black uppercase tracking-widest text-[#888] flex justify-center items-center transition-colors"
                          title="Delete File"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-10 border border-dashed border-[#333] rounded-xl text-[10px] font-black uppercase tracking-widest text-[#aaa] bg-[#1a1a1a]">
                    <UploadCloud className="w-8 h-8 text-brand-accent/60 mx-auto mb-3" />
                    No compliance certificates uploaded
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Site Assignments */}
        {activeDossierTab === 'assignments' && (
          <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-200">
            {/* Active Deployments / Sites Section */}
            <div className="space-y-3.5 bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#bbb]">
                <Calendar className="w-4.5 h-4.5 text-brand-accent" />
                Active Site Deployments
              </div>
              {Object.keys(groupedShifts).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(groupedShifts).map(([jobId, shiftDates]) => {
                    const job = (jobs || []).find(j => j.id === jobId);
                    if (!job) return null;
                    return (
                      <div key={jobId} className="p-3 rounded-xl border border-[#333] bg-[#1e1e1e] hover:border-brand-accent/30 transition-colors space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <h4 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-brand-accent" />
                              {job.siteName}
                            </h4>
                            <p className="text-[9px] font-bold text-[#bbb] uppercase tracking-widest leading-none mt-0.5">
                              Contractor: {job.mainContractor} &bull; Ref: {job.jobRef}
                            </p>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase tracking-widest border ${
                            job.status === 'active' || job.status === 'in-progress'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-[#252525] border-[#333] text-white/50'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                        
                        <div className="pt-2 border-t border-[#333] space-y-1">
                          <span className="text-[10px] font-black text-[#bbb] uppercase tracking-wider">Deployed Days</span>
                          <div className="flex flex-wrap gap-1.5">
                            {(shiftDates as string[]).map(dateStr => (
                              <span key={dateStr} className="px-2.5 py-1 rounded-md bg-[#262626] border border-[#3a3a3a] text-[11px] font-bold text-white tracking-wide font-sans shadow-sm transition-colors hover:bg-[#303030]">
                                {getDayName(dateStr)}
                              </span>
                            ))}
                          </div>
                        </div>

                        {job.postcode && (
                          <div className="text-[9px] font-black text-brand-accent uppercase tracking-widest flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.postcode}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 border border-dashed border-[#333] rounded-xl text-[10px] font-black uppercase tracking-widest text-[#aaa] bg-[#1a1a1a]">
                  <Calendar className="w-7 h-7 text-brand-accent/60 mx-auto mb-2" />
                  No active site assignments found for this staff member
                </div>
              )}
            </div>

            {/* Deployment History / Completed Shifts Section */}
            <div className="space-y-3 bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#bbb]">
                <Calendar className="w-4.5 h-4.5 text-gray-500" />
                Deployment History
              </div>
              {Object.keys(groupedHistoryShifts).length > 0 ? (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                    {(showAllHistory 
                      ? Object.entries(groupedHistoryShifts)
                      : Object.entries(groupedHistoryShifts).slice(0, 5)
                    ).map(([jobId, shiftDates]) => {
                      const job = (jobs || []).find(j => j.id === jobId);
                      if (!job) return null;
                      return (
                        <div key={jobId} className="p-3 rounded-xl border border-[#333] bg-[#1e1e1e] hover:border-white/10 transition-colors space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <h4 className="text-[11px] font-black text-white/70 uppercase tracking-widest flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-gray-500" />
                                {job.siteName}
                              </h4>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">
                                Contractor: {job.mainContractor} &bull; Ref: {job.jobRef}
                              </p>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase tracking-widest border bg-[#252525] border-[#333] text-gray-400">
                              {job.status === 'completed' ? 'COMPLETED' : 'ARCHIVED'}
                            </span>
                          </div>
                          
                          <div className="pt-2 border-t border-[#333] space-y-1">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Deployment Range</span>
                            <div className="text-[11px] font-bold text-gray-400 font-sans">
                              {formatDateRange(shiftDates as string[])}
                            </div>
                          </div>

                          {job.postcode && (
                            <div className="text-[8.5px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-gray-600" />
                              {job.postcode}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {Object.keys(groupedHistoryShifts).length > 5 && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAllHistory(!showAllHistory)}
                        className="px-4 py-2 bg-[#252525] hover:bg-[#333] border border-[#333] text-[10px] font-black uppercase tracking-widest text-[#5C7285] hover:text-[#5C7285]/80 rounded-lg transition-colors"
                      >
                        {showAllHistory ? 'Show Less History' : `View All History (${Object.keys(groupedHistoryShifts).length} total)`}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 border border-dashed border-[#333] rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 bg-[#1a1a1a]">
                  <Calendar className="w-7 h-7 text-gray-600 mx-auto mb-2" />
                  No completed or archived shifts found for this staff member
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Audit & Requests Log */}
        {activeDossierTab === 'audit_log' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#bbb]">
                <FileText className="w-4 h-4 text-brand-accent" />
                Compliance & Audit History Log
              </div>
              
              {loadingDossierLogs && (
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-brand-accent" />
                  Syncing logs...
                </span>
              )}
            </div>

            {loadingDossierLogs && allEvents.length === 0 ? (
              <div className="text-center py-12 border border-[#333] bg-[#1a1a1a] rounded-xl">
                <RefreshCw className="w-8 h-8 text-brand-accent/60 animate-spin mx-auto mb-3" />
                <p className="text-[10px] font-black text-[#888] uppercase tracking-widest">Loading history log...</p>
              </div>
            ) : allEvents.length > 0 ? (
              <div className="divide-y divide-zinc-850/50 animate-in fade-in">
                {paginatedEvents.map(event => {
                  const date = new Date(event.created_at).toLocaleString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  });

                  if (event.type === 'request') {
                    const req = event.rawRecord;
                    const certs = event.details?.requested_certs || [];
                    const isExpired = event.details?.status === 'expired';
                    const isCompleted = event.details?.status === 'completed';
                    const isPending = event.details?.status === 'pending';

                    return (
                      <div key={event.id} className="py-3.5 space-y-2.5 hover:bg-zinc-900/10 transition-colors px-1 rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <div className="text-brand-accent mt-0.5 shrink-0">
                              <Send className="w-3.5 h-3.5" />
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-black text-white uppercase tracking-widest">
                                Document Request Dispatched
                              </p>
                              <p className="text-[8.5px] font-bold text-zinc-500 uppercase tracking-wider">
                                {date} &bull; By: {event.actor}
                              </p>
                            </div>
                          </div>
                          
                          <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase tracking-widest border ${
                            isCompleted
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : isExpired
                              ? 'bg-red-500/10 border-red-500/30 text-red-400'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          }`}>
                            {event.details?.status}
                          </span>
                        </div>

                        <div className="pl-6 space-y-2">
                          <div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-650 block mb-1">Requested Certifications</span>
                            <div className="flex flex-wrap gap-1">
                              {certs.map((c: string) => (
                                <span key={c} className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[8.5px] font-bold text-zinc-300">
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-900/50">
                            <div className="text-[9px] font-bold text-zinc-400">
                              {isPending ? (
                                <span className="flex items-center gap-1 text-amber-400/90">
                                  <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
                                  Expires: {new Date(event.details?.expires_at).toLocaleString('en-GB')}
                                </span>
                              ) : isCompleted ? (
                                <span className="flex items-center gap-1 text-emerald-400">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  Completed: {new Date(event.details?.completed_at).toLocaleString('en-GB')}
                                </span>
                              ) : (
                                <span className="text-red-450 uppercase tracking-widest text-[7.5px] font-black">Expired link</span>
                              )}
                            </div>

                            {isPending && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopyLink(event.details?.uploadUrl, event.id)}
                                  className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[8px] font-black uppercase tracking-widest rounded text-zinc-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedRequestId === event.id ? (
                                    <>
                                      <UserCheck className="w-3 h-3 text-emerald-400" />
                                      <span>Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3 text-brand-accent" />
                                      <span>Copy Link</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResendRequest(req)}
                                  disabled={resendingRequestMap[req.id]}
                                  className="px-2 py-0.5 bg-brand-accent/90 hover:bg-brand-accent text-white text-[8px] font-black uppercase tracking-widest rounded transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                                >
                                  {resendingRequestMap[req.id] ? (
                                    <>
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                      <span>Sending...</span>
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="w-3 h-3" />
                                      <span>Resend Email</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    let logIcon = <FileText className="w-3.5 h-3.5 text-zinc-400" />;
                    let logTitle = "System Action Logged";
                    let badgeColor = "bg-zinc-900/40 border-zinc-800 text-zinc-400";
                    
                    const action = event.action;
                    if (action === 'APPROVE_DOCUMENT') {
                      logIcon = <UserCheck className="w-3.5 h-3.5 text-emerald-400" />;
                      logTitle = "Compliance Document Approved";
                      badgeColor = "bg-emerald-950/20 border-emerald-900/30 text-emerald-400";
                    } else if (action === 'REJECT_DOCUMENT') {
                      logIcon = <X className="w-3.5 h-3.5 text-red-400" />;
                      logTitle = "Compliance Document Rejected/Purged";
                      badgeColor = "bg-red-950/20 border-red-900/30 text-red-400";
                    } else if (action === 'SUBMIT_DOCUMENTS') {
                      logIcon = <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />;
                      logTitle = "Operative Documents Uploaded";
                      badgeColor = "bg-emerald-950/20 border-emerald-900/30 text-emerald-400";
                    } else if (action === 'RESEND_DOCUMENT_REQUEST') {
                      logIcon = <RefreshCw className="w-3.5 h-3.5 text-brand-accent" />;
                      logTitle = "Document Request Link Renewed & Resent";
                      badgeColor = "bg-brand-accent/5 border-brand-accent/20 text-brand-accent";
                    } else if (action === 'CREATE' || action === 'UPDATE') {
                      logIcon = <Edit className="w-3.5 h-3.5 text-zinc-400" />;
                      logTitle = "Staff Profile Mutation Recorded";
                      badgeColor = "bg-zinc-900/40 border-zinc-800 text-zinc-300";
                    }

                    let summaryText = "";
                    if (action === 'APPROVE_DOCUMENT' || action === 'REJECT_DOCUMENT') {
                      summaryText = `${event.details?.ticket_type || 'Certificate'} (Ref: ${event.details?.ticket_number || 'N/A'})`;
                    } else if (action === 'SUBMIT_DOCUMENTS') {
                      const submittedCerts = event.details?.tickets_submitted || [];
                      summaryText = `Submitted: ${submittedCerts.map((c: any) => c.type).join(', ')}`;
                    } else if (action === 'UPDATE') {
                      summaryText = "Administrative updates applied to database record";
                    } else if (action === 'CREATE') {
                      summaryText = "Initial database record created for staff member";
                    } else {
                      summaryText = typeof event.details === 'string' ? event.details : JSON.stringify(event.details || {});
                    }

                    return (
                      <div key={event.id} className="py-3 space-y-1.5 hover:bg-zinc-900/10 transition-colors px-1 rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <div className="text-zinc-550 mt-0.5 shrink-0">
                              {logIcon}
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-black text-white uppercase tracking-widest">
                                {logTitle}
                              </p>
                              <p className="text-[8.5px] font-bold text-zinc-500 uppercase tracking-wider">
                                {date} &bull; By: {event.actor}
                              </p>
                            </div>
                          </div>
                          
                          <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase tracking-widest border ${badgeColor}`}>
                            {action}
                          </span>
                        </div>

                        {summaryText && (
                          <div className="pl-6">
                            <p className="text-[11px] font-bold text-zinc-400 font-sans leading-relaxed">
                              {summaryText}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  }
                })}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-900">
                    <button
                      type="button"
                      onClick={() => setAuditLogPage(prev => Math.max(1, prev - 1))}
                      disabled={auditLogPage === 1}
                      className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-[9px] font-black uppercase tracking-widest rounded text-zinc-400 hover:text-white transition-all disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">
                      Page {auditLogPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAuditLogPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={auditLogPage === totalPages}
                      className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-[9px] font-black uppercase tracking-widest rounded text-zinc-400 hover:text-white transition-all disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/10">
                <FileText className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">No audit or request events logged</p>
              </div>
            )}
          </div>
        )}

        {/* Request Compliance Update Modal */}
        {selectedWorkerDetails && (
          <RequestCredentialsModal 
            isOpen={showReminderConfirm} 
            onClose={() => setShowReminderConfirm(false)} 
            worker={selectedWorkerDetails} 
          />
        )}

          {/* Archive Confirmation Modal */}
          {selectedWorkerToDelete && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 text-left">
              <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setSelectedWorkerToDelete(null)} />
              <div className="bg-[#1f2125] border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 pb-4 border-b border-zinc-850 bg-zinc-950/10 flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold uppercase tracking-wider text-zinc-100">Archive Staff Profile</h3>
                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-normal mt-0.5">Soft delete worker record</p>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <p className="text-[13px] font-medium text-zinc-300 leading-relaxed">
                    Are you sure you want to archive the profile of <span className="font-bold text-white">{selectedWorkerToDelete.name}</span> (<span className="text-brand-accent">{selectedWorkerToDelete.role}</span>)?
                  </p>
                  <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-lg text-[12px] font-medium text-zinc-400 leading-relaxed">
                    This worker will be soft-deleted and removed from the active roster and shift planner. However, their historic deployments and records will be preserved.
                  </div>
                </div>

                <div className="p-6 bg-zinc-950/10 border-t border-zinc-850 flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedWorkerToDelete(null)}
                    className="flex-1 py-3 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all rounded text-[12px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setWorkers(prev => prev.map(w => w.id === selectedWorkerToDelete.id ? { ...w, isArchived: true } : w));
                      setSelectedWorkerDetailsId(null);
                      setSelectedWorkerToDelete(null);
                    }}
                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white transition-all rounded text-[12px] font-bold uppercase tracking-wider shadow-lg shadow-amber-600/10 cursor-pointer"
                  >
                    Archive Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Permanent Delete Confirmation Modal */}
          {selectedWorkerToPermanentDelete && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 text-left">
              <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setSelectedWorkerToPermanentDelete(null)} />
              <div className="bg-[#1f2125] border border-red-900/30 rounded-2xl w-full max-w-md overflow-hidden relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 pb-4 border-b border-red-950/10 bg-red-950/10 flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold uppercase tracking-wider text-red-400">Delete Staff Member</h3>
                    <p className="text-[11px] font-medium text-red-500/50 uppercase tracking-normal mt-0.5">Permanent record deletion</p>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <p className="text-[13px] font-medium text-zinc-300 leading-relaxed">
                    Are you absolutely sure you want to permanently delete <span className="font-bold text-white">{selectedWorkerToPermanentDelete.name}</span>?
                  </p>
                  <div className="p-4 bg-red-950/10 border border-red-900/20 rounded-lg text-[12px] font-semibold text-red-400/90 leading-relaxed uppercase tracking-wider">
                    WARNING: This action is irreversible. All records, compliance certificates, and schedules associated with this staff member will be permanently purged from the database.
                  </div>
                </div>

                <div className="p-6 bg-zinc-950/10 border-t border-zinc-850 flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedWorkerToPermanentDelete(null)}
                    className="flex-1 py-3 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all rounded text-[12px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setWorkers(prev => prev.filter(w => w.id !== selectedWorkerToPermanentDelete.id));
                      setSelectedWorkerDetailsId(null);
                      setSelectedWorkerToPermanentDelete(null);
                    }}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white transition-all rounded text-[12px] font-bold uppercase tracking-wider shadow-lg shadow-red-600/10 cursor-pointer"
                  >
                    Purge Record
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Restore Confirmation Modal */}
          {selectedWorkerToRestore && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 text-left">
              <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setSelectedWorkerToRestore(null)} />
              <div className="bg-[#1f2125] border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 pb-4 border-b border-zinc-850 bg-zinc-950/10 flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <UserCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold uppercase tracking-wider text-emerald-450 text-emerald-400">Restore Staff Member</h3>
                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-normal mt-0.5">Activate archived record</p>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <p className="text-[13px] font-medium text-zinc-300 leading-relaxed">
                    Are you sure you want to restore <span className="font-bold text-white">{selectedWorkerToRestore.name}</span> to the active staff roster?
                  </p>
                  <div className="p-4 bg-emerald-950/10 border border-emerald-900/20 rounded-lg text-[12px] font-medium text-emerald-400/90 leading-relaxed">
                    This staff member will be returned to the active staff roster and made available for site assignments.
                  </div>
                </div>

                <div className="p-6 bg-zinc-950/10 border-t border-zinc-850 flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedWorkerToRestore(null)}
                    className="flex-1 py-3 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all rounded text-[12px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setWorkers(prev => prev.map(w => w.id === selectedWorkerToRestore.id ? { ...w, isArchived: false } : w));
                      setSelectedWorkerToRestore(null);
                    }}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white transition-all rounded text-[12px] font-bold uppercase tracking-wider shadow-lg shadow-emerald-600/10 cursor-pointer"
                  >
                    Restore Record
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Document Confirmation Modal */}
          {selectedDocToDelete && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 text-left">
              <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setSelectedDocToDelete(null)} />
              <div className="bg-[#1f2125] border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 pb-4 border-b border-zinc-850 bg-zinc-950/10 flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold uppercase tracking-wider text-zinc-100">Purge Document</h3>
                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-normal mt-0.5">Permanent File Deletion</p>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <p className="text-[13px] font-medium text-zinc-300 leading-relaxed">
                    Are you absolutely sure you want to permanently delete the document <span className="font-bold text-white">{selectedDocToDelete.name}</span> from <span className="text-brand-accent">{selectedWorkerDetails.name}</span>'s compliance dossier?
                  </p>
                  <div className="p-4 bg-red-950/10 border border-red-900/20 rounded-lg text-[12px] font-medium text-red-400 leading-relaxed">
                    This action is irreversible and will permanently delete this record from the system storage.
                  </div>
                </div>

                <div className="p-6 bg-zinc-950/10 border-t border-zinc-850 flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedDocToDelete(null)}
                    className="flex-1 py-3 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all rounded text-[12px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const updated = { ...selectedWorkerDetails };
                      updated.uploadedCertificates = updated.uploadedCertificates?.filter(c => c.id !== selectedDocToDelete.id);
                      setWorkers(prev => prev.map(w => w.id === updated.id ? updated : w));
                      setSelectedDocToDelete(null);
                    }}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white transition-all rounded text-[12px] font-bold uppercase tracking-wider shadow-lg shadow-red-600/10 cursor-pointer"
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 max-w-xl relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, number, email, or job site..."
            className="w-full bg-[#1e1e1e] border border-[#333] text-sm text-white rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-[#5C7285] transition-colors placeholder:text-[#555] shadow-inner"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Layout Mode Toggle */}
          <div className="flex items-center bg-[#1e1e1e] border border-[#333] rounded-xl p-1 shrink-0">
            <button
              onClick={() => setLayoutMode('list')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${layoutMode === 'list' ? 'bg-[#2a2a2a] text-brand-accent' : 'text-[#666] hover:text-[#aaa]'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode('grid')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${layoutMode === 'grid' ? 'bg-[#2a2a2a] text-brand-accent' : 'text-[#666] hover:text-[#aaa]'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowAddWorkerForm(!showAddWorkerForm)}
            className="px-5 py-3 bg-[#5C7285] hover:bg-[#6c8295] text-white rounded-xl transition-all shadow-lg shadow-[#5C7285]/20 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest whitespace-nowrap cursor-pointer"
          >
            {showAddWorkerForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddWorkerForm ? 'Cancel Registration' : 'Register Staff'}
          </button>
        </div>
      </div>

      {/* Active vs Archived Selector */}
      <div className="flex border-b border-[#2e2e2e] pb-2 gap-6">
        <button
          type="button"
          onClick={() => {
            setRosterMode('active');
          }}
          className={`pb-2.5 text-[10px] font-black uppercase tracking-[0.15em] border-b-2 transition-all ${rosterMode === 'active' ? 'border-[#5C7285] text-white' : 'border-transparent text-[#666] hover:text-white'}`}
        >
          Staff ({workers.filter(w => !w.isArchived).length})
        </button>
        <button
          type="button"
          onClick={() => {
            setRosterMode('archived');
          }}
          className={`pb-2.5 text-[10px] font-black uppercase tracking-[0.15em] border-b-2 transition-all ${rosterMode === 'archived' ? 'border-amber-600 text-amber-500' : 'border-transparent text-[#666] hover:text-amber-500'}`}
        >
          Archived Staff ({workers.filter(w => w.isArchived).length})
        </button>
      </div>

      

      {/* Add Worker Form */}
      {showAddWorkerForm && (
        <form onSubmit={handleAddWorkerSubmit} className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl p-6 space-y-5 shadow-2xl animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#aaa] border-b border-[#333] pb-3">
            <UserPlus className="w-4 h-4 text-[#5C7285]" />
            New Operative Registration
          </div>
          
          {formError && (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
              <AlertTriangle className="w-4 h-4" />
              {formError}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#888]">Full Name</label>
              <input
                type="text"
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-[#5C7285] transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#888]">Phone Number</label>
              <input
                type="text"
                value={newWorkerPhone}
                onChange={(e) => setNewWorkerPhone(e.target.value)}
                placeholder="e.g. 07700900123"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-[#5C7285] transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#888]">Email Address</label>
              <input
                type="email"
                value={newWorkerEmail}
                onChange={(e) => setNewWorkerEmail(e.target.value)}
                placeholder="e.g. john.doe@opusform.co.uk"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-[#5C7285] transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#888]">Home Postcode</label>
              <input
                type="text"
                value={newWorkerPostcode}
                onChange={(e) => setNewWorkerPostcode(e.target.value)}
                placeholder="e.g. M1 1AE"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-[#5C7285] transition-colors uppercase tracking-wider"
              />
              {newWorkerPostcode.trim() && !isValidUKPostcode(newWorkerPostcode) && (
                <p className="text-[9.5px] font-black text-red-500 uppercase tracking-widest mt-1">Invalid UK Postcode format</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#888]">Role</label>
              <select
                value={newWorkerRole}
                onChange={(e) => setNewWorkerRole(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2.5 text-[11px] font-bold tracking-widest text-white uppercase outline-none focus:border-[#5C7285] transition-colors appearance-none"
              >
                {STAFF_ROLES.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2 pt-2 md:col-span-2">
              <input
                type="checkbox"
                id="includeCertifications"
                checked={includeCertifications}
                onChange={(e) => setIncludeCertifications(e.target.checked)}
                className="w-4 h-4 bg-[#1a1a1a] border border-[#333] rounded focus:ring-0 accent-[#5C7285] cursor-pointer"
              />
              <label htmlFor="includeCertifications" className="text-[10px] font-black uppercase tracking-widest text-[#bbb] cursor-pointer">
                Include On-site Certification
              </label>
            </div>

            {includeCertifications && (
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#888]">On-site Certifications</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={newTicketType}
                    onChange={(e) => setNewTicketType(e.target.value)}
                    className="flex-1 w-full min-w-0 bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2.5 text-[11px] font-bold tracking-widest text-white uppercase outline-none focus:border-[#5C7285] transition-colors appearance-none truncate"
                  >
                    {ON_SITE_CERTIFICATIONS.map(cert => (
                      <option key={cert} value={cert}>{cert}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={newTicketExpiry}
                    onChange={(e) => setNewTicketExpiry(e.target.value)}
                    className="flex-1 w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2.5 text-[11px] font-bold tracking-widest text-white uppercase outline-none focus:border-[#5C7285] transition-colors"
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddWorkerForm(false)}
              className="px-6 py-2.5 bg-[#252525] hover:bg-[#333] border border-[#333] text-[#aaa] text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-2.5 bg-[#5C7285] hover:bg-[#6c8295] text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors shadow-lg shadow-[#5C7285]/20"
            >
              Submit Registration
            </button>
          </div>
        </form>
      )}

      {/* Staff Roster Content */}
      {layoutMode === 'list' ? (
        <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-2xl">
          <div className="hidden md:grid md:grid-cols-[2fr_1.5fr_2.5fr] gap-3 px-4 py-2.5 border-b border-[#2e2e2e] bg-[#222]">
            <span className="text-[9px] font-black tracking-widest uppercase text-[#888]">Staff Details</span>
            <span className="text-[9px] font-black tracking-widest uppercase text-[#888]">Contact</span>
            <span className="text-[9px] font-black tracking-widest uppercase text-[#888]">Compliance & Tickets</span>
          </div>
          <div className="divide-y divide-[#2e2e2e]">
            {filteredWorkersList.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <Users className="w-10 h-10 text-[#444] mx-auto mb-4" />
                <div className="text-[11px] font-black uppercase tracking-widest text-[#666]">
                  No matching staff found
                </div>
              </div>
            ) : (
              filteredWorkersList.map(worker => {
                const isOfficeStaff = OFFICE_ROLES.includes(worker.role);
                const hasCertifications = worker.tickets && worker.tickets.length > 0;
                let isUnfit = false;
                if (isOfficeStaff) {
                  const hasExpiredCerts = worker.tickets?.some(t => new Date(t.expiryDate) < anchorDate);
                  isUnfit = hasCertifications && hasExpiredCerts;
                } else {
                  const cscsTicket = worker.tickets?.find(t => t.type.includes('CSCS') || t.type.includes('Labourer'));
                  isUnfit = !cscsTicket || new Date(cscsTicket.expiryDate) < anchorDate;
                }
                const isAssignActive = activeWorkerToAssign?.id === worker.id;

                return (
                  <div 
                    key={worker.id}
                    onClick={() => setSelectedWorkerDetailsId(worker.id)}
                    className={`flex flex-col md:grid md:grid-cols-[2fr_1.5fr_2.5fr] gap-3 px-4 py-3.5 items-center hover:bg-[#242424] cursor-pointer transition-all duration-150 border-l-2 ${isUnfit ? 'border-l-red-500/50 hover:border-l-red-500' : 'border-l-transparent hover:border-l-brand-accent'} ${isAssignActive ? 'bg-[#5C7285]/10' : ''}`}
                  >
                    {/* Staff Details */}
                    <div className="flex flex-col space-y-1 w-full md:w-auto">
                      <div className="flex items-center gap-2">
                        <span className={`text-[12.5px] font-black uppercase tracking-wider break-words ${isUnfit ? 'text-red-400' : 'text-zinc-200'}`}>
                          {worker.name}
                        </span>
                        {isUnfit && (
                          <span className="px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-[7px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1 animate-pulse">
                            <ShieldAlert className="w-2.5 h-2.5" />
                            UNFIT
                          </span>
                        )}
                      </div>
                      <span className="inline-block self-start px-2 py-0.5 rounded-md bg-[#1a1a1a] border border-[#333] text-[8.5px] font-black text-[#888] uppercase tracking-widest">
                        {worker.role}
                      </span>
                    </div>

                    {/* Contact */}
                    <div className="flex flex-col gap-1 w-full md:w-auto text-[#aaa]">
                      {worker.phone && (
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/95">
                          <Phone className="w-3 h-3 text-[#777]" />
                          {worker.phone}
                        </div>
                      )}
                      {worker.email && (
                        <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-[#888] tracking-wide" title={worker.email}>
                          <Mail className="w-3 h-3 text-[#777] shrink-0" />
                          <span className="truncate max-w-[170px]">{worker.email}</span>
                        </div>
                      )}
                      {!worker.phone && !worker.email && (
                        <span className="text-[9px] font-bold text-[#555] uppercase tracking-widest">-</span>
                      )}
                    </div>

                    {/* Compliance & Tickets */}
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                      {worker.tickets.map(ticket => {
                        const status = getTicketStatus(ticket);
                        let colorClasses = '';
                        if (status === 'EXPIRED') {
                          colorClasses = 'bg-red-500/10 border-red-500/30 text-red-400';
                        } else if (status === 'EXPIRING_SOON') {
                          colorClasses = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
                        } else {
                          colorClasses = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
                        }
                        return (
                          <span 
                             key={ticket.id} 
                             className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${colorClasses} whitespace-nowrap`}
                          >
                            {ticket.type} &bull; {ticket.expiryDate}
                          </span>
                        );
                      })}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkersList.length === 0 ? (
            <div className="col-span-full bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl px-6 py-16 text-center shadow-2xl">
              <Users className="w-10 h-10 text-[#444] mx-auto mb-4" />
              <div className="text-[11px] font-black uppercase tracking-widest text-[#666]">
                No matching staff found
              </div>
            </div>
          ) : (
            filteredWorkersList.map(worker => {
              const isOfficeStaff = OFFICE_ROLES.includes(worker.role);
              const hasCertifications = worker.tickets && worker.tickets.length > 0;
              let isUnfit = false;
              if (isOfficeStaff) {
                const hasExpiredCerts = worker.tickets?.some(t => new Date(t.expiryDate) < anchorDate);
                isUnfit = hasCertifications && hasExpiredCerts;
              } else {
                const cscsTicket = worker.tickets?.find(t => t.type.includes('CSCS') || t.type.includes('Labourer'));
                isUnfit = !cscsTicket || new Date(cscsTicket.expiryDate) < anchorDate;
              }
              const isAssignActive = activeWorkerToAssign?.id === worker.id;

              return (
                <div
                  key={worker.id}
                  onClick={() => setSelectedWorkerDetailsId(worker.id)}
                  className={`bg-[#1e1e1e] border rounded-2xl p-3.5 cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex flex-col justify-between space-y-3 border-[#2e2e2e] hover:border-brand-accent/50 ${isUnfit ? 'border-red-500/30 hover:border-red-500' : ''} ${isAssignActive ? 'bg-[#5C7285]/10' : ''}`}
                >
                  {/* Card Top: Avatar/Initials & Info */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center text-[10.5px] font-black uppercase border shrink-0 ${isUnfit ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-brand-accent/10 text-brand-accent border-brand-accent/20'}`}>
                          {worker.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <h4 className="text-[12.5px] font-black uppercase tracking-wider text-zinc-200">
                            {worker.name}
                          </h4>
                          <span className="text-[8px] font-black text-[#888] uppercase tracking-widest block mt-0.5">
                            {worker.role}
                          </span>
                        </div>
                      </div>
                      {isUnfit && (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-[7px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1 animate-pulse shrink-0">
                          <ShieldAlert className="w-2.5 h-2.5" />
                          UNFIT
                        </span>
                      )}
                    </div>

                    {/* Card Contact Details */}
                    <div className="space-y-1.5 text-xs text-zinc-400 border-t border-[#2e2e2e] pt-3">
                      {worker.phone && (
                        <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-[#aaa]">
                          <Phone className="w-3.5 h-3.5 text-[#666] shrink-0" />
                          <span>{worker.phone}</span>
                        </div>
                      )}
                      {worker.email && (
                        <div className="flex items-center space-x-2 text-[9.5px] font-bold tracking-wide text-[#888]">
                          <Mail className="w-3.5 h-3.5 text-[#666] shrink-0" />
                          <span className="truncate" title={worker.email}>{worker.email}</span>
                        </div>
                      )}
                      {!worker.phone && !worker.email && (
                        <span className="text-[9px] font-bold text-[#555] uppercase tracking-widest block">- No Contact Info -</span>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom: Compliance Tickets */}
                  <div className="border-t border-[#2e2e2e] pt-3">
                    <p className="text-[8px] font-black uppercase tracking-[0.15em] text-[#666] mb-2">Compliance Dossier</p>
                    <div className="flex flex-wrap gap-1.5">
                      {worker.tickets && worker.tickets.length > 0 ? (
                        worker.tickets.map(ticket => {
                          const status = getTicketStatus(ticket);
                          let colorClasses = '';
                          if (status === 'EXPIRED') {
                            colorClasses = 'bg-red-500/10 border-red-500/30 text-red-400';
                          } else if (status === 'EXPIRING_SOON') {
                            colorClasses = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
                          } else {
                            colorClasses = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
                          }
                          return (
                            <span
                              key={ticket.id}
                              className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider border ${colorClasses}`}
                            >
                              {ticket.type} &bull; {ticket.expiryDate}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[7.5px] font-black text-zinc-600 uppercase tracking-widest">No Active Tickets</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Slide-out Drawer Panel for Staff Details / Edit */}
      {selectedWorkerDetails && (
        <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setSelectedWorkerDetailsId(null);
              setWorkerToEdit(null);
            }}
          />
          
          {/* Drawer Panel container */}
          <div className="relative w-full max-w-lg bg-[#18181b] border-l border-zinc-800 h-full overflow-hidden z-10 shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right">
            {/* Drawer Header */}
            <div className="px-4 py-3.5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0 sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
              <div className="flex items-center space-x-3.5">
                <button
                  onClick={() => {
                    setSelectedWorkerDetailsId(null);
                    setWorkerToEdit(null);
                  }}
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Close Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    {workerToEdit ? 'Edit Staff Profile' : 'Staff Dossier'}
                  </h3>
                  <p className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest mt-0.5">
                    {selectedWorkerDetails.name}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                {!workerToEdit ? (
                  <>
                    <button
                      onClick={() => {
                        setWorkerToEdit(selectedWorkerDetails);
                        setEditName(selectedWorkerDetails.name);
                        setEditRole(selectedWorkerDetails.role);
                        setEditPhone(selectedWorkerDetails.phone || '');
                        setEditEmail(selectedWorkerDetails.email || '');
                        setEditPostcode(selectedWorkerDetails.postcode || '');
                        setEditTickets([...selectedWorkerDetails.tickets]);
                        setEditError(null);
                      }}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-zinc-300 hover:text-white text-[9px] font-black uppercase tracking-widest rounded transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5 text-brand-accent" />
                      <span>Edit</span>
                    </button>
                    {selectedWorkerDetails.isArchived ? (
                      <>
                        <button
                          onClick={() => setSelectedWorkerToRestore(selectedWorkerDetails)}
                          className="px-3 py-1.5 bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-900/30 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded transition-all cursor-pointer"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => setSelectedWorkerToPermanentDelete(selectedWorkerDetails)}
                          className="px-3 py-1.5 bg-red-950/30 hover:bg-red-950/60 border border-red-900/30 text-red-400 text-[9px] font-black uppercase tracking-widest rounded transition-all cursor-pointer"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setSelectedWorkerToDelete(selectedWorkerDetails)}
                        className="px-3 py-1.5 bg-red-950/30 hover:bg-red-950/60 border border-red-900/30 text-red-400 text-[9px] font-black uppercase tracking-widest rounded transition-all cursor-pointer"
                      >
                        Archive
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => setWorkerToEdit(null)}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-zinc-400 hover:text-white text-[9px] font-black uppercase tracking-widest rounded transition-all cursor-pointer"
                  >
                    Back to Dossier
                  </button>
                )}
              </div>
            </div>

            {/* Scroll Body */}
            <div className="p-4 flex-grow overflow-y-auto">
              {workerToEdit ? renderEditForm() : renderDetailsDossier()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
