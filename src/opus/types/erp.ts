import { LucideIcon } from "lucide-react";

export interface Job {
  id: string;
  jobRef: string;
  siteName: string;
  mainContractor: string;
  postcode: string;
  currentPours: number;
  contractMaxPours: number;
  status: "active" | "completed" | "on-hold" | "pending" | "in-progress";
  scheduleValue: number;
  updatedAt?: string;
}

export interface Ticket {
  id: string;
  type: "CSCS" | "NPORS" | "CPCS" | "Telehandler" | "Supervisor" | string;
  expiryDate: string; // YYYY-MM-DD
  ticketNumber: string;
  isValid?: boolean;
}

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
  "Logistics and Operations Assistant",
  "Material Handler",
  "Telehandler Operator",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const OFFICE_ROLES: StaffRole[] = [
  "Director",
  "IT",
  "Inbound Sales Representative",
  "Logistics and Operations Assistant",
];

export interface Worker {
  id: string;
  name: string;
  role: StaffRole;
  tickets: Ticket[];
  phone?: string;
  email?: string;
  postcode?: string;
  uploadedCertificates?: {
    id: string;
    name: string;
    size: string;
    uploadedAt: string;
  }[];
  isArchived?: boolean;
}

export interface WeatherRisk {
  postcode: string;
  condition: "Rain" | "Frost" | "Clear" | "Wind";
  riskLevel: "Low" | "Medium" | "High";
  temperature?: number;
}

export interface LaborRate {
  type: "Supervisor" | "Operative";
  rate: number;
}

export interface MeasuredItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number | "Included";
  isIncluded: boolean;
}

export interface SundryItem {
  id: string;
  description: string;
  cost: number;
}

export interface Quote {
  id: string;
  clientName: string;
  projectSite: string;
  postcode: string;
  items: MeasuredItem[];
  sundries: SundryItem[];
  comments: string[];
  isCISApplied: boolean;
  cisRate: 0.2 | 0.3;
  isDRCApplied: boolean;
}

export interface ScheduledShift {
  id: string;
  workerId: string;
  jobId: string;
  date: string; // YYYY-MM-DD
}
