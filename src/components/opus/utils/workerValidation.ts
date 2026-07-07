import { Worker, Ticket } from '../types/erp';

// Validation Anchor date: July 5, 2026
const anchorDate = new Date('2026-07-05');

export const validateWorkerForDeployment = (worker: Worker, roleNeeded: string): { isValid: boolean; reason: string | null } => {
  // Must possess a valid CSCS safety ticket
  const cscsTicket = worker.tickets.find(t => t.type === 'CSCS');
  if (!cscsTicket) {
    return { isValid: false, reason: 'Missing CSCS safety ticket' };
  }
  if (new Date(cscsTicket.expiryDate) < anchorDate) {
    return { isValid: false, reason: 'CSCS safety ticket has expired' };
  }

  // Role-specific machine qualifications
  if (roleNeeded === 'Telehandler' || worker.role === 'Telehandler') {
    const teleTicket = worker.tickets.find(t => t.type === 'Telehandler');
    if (!teleTicket) {
      return { isValid: false, reason: 'Requires active Telehandler operator ticket' };
    }
    if (new Date(teleTicket.expiryDate) < anchorDate) {
      return { isValid: false, reason: 'Telehandler operator ticket has expired' };
    }
  }

  if (roleNeeded === 'Supervisor' || worker.role === 'Supervisor') {
    const superTicket = worker.tickets.find(t => t.type === 'Supervisor');
    if (!superTicket) {
      return { isValid: false, reason: 'Requires active Supervisor qualification ticket' };
    }
    if (new Date(superTicket.expiryDate) < anchorDate) {
      return { isValid: false, reason: 'Supervisor qualification ticket has expired' };
    }
  }

  return { isValid: true, reason: null };
};

export const getTicketStatus = (ticket: Ticket) => {
  const expDate = new Date(ticket.expiryDate);
  if (expDate < anchorDate) {
    return 'EXPIRED';
  }
  const diffTime = expDate.getTime() - anchorDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays >= 0 && diffDays <= 30) {
    return 'EXPIRING_SOON';
  }
  return 'VALID';
};
