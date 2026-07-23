import { Worker, Ticket } from "../types/erp";

// Validation anchor: today (evaluated at call time so expiry checks stay live)
const getAnchorDate = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

export const validateWorkerForDeployment = (
  worker: Worker,
  roleNeeded: string,
): { isValid: boolean; reason: string | null } => {
  // Deployable as long as they hold at least one compliance ticket and none
  // of them have expired — matches the green/amber/red status shown on the
  // staff roster profile rather than requiring a specific ticket type name.
  if (!worker.tickets || worker.tickets.length === 0) {
    return { isValid: false, reason: "No compliance certificates on file" };
  }

  const expiredTicket = worker.tickets.find((t) => getTicketStatus(t) === "EXPIRED");
  if (expiredTicket) {
    return { isValid: false, reason: `${expiredTicket.type} has expired` };
  }

  return { isValid: true, reason: null };
};

/** Worst ticket across a worker: EXPIRED beats EXPIRING_SOON, null if all valid. */
export const getWorstTicketWarning = (
  worker: Worker,
): { ticket: Ticket; status: "EXPIRED" | "EXPIRING_SOON" } | null => {
  let worst: { ticket: Ticket; status: "EXPIRED" | "EXPIRING_SOON" } | null = null;
  for (const ticket of worker.tickets ?? []) {
    const status = getTicketStatus(ticket);
    if (status === "EXPIRED") return { ticket, status };
    if (status === "EXPIRING_SOON" && !worst) worst = { ticket, status };
  }
  return worst;
};

export const getTicketStatus = (ticket: Ticket) => {
  const anchorDate = getAnchorDate();
  const expDate = new Date(ticket.expiryDate);
  if (expDate < anchorDate) {
    return "EXPIRED";
  }
  const diffTime = expDate.getTime() - anchorDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays >= 0 && diffDays <= 30) {
    return "EXPIRING_SOON";
  }
  return "VALID";
};
