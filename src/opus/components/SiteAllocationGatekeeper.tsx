import React, { useState } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { Job, Worker } from '../types/erp';

interface SiteAllocationGatekeeperProps {
  job: Job;
  workers: Worker[];
  onUpdateJob: (updatedJob: Job) => void;
}

export const SiteAllocationGatekeeper: React.FC<SiteAllocationGatekeeperProps> = ({ job, workers, onUpdateJob }) => {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const workersList = workers;

  const assignedWorkerIds = job.assignedWorkers || [];
  const availableWorkers = workersList.filter(w => !assignedWorkerIds.includes(w.id));

  const anchorDate = new Date('2026-07-05');

  const validateWorkerDeployment = (worker: Worker): { isValid: boolean; reason: string | null } => {
    // 1. Must possess a valid, unexpired "CSCS" safety ticket
    const cscsTicket = worker.tickets.find(t => t.type === 'CSCS');
    if (!cscsTicket) {
      return { isValid: false, reason: `DEPLOYMENT BLOCKED: ${worker.name} lacks a CSCS safety ticket.` };
    }
    const cscsExp = new Date(cscsTicket.expiryDate);
    if (cscsExp < anchorDate) {
      return { isValid: false, reason: `DEPLOYMENT BLOCKED: ${worker.name}'s CSCS safety ticket expired on ${cscsTicket.expiryDate}.` };
    }

    // 2. Telehandler role demands active 'Telehandler' ticket
    if (worker.role === 'Telehandler') {
      const telTicket = worker.tickets.find(t => t.type === 'Telehandler');
      if (!telTicket) {
        return { isValid: false, reason: `DEPLOYMENT BLOCKED: ${worker.name} is a Telehandler but lacks a 'Telehandler' qualification ticket.` };
      }
      const telExp = new Date(telTicket.expiryDate);
      if (telExp < anchorDate) {
        return { isValid: false, reason: `DEPLOYMENT BLOCKED: ${worker.name}'s 'Telehandler' qualification expired on ${telTicket.expiryDate}.` };
      }
    }

    // 3. Supervisor role demands active 'Supervisor' ticket
    if (worker.role === 'Supervisor') {
      const supTicket = worker.tickets.find(t => t.type === 'Supervisor');
      if (!supTicket) {
        return { isValid: false, reason: `DEPLOYMENT BLOCKED: ${worker.name} is a Supervisor but lacks a 'Supervisor' qualification ticket.` };
      }
      const supExp = new Date(supTicket.expiryDate);
      if (supExp < anchorDate) {
        return { isValid: false, reason: `DEPLOYMENT BLOCKED: ${worker.name}'s 'Supervisor' qualification expired on ${supTicket.expiryDate}.` };
      }
    }

    return { isValid: true, reason: null };
  };

  const handleDeploy = () => {
    if (!selectedWorkerId) return;
    setErrorMessage(null);

    const worker = workersList.find(w => w.id === selectedWorkerId);
    if (!worker) return;

    const validation = validateWorkerDeployment(worker);
    if (!validation.isValid) {
      setErrorMessage(validation.reason);
      return;
    }

    const updatedAssigned = [...assignedWorkerIds, worker.id];
    onUpdateJob({
      ...job,
      assignedWorkers: updatedAssigned
    });

    setSelectedWorkerId('');
  };

  const handleWithdraw = (workerId: string) => {
    const updatedAssigned = assignedWorkerIds.filter(id => id !== workerId);
    onUpdateJob({
      ...job,
      assignedWorkers: updatedAssigned
    });
  };

  const getTicketStatus = (ticket: { expiryDate: string }) => {
    const expiryDate = new Date(ticket.expiryDate);
    if (expiryDate < anchorDate) {
      return 'Expired';
    }
    
    const diffTime = expiryDate.getTime() - anchorDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0 && diffDays <= 30) {
      return 'ExpiringSoon';
    }
    
    return 'Valid';
  };

  const currentSquad = workersList.filter(w => assignedWorkerIds.includes(w.id));

  return (
    <div className="bg-[#242424] border border-[#333] rounded-xl overflow-hidden p-5 space-y-4">
      <div className="border-b border-[#2e2e2e] pb-3 flex justify-between items-center">
        <div className="flex items-center gap-2.5 text-[11px] font-extrabold tracking-widest uppercase text-[#e0e0e0]">
          <Shield className="w-4 h-4 text-[#5C7285]" />
          Deployment Gatekeeper Matrix
        </div>
        <span className="text-[9px] font-black tracking-widest text-[#555] uppercase">
          Anchor: 05 JUL 2026
        </span>
      </div>

      <div className="space-y-3">
        <div className="text-[9px] font-bold text-[#777] uppercase tracking-widest">
          Deploy Qualified Subcontractor
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedWorkerId}
            onChange={(e) => {
              setSelectedWorkerId(e.target.value);
              setErrorMessage(null);
            }}
            className="flex-1 bg-[#1e1e1e] border border-[#333] text-xs font-bold text-white rounded-lg px-3 py-2 outline-none focus:border-[#5C7285] cursor-pointer uppercase tracking-wider"
          >
            <option value="" disabled className="text-white/20">Select Operative to deploy...</option>
            {availableWorkers.map(w => (
              <option key={w.id} value={w.id}>
                {w.name} &bull; {w.role.toUpperCase()}
              </option>
            ))}
          </select>
          <button
            onClick={handleDeploy}
            disabled={!selectedWorkerId}
            className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-150 ${
              selectedWorkerId 
                ? 'bg-[#5C7285] hover:bg-[#6c8295] text-white cursor-pointer active:scale-95' 
                : 'bg-[#1e1e1e] text-white/20 border border-white/5 cursor-not-allowed'
            }`}
          >
            Deploy Squad
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-start gap-2.5 animate-pulse">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="text-[9px] font-black uppercase tracking-widest leading-relaxed">
            {errorMessage}
          </div>
        </div>
      )}

      <div className="space-y-3 pt-2">
        <div className="text-[9px] font-bold text-[#777] uppercase tracking-widest">
          Active Project Crew ({currentSquad.length})
        </div>

        <div className="space-y-2.5">
          {currentSquad.map(worker => (
            <div key={worker.id} className="p-3 bg-[#1c1c1e] border border-[#2e2e2e] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold text-white uppercase tracking-wider">{worker.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[7px] font-black text-white/50 uppercase tracking-widest">
                    {worker.role}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {worker.tickets.map(ticket => {
                    const status = getTicketStatus(ticket);
                    let badgeClass = '';
                    if (status === 'Expired') {
                      badgeClass = 'bg-red-500/10 border-red-500/20 text-red-400';
                    } else if (status === 'ExpiringSoon') {
                      badgeClass = 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse';
                    } else {
                      badgeClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                    }

                    return (
                      <span 
                        key={ticket.id} 
                        className={`px-2 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider border ${badgeClass}`}
                        title={`Ticket #${ticket.ticketNumber} Exp: ${ticket.expiryDate}`}
                      >
                        {ticket.type} ({ticket.expiryDate})
                      </span>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => handleWithdraw(worker.id)}
                className="px-2.5 py-1 bg-transparent hover:bg-red-500/10 border border-[#2e2e2e] hover:border-red-500/30 text-[#666] hover:text-red-400 rounded text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer shrink-0"
              >
                Withdraw
              </button>
            </div>
          ))}

          {currentSquad.length === 0 && (
            <div className="text-center py-6 border border-dashed border-[#2e2e2e] rounded-lg text-[10px] font-bold uppercase tracking-widest text-[#444]">
              No crew deployed to site yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
