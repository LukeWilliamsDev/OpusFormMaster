// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, Trash2, ShieldAlert, X, Phone, Mail, FileText, UploadCloud, Download, FilePlus, UserCheck, AlertTriangle, UserPlus, Calendar, MapPin, ChevronLeft, Edit, Send, LayoutGrid, List, RefreshCw, CheckCircle2, Clock, Link2, Copy, Menu
} from 'lucide-react';
import { Worker, Ticket, Job } from '../types/erp';
import { getTicketStatus } from '../utils/workerValidation';
import { isValidUKPostcode } from '../utils/geo';
import { TicketStatusBadge } from './TicketStatusBadge';
import { RequestCredentialsModal } from './RequestCredentialsModal';
import { supabase } from '../../integrations/supabase/client';
import { computeDiff } from '../utils/auditDiff';
import { AuditDiffTable } from './AuditDiffTable';

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
  
  const [workerToEdit, setWorkerToEdit] = useState<Worker | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<string>('Concrete Operative');

  const [rosterMode, setRosterMode] = useState<'active' | 'archived'>('active');
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

    // If a staff member is selected, log an INSPECT action to the audit logs
    if (selectedWorkerDetailsId) {
      // Fetch the authenticated user email from Supabase to dynamically log the actor
      supabase.auth.getUser().then(({ data: { user } }) => {
        supabase.rpc('log_anonymous_audit', {
          p_user_email: user?.email || 'admin@opusform.co.uk',
          p_action: 'INSPECT',
          p_target_type: 'staff',
          p_target_id: selectedWorkerDetailsId,
          p_details: { inspected: true }
        }).catch(err => console.error('Failed to log INSPECT audit event:', err));
      });
    }
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

  const renderMobileWorkerCard = (worker: Worker) => {
    const expiredCount = worker.tickets?.filter(t => getTicketStatus(t) === 'EXPIRED').length || 0;
    const expiringCount = worker.tickets?.filter(t => getTicketStatus(t) === 'EXPIRING_SOON').length || 0;
    const ticketCount = worker.tickets?.length || 0;

    let statusText = 'ALL CLEAR';
    let badgeColorClasses = 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold';
    let avatarBorderColorClasses = 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5';
    if (expiredCount > 0) {
      statusText = `${expiredCount} EXPIRED`;
      badgeColorClasses = 'bg-red-500/20 border border-red-500/30 text-red-400 font-bold';
      avatarBorderColorClasses = 'border-red-500/30 text-red-400 bg-red-500/5';
    } else if (expiringCount > 0) {
      statusText = 'EXPIRING';
      badgeColorClasses = 'bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold';
      avatarBorderColorClasses = 'border-amber-500/30 text-amber-400 bg-amber-500/5';
    }

    const nameParts = worker.name.split(' ');
    const initials = nameParts.length > 1 
      ? `${nameParts[0][0]}${nameParts[1][0]}` 
      : `${nameParts[0][0] || ''}`;

    return (
      <div
        key={worker.id}
        onClick={() => setSelectedWorkerDetailsId(worker.id)}
        className="bg-[#151518] hover:bg-[#1a1a1e] border border-[#232326] rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all duration-150"
      >
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className={`w-11 h-11 rounded-full border flex items-center justify-center font-bold text-[13px] tracking-wide shrink-0 ${avatarBorderColorClasses}`}>
            {initials.toUpperCase()}
          </div>
          <div className="min-w-0">
            <h4 className="text-[14.5px] font-black text-white tracking-wide truncate">
              {worker.name}
            </h4>
            <span className="text-[11.5px] text-zinc-400 font-medium block mt-0.5">
              {worker.role}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0 space-y-1">
          <span className={`px-2 py-0.5 rounded text-[8.5px] font-black tracking-wider uppercase ${badgeColorClasses}`}>
            {statusText}
          </span>
          <span className="text-[10px] text-zinc-500 font-bold tracking-wide">
            {ticketCount} {ticketCount === 1 ? 'ticket' : 'tickets'}
          </span>
        </div>
      </div>
    );
  };

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

          // Save to Supabase to trigger automatic audit log capturing
          supabase
            .from('staff')
            .update({
              name: updatedWorker.name,
              role: updatedWorker.role,
              phone: updatedWorker.phone,
              email: updatedWorker.email,
              postcode: updatedWorker.postcode,
              tickets: updatedWorker.tickets
            })
            .eq('id', workerToEdit.id)
            .then(({ error }) => {
              if (error) {
                console.error('Failed to persist staff changes to Supabase:', error);
                // Trigger alert on DB failure
                alert('Failed to save staff changes. Please try again.');
              } else {
                // Update UI state and close modal only after successful persistence
                setWorkers(prev => prev.map(w => w.id === workerToEdit.id ? updatedWorker : w));
                setWorkerToEdit(null);
              }
            });
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
        {/* Tab Buttons */}
        <div className="flex border-b border-zinc-800 pb-0 gap-6 mb-4">
          <button
            type="button"
            onClick={() => setActiveDossierTab('general')}
            className={`pb-3 text-[10px] font-black uppercase tracking-[0.15em] border-b-2 transition-all cursor-pointer ${
              activeDossierTab === 'general'
                ? 'border-brand-accent text-white'
                : 'border-transparent text-[#666] hover:text-white'
            }`}
          >
            Compliance
          </button>
          <button
            type="button"
            onClick={() => setActiveDossierTab('assignments')}
            className={`pb-3 text-[10px] font-black uppercase tracking-[0.15em] border-b-2 transition-all cursor-pointer ${
              activeDossierTab === 'assignments'
                ? 'border-brand-accent text-white'
                : 'border-transparent text-[#666] hover:text-white'
            }`}
          >
            Site Assignments
          </button>
          <button
            type="button"
            onClick={() => setActiveDossierTab('audit_log')}
            className={`pb-3 text-[10px] font-black uppercase tracking-[0.15em] border-b-2 transition-all cursor-pointer ${
              activeDossierTab === 'audit_log'
                ? 'border-brand-accent text-white'
                : 'border-transparent text-[#666] hover:text-white'
            }`}
          >
            Audit Log
          </button>
        </div>

        {/* Tab 1: Compliance */}
        {activeDossierTab === 'general' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {selectedWorkerDetails.tickets.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-[#2a2a2a] rounded-xl text-neutral-550 text-[10px] font-black uppercase tracking-widest">
                No compliance certificates or tickets registered
              </div>
            ) : (
              selectedWorkerDetails.tickets.map(ticket => {
                const status = getTicketStatus(ticket);
                const isPending = ticket.verified === false;
                const expiryDate = new Date(ticket.expiryDate);
                const isExpired = status === 'EXPIRED';
                const isExpiringSoon = status === 'EXPIRING_SOON';
                
                let cardBg = "bg-[#0e1612] border-[#1b2b22] hover:bg-[#121c17]";
                let iconBox = "border-[#1b2b22] bg-[#121c17] text-[#2ecc71]";
                let badgeClass = "bg-[#1b2b22] border-[#223d2e] text-[#2ecc71]";
                let statusText = "ACTIVE";
                let LeftIcon = CheckCircle2;

                if (isExpired) {
                  cardBg = "bg-[#1a0e0e] border-[#381c1c] hover:bg-[#201212]";
                  iconBox = "border-[#381c1c] bg-[#201212] text-[#e74c3c]";
                  badgeClass = "bg-[#381c1c] border-[#552727] text-[#e74c3c]";
                  statusText = "EXPIRED";
                  LeftIcon = ShieldAlert;
                } else if (isPending) {
                  cardBg = "bg-[#18140e] border-[#2d2215] hover:bg-[#1e1912]";
                  iconBox = "border-[#2d2215] bg-[#1e1912] text-[#f1c40f]";
                  badgeClass = "bg-[#2d2215] border-[#3e301d] text-[#f1c40f]";
                  statusText = "PENDING APPROVAL";
                  LeftIcon = Clock;
                } else if (isExpiringSoon) {
                  cardBg = "bg-[#1c160e] border-[#382a17] hover:bg-[#221c12]";
                  iconBox = "border-[#382a17] bg-[#221c12] text-[#e67e22]";
                  badgeClass = "bg-[#382a17] border-[#503d22] text-[#e67e22]";
                  LeftIcon = Clock;
                  
                  const anchorDate = new Date();
                  anchorDate.setHours(0,0,0,0);
                  const diffTime = expiryDate.getTime() - anchorDate.getTime();
                  const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                  statusText = `${diffDays} DAYS LEFT`;
                }

                const formattedDate = expiryDate.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <div key={ticket.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border gap-3 ${cardBg} transition-all duration-150`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${iconBox}`}>
                        <LeftIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">{ticket.type}</h4>
                          <span className={`px-1.5 py-0.5 text-[8px] font-black rounded uppercase tracking-wider border ${badgeClass}`}>
                            {statusText}
                          </span>
                        </div>
                        <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest mt-1">
                          Ref: {ticket.ticketNumber || 'N/A'} &bull; {isExpired ? 'Expired' : 'Expires'}: {formattedDate}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:justify-end">
                      {isExpired ? (
                        <button
                          type="button"
                          onClick={() => setShowReminderConfirm(true)}
                          className="w-full sm:w-auto px-3 py-1.5 bg-red-950/20 border border-red-900/30 hover:bg-red-950/40 text-red-400 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                        >
                          Request Update
                        </button>
                      ) : (
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => ticket.documentUrl ? handleViewDocument(ticket.documentUrl) : alert('No document attached')}
                            className="w-full sm:w-auto px-3 py-1.5 border border-zinc-800 hover:bg-zinc-800 text-white rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                          >
                            View File
                          </button>
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => verifyTicket(selectedWorkerDetails.id, ticket.id, true)}
                                className="w-full sm:w-auto px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => verifyTicket(selectedWorkerDetails.id, ticket.id, false)}
                                className="w-full sm:w-auto px-3 py-1.5 bg-[#4a1a1a] hover:bg-[#6b2121] text-[#ef4444] border border-[#6b2121] rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
        {/* Tab 2: Site Assignments */}
        {activeDossierTab === 'assignments' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Active Deployments */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                <Calendar className="h-4 w-4 text-[#facc15]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Active Site Deployments</h3>
              </div>
              {Object.keys(groupedShifts).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(groupedShifts).map(([jobId, shiftDates]) => {
                    const job = (jobs || []).find(j => j.id === jobId);
                    if (!job) return null;
                    return (
                      <div key={jobId} className="p-3 rounded-lg border border-[#2a2a2a] bg-[#151518]/60 hover:bg-[#1a1a1e] hover:border-zinc-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-[#facc15]" />
                            {job.siteName}
                          </h4>
                          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none mt-0.5">
                            Contractor: {job.mainContractor} &bull; Ref: {job.jobRef} &bull; Postcode: {job.postcode || 'N/A'}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(shiftDates as string[]).map(dateStr => (
                            <span key={dateStr} className="px-2 py-0.5 rounded bg-[#202024] border border-[#2d2d33] text-[9px] font-bold text-zinc-300 tracking-wide">
                              {getDayName(dateStr)}
                            </span>
                          ))}
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                            job.status === 'active' || job.status === 'in-progress'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-[#252525] border-[#333] text-white/50'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest py-2">No active site assignments found</p>
              )}
            </div>

            {/* Deployment History */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                <Clock className="h-4 w-4 text-zinc-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Deployment History</h3>
              </div>
              {Object.keys(groupedHistoryShifts).length > 0 ? (
                <div className="space-y-2">
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {(showAllHistory 
                      ? Object.entries(groupedHistoryShifts)
                      : Object.entries(groupedHistoryShifts).slice(0, 5)
                    ).map(([jobId, shiftDates]) => {
                      const job = (jobs || []).find(j => j.id === jobId);
                      if (!job) return null;
                      return (
                        <div key={jobId} className="p-3 rounded-lg border border-[#222] bg-[#121214]/40 hover:bg-[#151518]/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-zinc-650" />
                              {job.siteName}
                            </h4>
                            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest leading-none mt-0.5">
                              Contractor: {job.mainContractor} &bull; Ref: {job.jobRef}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(shiftDates as string[]).map(dateStr => (
                              <span key={dateStr} className="px-2 py-0.5 rounded bg-[#1a1a1c] border border-zinc-900 text-[9px] font-bold text-zinc-500 tracking-wide">
                                {getDayName(dateStr)}
                              </span>
                            ))}
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-zinc-900 text-zinc-600">
                              Completed
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {Object.keys(groupedHistoryShifts).length > 5 && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAllHistory(!showAllHistory)}
                        className="text-[9px] font-black text-[#facc15] hover:text-[#eab308] uppercase tracking-widest px-3 py-1.5 rounded bg-[#151518] border border-[#232326] transition-all hover:bg-[#1c1c1c] active:scale-95"
                      >
                        {showAllHistory ? 'Show Less History' : `View All History (${Object.keys(groupedHistoryShifts).length} total)`}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest py-2">No completed or archived shifts found</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleCopyLink(selectedWorkerDetails.dossierUrl || '', 'dossier-link')}
                className="bg-[#151518] border border-[#232326] py-2.5 rounded-lg flex items-center justify-center gap-2 group hover:bg-[#1a1a1e] transition-colors cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5 text-zinc-400 group-hover:text-white" />
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Copy Dossier Link</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoadingDossierLogs(true);
                  setTimeout(() => setLoadingDossierLogs(false), 800);
                }}
                className="bg-[#151518] border border-[#232326] py-2.5 rounded-lg flex items-center justify-center gap-2 group hover:bg-[#1a1a1e] transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-zinc-400 group-hover:text-white" />
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Refresh Data</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Audit & Requests Log */}
        {activeDossierTab === 'audit_log' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-300">
                <FileText className="w-5 h-5 text-gray-400" />
                <h2>Compliance & Audit History Log</h2>
              </div>
              
              {loadingDossierLogs && (
                <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-[#facc15]" />
                  Syncing logs...
                </span>
              )}
            </div>

            {loadingDossierLogs && allEvents.length === 0 ? (
              <div className="text-center py-12 border border-[#2a2a2a] bg-[#1c1c1c] rounded-xl">
                <RefreshCw className="w-8 h-8 text-[#facc15]/60 animate-spin mx-auto mb-3" />
                <p className="text-[10px] font-black text-[#888] uppercase tracking-widest">Loading history log...</p>
              </div>
            ) : allEvents.length > 0 ? (
              <div className="space-y-4">
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
                      <article key={event.id} className="bg-[#151518]/40 rounded-lg p-3 border border-[#222] space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-2">
                            <div className="mt-0.5">
                              <Send className="h-4 w-4 text-[#facc15]" />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold uppercase tracking-wide text-white">Document Request Dispatched</h3>
                              <p className="text-[9px] font-semibold text-zinc-500 mt-0.5">{date} &bull; BY: {event.actor}</p>
                            </div>
                          </div>
                          <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded border tracking-wide ${
                            isCompleted
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : isExpired
                              ? 'bg-red-500/10 border-red-500/30 text-red-450'
                              : 'bg-[#2c2100] border-[#facc15]/20 text-[#ffd666]'
                          }`}>
                            {event.details?.status}
                          </span>
                        </div>

                        <div className="pt-1">
                          <h4 className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Requested Certifications</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {certs.map((c: string) => (
                              <span key={c} className="px-2.5 py-1 bg-[#202024] text-[10px] font-semibold text-zinc-300 rounded border border-[#2d2d33]">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5 text-[#facc15]">
                            <Clock className="h-3.5 w-3.5" />
                            <p className="text-[10px] font-bold">
                              {isPending ? (
                                `Expires: ${new Date(event.details?.expires_at).toLocaleString('en-GB')}`
                              ) : isCompleted ? (
                                `Completed: ${new Date(event.details?.completed_at).toLocaleString('en-GB')}`
                              ) : (
                                "Link Expired"
                              )}
                            </p>
                          </div>
                          
                          {isPending && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleCopyLink(event.details?.uploadUrl, event.id)}
                                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#202024] hover:bg-[#28282f] rounded text-[9px] font-bold uppercase border border-[#2d2d33] cursor-pointer text-white"
                              >
                                {copiedRequestId === event.id ? (
                                  <>
                                    <Check className="h-3 h-3 text-emerald-400" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 h-3 text-zinc-500" />
                                    <span>Copy Link</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResendRequest(req)}
                                disabled={resendingRequestMap[req.id]}
                                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#202024] hover:bg-[#28282f] rounded text-[9px] font-bold uppercase border border-[#2d2d33] disabled:opacity-50 cursor-pointer text-white"
                              >
                                {resendingRequestMap[req.id] ? (
                                  <RefreshCw className="h-3 h-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 h-3 text-zinc-500" />
                                )}
                                <span>Resend Email</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  } else {
                    let logIcon = <FileText className="w-3 h-3 text-zinc-500" />;
                    let logTitle = "System Action Logged";
                    let badgeColor = "bg-zinc-900/40 border-zinc-800 text-zinc-455 text-zinc-500";
                    
                    const action = event.action;
                    if (action === 'APPROVE_DOCUMENT') {
                      logIcon = <UserCheck className="w-3 h-3 text-emerald-400" />;
                      logTitle = "Compliance Document Approved";
                      badgeColor = "bg-emerald-950/20 border-emerald-900/30 text-emerald-400";
                    } else if (action === 'REJECT_DOCUMENT') {
                      logIcon = <X className="w-3 h-3 text-red-400" />;
                      logTitle = "Compliance Document Rejected/Purged";
                      badgeColor = "bg-red-950/20 border-red-900/30 text-red-400";
                    } else if (action === 'SUBMIT_DOCUMENTS') {
                      logIcon = <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />;
                      logTitle = "Operative Documents Uploaded";
                      badgeColor = "bg-emerald-950/20 border-emerald-900/30 text-emerald-400";
                    } else if (action === 'RESEND_DOCUMENT_REQUEST') {
                      logIcon = <RefreshCw className="w-3 h-3 text-brand-accent" />;
                      logTitle = "Document Request Link Renewed & Resent";
                      badgeColor = "bg-brand-accent/5 border-brand-accent/20 text-brand-accent";
                    } else if (action === 'CREATE' || action === 'UPDATE') {
                      logIcon = <Edit className="w-3 h-3 text-zinc-550 text-zinc-500" />;
                      logTitle = "Staff Profile Mutation Recorded";
                      badgeColor = "bg-zinc-900/40 border-zinc-800 text-zinc-400";
                    } else if (action === 'INSPECT') {
                      logIcon = <User className="w-3 h-3 text-blue-400" />;
                      logTitle = "Staff Dossier Inspected";
                      badgeColor = "bg-blue-950/20 border-blue-900/30 text-blue-400";
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
                    } else if (action === 'INSPECT') {
                      summaryText = "Staff dossier profile viewed by administrator";
                    } else {
                      summaryText = typeof event.details === 'string' ? event.details : JSON.stringify(event.details || {});
                    }

                    // Compute diff beforehand to selectively show the diff table or summary text
                    const diff = action === 'UPDATE' && event.details?.old
                      ? computeDiff(event.details.old, event.details.new)
                      : [];

                    return (
                      <div key={event.id} className="py-2 space-y-1 hover:bg-zinc-900/10 transition-colors px-1 rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2">
                            <div className="text-zinc-550 mt-0.5 shrink-0">
                              {logIcon}
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-black text-white uppercase tracking-widest">
                                {logTitle}
                              </p>
                              <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">
                                {date} &bull; By: {event.actor}
                              </p>
                            </div>
                          </div>
                          
                          <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${badgeColor}`}>
                            {action}
                          </span>
                        </div>

                        <div className="pl-5">
                          {/* Only render AuditDiffTable if there are non-empty changes in the diff */}
                          {diff.length > 0 ? (
                            <AuditDiffTable diff={diff} />
                          ) : summaryText ? (
                            <p className="text-[10px] font-bold text-zinc-400 font-sans leading-relaxed">
                              {summaryText}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  }
                })}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-900">
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


      </div>
    );
  };

  return (
    <div className="space-y-6">
      {selectedWorkerDetails ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Navigation Row */}
          <div className="flex items-center justify-between pb-4 mb-2">
            <button
              type="button"
              onClick={() => {
                setSelectedWorkerDetailsId(null);
                setWorkerToEdit(null);
              }}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-400" />
              <span>Back to Staff</span>
            </button>

            <div className="flex items-center gap-3">
              {!workerToEdit ? (
                <>
                  <button
                    type="button"
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
                    className="flex items-center gap-1.5 px-4 py-2 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-300 uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReminderConfirm(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#5c7285] hover:bg-[#6c8295] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border border-[#5c7285]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Request Docs</span>
                  </button>
                  {selectedWorkerDetails.isArchived ? (
                    <button
                      type="button"
                      onClick={() => setSelectedWorkerToRestore(selectedWorkerDetails)}
                      className="px-3 py-2 bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-900/30 text-emerald-450 text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedWorkerToDelete(selectedWorkerDetails)}
                      className="px-3 py-2 bg-red-950/30 hover:bg-red-950/60 border border-red-900/30 text-red-400 text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
                    >
                      Archive
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setWorkerToEdit(null)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
                >
                  Back to Dossier
                </button>
              )}
            </div>
          </div>

          {workerToEdit ? (
            <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-6 shadow-2xl">
              {renderEditForm()}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-zinc-900 pb-5">
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-full border border-[#1B4D3E] bg-[#0E2E25] flex items-center justify-center font-black text-sm text-[#2ECC71] shrink-0 uppercase tracking-widest font-archivo">
                    {(() => {
                      const nameParts = selectedWorkerDetails.name.split(' ');
                      return nameParts.length > 1 
                        ? `${nameParts[0][0]}${nameParts[1][0]}` 
                        : `${nameParts[0][0] || ''}`;
                    })().toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-white uppercase tracking-wider leading-tight">
                      {selectedWorkerDetails.name}
                    </h2>
                    <p className="text-[10px] font-bold text-zinc-500 mt-0.5 uppercase tracking-wide">
                      {selectedWorkerDetails.role} {selectedWorkerDetails.postcode ? `• ${selectedWorkerDetails.postcode}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 md:gap-6 shrink-0">
                  {selectedWorkerDetails.phone && (
                    <div className="flex flex-col md:items-end">
                      <span className="text-[8px] font-black text-zinc-650 uppercase tracking-widest">Phone</span>
                      <a href={`tel:${selectedWorkerDetails.phone}`} className="text-xs font-bold text-[#6C8295] hover:underline mt-0.5 tracking-wider font-mono">
                        {selectedWorkerDetails.phone}
                      </a>
                    </div>
                  )}
                  {selectedWorkerDetails.phone && selectedWorkerDetails.email && (
                    <div className="hidden md:block w-px h-6 bg-zinc-805 bg-zinc-800" />
                  )}
                  {selectedWorkerDetails.email && (
                    <div className="flex flex-col md:items-end">
                      <span className="text-[8px] font-black text-zinc-650 uppercase tracking-widest">Email</span>
                      <a href={`mailto:${selectedWorkerDetails.email}`} className="text-xs font-bold text-[#6C8295] hover:underline mt-0.5">
                        {selectedWorkerDetails.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Tab Content */}
              <div>
                {renderDetailsDossier()}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>

      {/* Mobile Top Header (Mockup style) */}
      <div className="flex md:hidden items-center justify-between bg-[#111113] border-b border-[#222] px-4 py-3.5 -mx-6 -mt-6 mb-4">
        <button className="text-zinc-400 hover:text-white transition-colors cursor-pointer">
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-black text-white uppercase tracking-widest">Staff</span>
        <button 
          onClick={() => setShowAddWorkerForm(!showAddWorkerForm)}
          className="p-1.5 bg-[#313c47] hover:bg-[#3d4c5a] text-[#8fa7be] rounded-lg transition-colors border border-[#404f5e]/40 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Search & Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex-1 max-w-xl relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#555]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by name, role, site..."
            className="w-full bg-[#111113] border border-[#232326] text-xs text-white rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-[#5C7285] transition-colors placeholder:text-[#555] shadow-inner font-medium tracking-wide"
          />
        </div>
        <div className="hidden md:flex items-center gap-3 w-full md:w-auto">
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
      <div className="flex items-center gap-3.5 mb-5 mt-2">
        <button
          type="button"
          onClick={() => setRosterMode('active')}
          className={`px-4 py-2 rounded-xl text-[11.5px] font-black uppercase tracking-wider transition-all duration-150 border cursor-pointer ${
            rosterMode === 'active' 
              ? 'bg-[#5C7285] border-[#5C7285] text-white' 
              : 'bg-[#151518]/60 border-[#232326] text-[#888] hover:text-white'
          }`}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => setRosterMode('archived')}
          className={`px-4 py-2 rounded-xl text-[11.5px] font-black uppercase tracking-wider transition-all duration-150 border cursor-pointer ${
            rosterMode === 'archived' 
              ? 'bg-amber-600 border-amber-600 text-white' 
              : 'bg-[#151518]/60 border-[#232326] text-[#888] hover:text-amber-500'
          }`}
        >
          Archived
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

      {/* Staff Roster Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredWorkersList.length === 0 ? (
          <div className="col-span-full bg-[#151518] border border-[#232326] rounded-2xl px-6 py-16 text-center">
            <Users className="w-10 h-10 text-[#444] mx-auto mb-4" />
            <div className="text-[11.5px] font-black uppercase tracking-widest text-[#666]">
              No matching staff found
            </div>
          </div>
        ) : (
          filteredWorkersList.map(worker => renderMobileWorkerCard(worker))
        )}
      </div>

        </>)}
    </div>
  );
};
