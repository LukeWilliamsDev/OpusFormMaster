import React, { useState } from 'react';
import { 
  Users, Search, Plus, Trash2, ShieldAlert, X, Phone, FileText, UploadCloud, Download, FilePlus, UserCheck, AlertTriangle, UserPlus, Calendar, MapPin, ChevronLeft, Edit
} from 'lucide-react';
import { Worker, Ticket, Job } from '../types/erp';
import { getTicketStatus } from '../utils/workerValidation';
import { TicketStatusBadge } from './TicketStatusBadge';

interface RosterViewProps {
  workers: Worker[];
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  activeWorkerToAssign: Worker | null;
  setActiveWorkerToAssign: (w: Worker | null) => void;
  setShifts: React.Dispatch<React.SetStateAction<any[]>>;
  shifts?: any[];
  jobs?: Job[];
}

export const RosterView: React.FC<RosterViewProps> = ({ 
  workers, 
  setWorkers, 
  activeWorkerToAssign, 
  setActiveWorkerToAssign,
  setShifts,
  shifts = [],
  jobs = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [showAddWorkerForm, setShowAddWorkerForm] = useState(false);
  
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerRole, setNewWorkerRole] = useState<'Supervisor' | 'Operative' | 'Telehandler' | 'Groundworker'>('Operative');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [newTicketType, setNewTicketType] = useState('CSCS');
  const [newTicketExpiry, setNewTicketExpiry] = useState('2027-12-31');
  const [formError, setFormError] = useState<string | null>(null);
  
  const [selectedWorkerDetailsId, setSelectedWorkerDetailsId] = useState<string | null>(null);
  const [selectedWorkerToDelete, setSelectedWorkerToDelete] = useState<Worker | null>(null);
  const [selectedDocToDelete, setSelectedDocToDelete] = useState<{ id: string; name: string } | null>(null);
  
  const [workerToEdit, setWorkerToEdit] = useState<Worker | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'Supervisor' | 'Operative' | 'Telehandler' | 'Groundworker'>('Operative');
  const [editPhone, setEditPhone] = useState('');
  const [editTickets, setEditTickets] = useState<Ticket[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  
  const handleAddWorkerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newWorkerName.trim()) {
      setFormError('Please enter worker name');
      return;
    }

    const newId = `worker-${Date.now()}`;
    const tickets: Ticket[] = [
      {
        id: `t-${Date.now()}-1`,
        type: newTicketType,
        expiryDate: newTicketExpiry,
        ticketNumber: `OP-${Math.floor(100000 + Math.random() * 900000)}`
      }
    ];

    if (newWorkerRole === 'Supervisor' && newTicketType !== 'CSCS') {
      tickets.push({
        id: `t-${Date.now()}-2`,
        type: 'CSCS',
        expiryDate: '2028-12-31',
        ticketNumber: `CSCS-${Math.floor(100000 + Math.random() * 900000)}`
      });
    } else if (newWorkerRole === 'Telehandler' && newTicketType !== 'CSCS') {
      tickets.push({
        id: `t-${Date.now()}-2`,
        type: 'CSCS',
        expiryDate: '2028-12-31',
        ticketNumber: `CSCS-${Math.floor(100000 + Math.random() * 900000)}`
      });
    }

    const createdWorker: Worker = {
      id: newId,
      name: newWorkerName,
      role: newWorkerRole,
      phone: newWorkerPhone.trim() || undefined,
      tickets,
      uploadedCertificates: []
    };

    setWorkers(prev => [createdWorker, ...prev]);
    setSelectedWorkerDetailsId(newId);
    
    // Reset form
    setNewWorkerName('');
    setNewWorkerPhone('');
    setShowAddWorkerForm(false);
  };

  const filteredWorkersList = workers.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          w.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRoleFilter === 'ALL' || w.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  const selectedWorkerDetails = workers.find(w => w.id === selectedWorkerDetailsId) || null;
  const anchorDate = new Date('2026-07-05');

  if (selectedWorkerDetails) {
    const workerShifts = (shifts || []).filter(s => s.workerId === selectedWorkerDetails.id && !s.isRemoved);
    
    const groupedShifts = workerShifts.reduce((acc, shift) => {
      if (!acc[shift.jobId]) {
        acc[shift.jobId] = [];
      }
      acc[shift.jobId].push(shift.date);
      return acc;
    }, {} as Record<string, string[]>);

    Object.keys(groupedShifts).forEach(jobId => {
      groupedShifts[jobId].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    });

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

    return (
      <div className="space-y-4">
        {/* Dossier Header */}
        <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl shadow-2xl overflow-hidden">
          {/* Top navigation row */}
          <div className="p-4 sm:px-6 bg-[#161616] border-b border-[#2a2a2a] flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={() => setSelectedWorkerDetailsId(null)}
              className="px-3.5 py-2 bg-[#222] hover:bg-[#2c2c2c] border border-[#333] hover:border-[#444] text-[#ccc] hover:text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4 text-brand-accent" />
              <span>Back to Roster</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setWorkerToEdit(selectedWorkerDetails);
                  setEditName(selectedWorkerDetails.name);
                  setEditRole(selectedWorkerDetails.role);
                  setEditPhone(selectedWorkerDetails.phone || '');
                  setEditTickets([...selectedWorkerDetails.tickets]);
                  setEditError(null);
                }}
                className="px-3.5 py-2 bg-[#2a2a2a] hover:bg-[#333] border border-[#3e3e3e] hover:border-[#555] text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 shadow-sm"
              >
                <Edit className="w-3.5 h-3.5 text-brand-accent" />
                <span>Edit Dossier</span>
              </button>

              <button
                onClick={() => setSelectedWorkerToDelete(selectedWorkerDetails)}
                className="px-3.5 py-2 bg-red-950/25 hover:bg-red-950/60 text-red-400/80 hover:text-red-400 rounded-lg transition-all border border-red-900/30 hover:border-red-900/60 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                title="Remove from roster"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Worker</span>
              </button>
            </div>
          </div>

          {/* Main header title row */}
          <div className="p-5 sm:p-8 border-b border-[#2e2e2e] bg-[#1a1a1a]/40">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#2a2a2a] border border-[#383838] flex items-center justify-center text-[#5C7285] shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-archivo">
                  {selectedWorkerDetails.name} <span className="text-[#5C7285] font-normal lowercase italic text-base sm:text-lg ml-1">profile</span>
                </h2>
                <div className="text-[10px] font-black text-[#888] uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                  <span className="text-brand-accent">{selectedWorkerDetails.role}</span>
                  <span className="text-white/10">•</span>
                  <span>Compliance Dossier</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact & Phone details */}
            <div className="space-y-3 bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#888]">
                <Phone className="w-4 h-4 text-[#5C7285]" />
                Contact & Phone Details
              </div>
              {selectedWorkerDetails.phone ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#222] p-4 rounded-lg border border-[#333] w-full">
                  <div className="text-lg font-black text-white tracking-widest">
                    {selectedWorkerDetails.phone}
                  </div>
                  <a
                    href={`tel:${selectedWorkerDetails.phone}`}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/15"
                  >
                    <Phone className="w-3.5 h-3.5 animate-pulse" />
                    <span>Call Directly</span>
                  </a>
                </div>
              ) : (
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] p-3 bg-[#222] rounded-lg border border-[#333] w-full text-center">
                  No phone number registered
                </div>
              )}
            </div>

            {/* Safety Tickets summary inside detail view */}
            <div className="space-y-3 bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#888]">
                <ShieldAlert className="w-4 h-4 text-[#5C7285]" />
                Compliance Status
              </div>
              <div className="space-y-2">
                {selectedWorkerDetails.tickets.map(ticket => (
                  <div key={ticket.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-[#333] bg-[#222] gap-3">
                    <div className="flex flex-col space-y-1">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{ticket.type} Ticket</span>
                      <span className="text-[8.5px] font-bold text-[#666] uppercase tracking-widest">
                        Ref: {ticket.ticketNumber || 'N/A'} &bull; Exp: {ticket.expiryDate}
                      </span>
                    </div>
                    <TicketStatusBadge ticket={ticket} />
                  </div>
                ))}
              </div>
            </div>

            {/* Active Deployments / Sites Section */}
            <div className="lg:col-span-2 space-y-4 bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#888]">
                <Calendar className="w-4.5 h-4.5 text-[#5C7285]" />
                Active Site Deployments
              </div>
              {Object.keys(groupedShifts).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(groupedShifts).map(([jobId, shiftDates]) => {
                    const job = (jobs || []).find(j => j.id === jobId);
                    if (!job) return null;
                    return (
                      <div key={jobId} className="p-4 rounded-xl border border-[#333] bg-[#1e1e1e] hover:border-[#5C7285]/50 transition-colors space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#5C7285]" />
                              {job.siteName}
                            </h4>
                            <p className="text-[9px] font-bold text-[#666] uppercase tracking-widest leading-none">
                              Contractor: {job.mainContractor} &bull; Ref: {job.jobRef}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${
                            job.status === 'active' || job.status === 'in-progress'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-[#252525] border-[#333] text-[#888]'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                        
                        <div className="pt-2.5 border-t border-[#333] space-y-2">
                          <span className="text-[10px] font-black text-[#888] uppercase tracking-wider">Deployed Days</span>
                          <div className="flex flex-wrap gap-1.5">
                            {(shiftDates as string[]).map(dateStr => (
                              <span key={dateStr} className="px-2.5 py-1 rounded-md bg-[#262626] border border-[#3a3a3a] text-[11px] font-bold text-white tracking-wide font-sans shadow-sm transition-colors hover:bg-[#303030]">
                                {getDayName(dateStr)}
                              </span>
                            ))}
                          </div>
                        </div>

                        {job.postcode && (
                          <div className="text-[8.5px] font-black text-[#5C7285] uppercase tracking-widest flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.postcode}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 border border-dashed border-[#333] rounded-xl text-[10px] font-black uppercase tracking-widest text-[#555] bg-[#1a1a1a]">
                  <Calendar className="w-7 h-7 text-[#333] mx-auto mb-2" />
                  No active site assignments found for this staff member
                </div>
              )}
            </div>

            {/* Document Management Section */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b border-[#333] pb-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#888]">
                  <UploadCloud className="w-4 h-4 text-[#5C7285]" />
                  Uploaded Documents & Proofs
                </div>
                
                {/* Simulated file upload button */}
                <button
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

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {selectedWorkerDetails.uploadedCertificates && selectedWorkerDetails.uploadedCertificates.length > 0 ? (
                  selectedWorkerDetails.uploadedCertificates.map(cert => (
                    <div key={cert.id} className="p-4 rounded-xl border border-[#333] bg-[#1a1a1a] flex flex-col space-y-4 hover:border-[#5C7285] transition-colors group">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-lg bg-[#252525] text-[#5C7285] border border-[#333] group-hover:bg-[#5C7285]/10 transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-white uppercase tracking-widest truncate" title={cert.name}>
                            {cert.name}
                          </p>
                          <p className="text-[8.5px] font-bold text-[#666] uppercase tracking-widest mt-0.5">
                            Added: {cert.uploadedAt}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 py-1.5 rounded bg-[#222] border border-[#333] hover:bg-[#333] hover:text-white text-[9px] font-black uppercase tracking-widest text-[#888] flex justify-center items-center gap-1 transition-colors">
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                        <button 
                          onClick={() => setSelectedDocToDelete({ id: cert.id, name: cert.name })}
                          className="px-2.5 py-1.5 rounded bg-[#222] border border-[#333] hover:bg-red-950 hover:border-red-900/50 hover:text-red-400 text-[9px] font-black uppercase tracking-widest text-[#888] flex justify-center items-center transition-colors"
                          title="Delete File"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 border border-dashed border-[#333] rounded-xl text-[10px] font-black uppercase tracking-widest text-[#555] bg-[#1a1a1a]">
                    <UploadCloud className="w-8 h-8 text-[#444] mx-auto mb-3" />
                    No compliance certificates uploaded
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {selectedWorkerToDelete && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 text-left">
              <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setSelectedWorkerToDelete(null)} />
              <div className="bg-[#222428] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 pb-4 border-b border-white/5 bg-white/[0.01] flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Purge Staff Profile</h3>
                    <p className="text-[8px] font-semibold text-white/30 uppercase tracking-widest mt-0.5">Permanent Database Deletion</p>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <p className="text-sm font-medium text-white/80 leading-relaxed">
                    Are you absolutely sure you want to permanently delete the profile of <span className="font-bold text-white">{selectedWorkerToDelete.name}</span> (<span className="text-brand-accent">{selectedWorkerToDelete.role}</span>)?
                  </p>
                  <div className="p-4 bg-white/5 border border-white/5 rounded-lg text-xs font-medium text-red-400 leading-relaxed">
                    This action is irreversible and will permanently delete this record from the roster, compliance logs, and scheduled shifts.
                  </div>
                </div>

                <div className="p-6 bg-white/[0.01] border-t border-white/5 flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedWorkerToDelete(null)}
                    className="flex-1 py-3.5 border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-all rounded text-[9px] font-black uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setWorkers(prev => prev.filter(w => w.id !== selectedWorkerToDelete.id));
                      setShifts(prev => prev.filter(s => s.workerId !== selectedWorkerToDelete.id));
                      setSelectedWorkerDetailsId(null);
                      setSelectedWorkerToDelete(null);
                    }}
                    className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white transition-all rounded text-[9px] font-black uppercase tracking-widest shadow-lg shadow-red-600/10"
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Dossier Modal */}
          {workerToEdit && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 text-left">
              <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setWorkerToEdit(null)} />
              <div className="bg-[#222428] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  setEditError(null);
                  if (!editName.trim()) {
                    setEditError('Please enter worker name');
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
                    tickets: editTickets
                  };

                  setWorkers(prev => prev.map(w => w.id === workerToEdit.id ? updatedWorker : w));
                  setWorkerToEdit(null);
                }} className="space-y-0">
                  <div className="p-6 pb-4 border-b border-white/5 bg-white/[0.01] flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-full bg-brand-accent/10 flex items-center justify-center shrink-0">
                      <Edit className="w-5 h-5 text-brand-accent" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Edit Staff Dossier</h3>
                      <p className="text-[8px] font-semibold text-white/30 uppercase tracking-widest mt-0.5">Modify Worker & Compliance Data</p>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {editError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs font-semibold uppercase tracking-wider">
                        {editError}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-[#888]">Worker Full Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-[#333] hover:border-[#444] focus:border-brand-accent rounded-lg px-3.5 py-2.5 text-xs text-white uppercase font-black tracking-wider transition-colors outline-none"
                        placeholder="e.g. John Doe"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-[#888]">Roster Role</label>
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as any)}
                          className="w-full bg-[#1a1a1a] border border-[#333] focus:border-brand-accent rounded-lg px-3 py-2.5 text-xs text-white uppercase font-black tracking-wider transition-colors outline-none"
                        >
                          <option value="Operative">Operative</option>
                          <option value="Supervisor">Supervisor</option>
                          <option value="Telehandler">Telehandler</option>
                          <option value="Groundworker">Groundworker</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-[#888]">Phone / Contact Details</label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full bg-[#1a1a1a] border border-[#333] hover:border-[#444] focus:border-brand-accent rounded-lg px-3.5 py-2.5 text-xs text-white tracking-widest transition-colors outline-none"
                          placeholder="e.g. +44 7700 900456"
                        />
                      </div>
                    </div>

                    {/* Edit Tickets list */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between border-b border-[#333] pb-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#888]">Compliance & Safety Tickets</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditTickets(prev => [
                              ...prev,
                              {
                                id: `t-edit-${Date.now()}`,
                                type: 'CSCS',
                                expiryDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
                                ticketNumber: `OP-${Math.floor(100000 + Math.random() * 900000)}`
                              }
                            ]);
                          }}
                          className="text-[9px] font-black uppercase tracking-widest text-brand-accent hover:text-brand-accent/80 transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Ticket
                        </button>
                      </div>

                      {editTickets.length === 0 ? (
                        <div className="text-center py-4 text-[#555] text-[10px] font-bold uppercase tracking-widest bg-black/10 border border-dashed border-[#333] rounded-lg">
                          No compliance tickets added
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                          {editTickets.map((ticket, index) => (
                            <div key={ticket.id} className="p-3 bg-[#1e1e1e] border border-[#333] rounded-lg space-y-2 relative">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditTickets(prev => prev.filter(t => t.id !== ticket.id));
                                }}
                                className="absolute top-2 right-2 text-[#555] hover:text-red-400 transition-colors"
                                title="Remove ticket"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-6">
                                <div className="space-y-1">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-[#666]">Ticket Type / Scheme</label>
                                  <input
                                    type="text"
                                    value={ticket.type}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditTickets(prev => prev.map((t, idx) => idx === index ? { ...t, type: val } : t));
                                    }}
                                    className="w-full bg-[#151515] border border-[#2a2a2a] focus:border-brand-accent rounded px-2 py-1 text-[10px] text-white uppercase font-black tracking-wider outline-none"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-[#666]">Ticket Reference No.</label>
                                  <input
                                    type="text"
                                    value={ticket.ticketNumber || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditTickets(prev => prev.map((t, idx) => idx === index ? { ...t, ticketNumber: val } : t));
                                    }}
                                    className="w-full bg-[#151515] border border-[#2a2a2a] focus:border-brand-accent rounded px-2 py-1 text-[10px] text-white uppercase font-black tracking-wider outline-none"
                                  />
                                </div>

                                <div className="space-y-1 sm:col-span-2">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-[#666]">Expiration Date</label>
                                  <input
                                    type="date"
                                    value={ticket.expiryDate}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditTickets(prev => prev.map((t, idx) => idx === index ? { ...t, expiryDate: val } : t));
                                    }}
                                    className="w-full bg-[#151515] border border-[#2a2a2a] focus:border-brand-accent rounded px-2 py-1 text-[10px] text-white outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 bg-white/[0.01] border-t border-white/5 flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setWorkerToEdit(null)}
                      className="flex-1 py-3.5 border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-all rounded text-[9px] font-black uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3.5 bg-brand-accent hover:bg-brand-accent/80 text-white transition-all rounded text-[9px] font-black uppercase tracking-widest shadow-lg shadow-brand-accent/10"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Document Confirmation Modal */}
          {selectedDocToDelete && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 text-left">
              <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setSelectedDocToDelete(null)} />
              <div className="bg-[#222428] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 pb-4 border-b border-white/5 bg-white/[0.01] flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Purge Document</h3>
                    <p className="text-[8px] font-semibold text-white/30 uppercase tracking-widest mt-0.5">Permanent File Deletion</p>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <p className="text-sm font-medium text-white/80 leading-relaxed">
                    Are you absolutely sure you want to permanently delete the document <span className="font-bold text-white">{selectedDocToDelete.name}</span> from <span className="text-brand-accent">{selectedWorkerDetails.name}</span>'s compliance dossier?
                  </p>
                  <div className="p-4 bg-white/5 border border-white/5 rounded-lg text-xs font-medium text-red-400 leading-relaxed">
                    This action is irreversible and will permanently delete this record from the system storage.
                  </div>
                </div>

                <div className="p-6 bg-white/[0.01] border-t border-white/5 flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedDocToDelete(null)}
                    className="flex-1 py-3.5 border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-all rounded text-[9px] font-black uppercase tracking-widest"
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
                    className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white transition-all rounded text-[9px] font-black uppercase tracking-widest shadow-lg shadow-red-600/10"
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

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
            placeholder="Search staff by name or role..."
            className="w-full bg-[#1e1e1e] border border-[#333] text-sm text-white rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-[#5C7285] transition-colors placeholder:text-[#555] shadow-inner"
          />
        </div>
        <button
          onClick={() => setShowAddWorkerForm(!showAddWorkerForm)}
          className="px-5 py-3 bg-[#5C7285] hover:bg-[#6c8295] text-white rounded-xl transition-all shadow-lg shadow-[#5C7285]/20 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest whitespace-nowrap"
        >
          {showAddWorkerForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddWorkerForm ? 'Cancel Registration' : 'Register Staff'}
        </button>
      </div>

      {/* Role Filter Badges */}
      <div className="flex flex-wrap gap-2">
        {['ALL', 'Supervisor', 'Operative', 'Telehandler', 'Groundworker'].map(role => (
          <button
            key={role}
            onClick={() => setSelectedRoleFilter(role)}
            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
              selectedRoleFilter === role 
                ? 'bg-[#5C7285] border-[#5C7285] text-white shadow-md' 
                : 'bg-[#1e1e1e] border-[#333] text-[#888] hover:bg-[#252525] hover:text-white'
            }`}
          >
            {role}
          </button>
        ))}
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
                placeholder="e.g. +44 7700 900123"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-[#5C7285] transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#888]">Role</label>
              <select
                value={newWorkerRole}
                onChange={(e) => setNewWorkerRole(e.target.value as any)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2.5 text-[11px] font-bold tracking-widest text-white uppercase outline-none focus:border-[#5C7285] transition-colors appearance-none"
              >
                <option value="Operative">Operative</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Telehandler">Telehandler</option>
                <option value="Groundworker">Groundworker</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#888]">Primary Ticket</label>
              <div className="flex gap-3">
                <select
                  value={newTicketType}
                  onChange={(e) => setNewTicketType(e.target.value)}
                  className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2.5 text-[11px] font-bold tracking-widest text-white uppercase outline-none focus:border-[#5C7285] transition-colors appearance-none"
                >
                  <option value="CSCS">CSCS Card</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Telehandler">Telehandler</option>
                </select>
                <input
                  type="date"
                  value={newTicketExpiry}
                  onChange={(e) => setNewTicketExpiry(e.target.value)}
                  className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2.5 text-[11px] font-bold tracking-widest text-white uppercase outline-none focus:border-[#5C7285] transition-colors"
                />
              </div>
            </div>
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

      {/* Staff Roster Table */}
      <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-2xl">
        <div className="hidden md:grid md:grid-cols-[2fr_1.5fr_2fr_100px] gap-4 px-6 py-4 border-b border-[#2e2e2e] bg-[#222]">
          <span className="text-[9px] font-black tracking-widest uppercase text-[#888]">Staff Details</span>
          <span className="text-[9px] font-black tracking-widest uppercase text-[#888]">Contact</span>
          <span className="text-[9px] font-black tracking-widest uppercase text-[#888]">Compliance & Tickets</span>
          <span className="text-[9px] font-black tracking-widest uppercase text-[#888] text-right">Actions</span>
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
              const cscsTicket = worker.tickets.find(t => t.type === 'CSCS');
              const isCscsExpired = cscsTicket ? new Date(cscsTicket.expiryDate) < anchorDate : true;
              const isAssignActive = activeWorkerToAssign?.id === worker.id;

              return (
                <div 
                  key={worker.id}
                  className={`flex flex-col md:grid md:grid-cols-[2fr_1.5fr_2fr_100px] gap-4 px-6 py-5 items-center hover:bg-[#242424] transition-colors duration-150 ${isAssignActive ? 'bg-[#5C7285]/10' : ''}`}
                >
                  {/* Staff Details */}
                  <div className="flex flex-col space-y-1.5 w-full md:w-auto">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-black uppercase tracking-wider ${isCscsExpired ? 'text-red-400 line-through' : 'text-white'}`}>
                        {worker.name}
                      </span>
                      {isCscsExpired && (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-[7px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1">
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
                  <div className="flex items-center w-full md:w-auto text-[#aaa]">
                    {worker.phone ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                        <Phone className="w-3.5 h-3.5 text-[#555]" />
                        {worker.phone}
                      </div>
                    ) : (
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

                  {/* Actions */}
                  <div className="flex items-center justify-end w-full gap-2 border-t border-[#333] pt-4 md:pt-0 md:border-0">
                    <button
                      onClick={() => setSelectedWorkerDetailsId(worker.id)}
                      className="w-full md:w-auto text-center px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#333] text-[#888] hover:text-white rounded-lg transition-colors border border-[#333] text-[9px] font-black uppercase tracking-widest"
                    >
                      Dossier
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
