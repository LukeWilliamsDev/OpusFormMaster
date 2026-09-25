import { Worker, Ticket } from "../types/erp";
import { isValidISODate, parseLocalISODate, toLondonISODate } from "./week";

export type TicketStatus = "EXPIRED" | "EXPIRING_SOON" | "VALID" | "INVALID";

const getAnchorDate = () => {
  return parseLocalISODate(toLondonISODate());
};

export const getAvatarInitials = (fullName?: string) =>
  fullName
    ?.split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "";

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

  const blockedTicket = worker.tickets.find((t) =>
    ["EXPIRED", "INVALID"].includes(getTicketStatus(t)),
  );
  if (blockedTicket) {
    return {
      isValid: false,
      reason:
        getTicketStatus(blockedTicket) === "INVALID"
          ? `${blockedTicket.type} has an invalid expiry date`
          : `${blockedTicket.type} has expired`,
    };
  }

  return { isValid: true, reason: null };
};

/** Worst ticket across a worker: EXPIRED beats EXPIRING_SOON, null if all valid. */
export const getWorstTicketWarning = (
  worker: Worker,
): { ticket: Ticket; status: Exclude<TicketStatus, "VALID"> } | null => {
  let worst: { ticket: Ticket; status: Exclude<TicketStatus, "VALID"> } | null = null;
  for (const ticket of worker.tickets ?? []) {
    const status = getTicketStatus(ticket);
    if (status === "INVALID") return { ticket, status };
    if (status === "EXPIRED") return { ticket, status };
    if (status === "EXPIRING_SOON" && !worst) worst = { ticket, status };
  }
  return worst;
};

export const getTicketStatus = (ticket: Ticket): TicketStatus => {
  const anchorDate = getAnchorDate();
  if (!isValidISODate(ticket.expiryDate)) return "INVALID";
  const expDate = parseLocalISODate(ticket.expiryDate);
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

/** Return the latest uploaded version of each certificate type for display.
 * Historical rows remain available in the document audit history.
 */
export const getCurrentTickets = (tickets: Ticket[] = []) => {
  const latest = new Map<string, Ticket>();
  for (const ticket of tickets) {
    const previous = latest.get(ticket.type);
    if (!previous || (ticket.createdAt ?? "") >= (previous.createdAt ?? "")) {
      latest.set(ticket.type, ticket);
    }
  }
  return [...latest.values()];
};
