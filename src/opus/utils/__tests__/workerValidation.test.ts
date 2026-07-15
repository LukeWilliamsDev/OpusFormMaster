import { describe, test, expect } from "vitest";
import { validateWorkerForDeployment, getTicketStatus } from "../workerValidation";
import { Worker, Ticket } from "../../types/erp";

const createMockWorker = (role: string, tickets: Ticket[] = []): Worker => ({
  id: "worker-1",
  name: "John Doe",
  role: role as any,
  tickets,
  uploadedCertificates: [],
});

describe("validateWorkerForDeployment", () => {
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const futureStr = futureDate.toISOString().split("T")[0];

  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 1);
  const pastStr = pastDate.toISOString().split("T")[0];

  test("blocks worker without a CSCS safety ticket", () => {
    const worker = createMockWorker("Concrete Operative");
    const result = validateWorkerForDeployment(worker, "Concrete Operative");
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("Missing CSCS safety ticket");
  });

  test("blocks worker with expired CSCS safety ticket", () => {
    const ticket: Ticket = { id: "t1", type: "CSCS", expiryDate: pastStr, ticketNumber: "123" };
    const worker = createMockWorker("Concrete Operative", [ticket]);
    const result = validateWorkerForDeployment(worker, "Concrete Operative");
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("CSCS safety ticket has expired");
  });

  test("allows worker with valid CSCS safety ticket for standard role", () => {
    const ticket: Ticket = { id: "t1", type: "CSCS", expiryDate: futureStr, ticketNumber: "123" };
    const worker = createMockWorker("Concrete Operative", [ticket]);
    const result = validateWorkerForDeployment(worker, "Concrete Operative");
    expect(result.isValid).toBe(true);
    expect(result.reason).toBeNull();
  });

  test("blocks Telehandler without active Telehandler operator ticket", () => {
    const cscsTicket: Ticket = {
      id: "t1",
      type: "CSCS",
      expiryDate: futureStr,
      ticketNumber: "123",
    };
    const worker = createMockWorker("Telehandler", [cscsTicket]);
    const result = validateWorkerForDeployment(worker, "Telehandler");
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("Requires active Telehandler operator ticket");
  });

  test("allows Telehandler with valid tickets", () => {
    const cscsTicket: Ticket = {
      id: "t1",
      type: "CSCS",
      expiryDate: futureStr,
      ticketNumber: "123",
    };
    const teleTicket: Ticket = {
      id: "t2",
      type: "Telehandler",
      expiryDate: futureStr,
      ticketNumber: "456",
    };
    const worker = createMockWorker("Telehandler", [cscsTicket, teleTicket]);
    const result = validateWorkerForDeployment(worker, "Telehandler");
    expect(result.isValid).toBe(true);
  });
});

describe("getTicketStatus", () => {
  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 1);
  const pastStr = pastDate.toISOString().split("T")[0];

  const farFutureDate = new Date();
  farFutureDate.setFullYear(farFutureDate.getFullYear() + 2);
  const farFutureStr = farFutureDate.toISOString().split("T")[0];

  const soonFutureDate = new Date();
  soonFutureDate.setDate(soonFutureDate.getDate() + 15);
  const soonFutureStr = soonFutureDate.toISOString().split("T")[0];

  test("returns EXPIRED for past dates", () => {
    const ticket: Ticket = { id: "t1", type: "CSCS", expiryDate: pastStr, ticketNumber: "123" };
    expect(getTicketStatus(ticket)).toBe("EXPIRED");
  });

  test("returns EXPIRING_SOON for dates within 30 days", () => {
    const ticket: Ticket = {
      id: "t1",
      type: "CSCS",
      expiryDate: soonFutureStr,
      ticketNumber: "123",
    };
    expect(getTicketStatus(ticket)).toBe("EXPIRING_SOON");
  });

  test("returns VALID for dates far in future", () => {
    const ticket: Ticket = {
      id: "t1",
      type: "CSCS",
      expiryDate: farFutureStr,
      ticketNumber: "123",
    };
    expect(getTicketStatus(ticket)).toBe("VALID");
  });
});
