// @ts-nocheck
/* eslint-disable */
import { useState, useEffect, useRef, useMemo } from "react";


/* ======================================================================
   MOCK DATA & TRANSLATIONS (UK LOCALIZED)
   ====================================================================== */

const STATUS_OPTIONS = ["Quote Pending", "In Progress", "Awaiting Invoice", "Completed"];

const STATUS_STYLES = {
  "Quote Pending":    { bg: "bg-amber-50",  text: "text-amber-600",  dot: "bg-amber" },
  "In Progress":      { bg: "bg-denim-50",  text: "text-denim",      dot: "bg-denim" },
  "Awaiting Invoice": { bg: "bg-rust-50",   text: "text-rust",       dot: "bg-rust" },
  "Completed":        { bg: "bg-forest-50", text: "text-forest",     dot: "bg-forest" },
};

const ROLES = {
  admin: { label: "Administrator / Owner", short: "Owner", color: "bg-amber text-white" },
  agent: { label: "Site Supervisor / Agent", short: "Supervisor", color: "bg-denim text-white" },
};

const MOCK_USERS = [
  { id: "u1", name: "Danny Vance", title: "Owner / Director", email: "danny@opusform.co.uk", password: "admin123", role: "admin" },
  { id: "u2", name: "Leah Cooper", title: "Site Supervisor", email: "leah@opusform.co.uk", password: "agent123", role: "agent" },
];

const DEFAULT_COMPANY = {
  name: "Opus Form Concrete Specialists",
  regNumber: "14902188",
  vatNumber: "GB 412 8876 21",
  defaultVat: 20,
  address: "Unit 4, Priory Business Park, Hull, HU4 7DY",
  email: "operations@opusform.co.uk",
  phone: "01482 555 010",
  bankName: "Barclays Business Banking",
  accountName: "Opus Form Ltd",
  sortCode: "20-00-00",
  accountNumber: "13319268",
  iban: "GB29 NWBK 6016 1331 9268 19",
  paymentTerms: "Net 14 days from date of invoice. Late payments accrue statutory interest.",
};

const QUICK_TEMPLATES = [
  {
    id: "pour-confirm", label: "Pour Confirmation",
    subject: "Concrete Pour Confirmed — {jobId}",
    body: "Hi {contact},\n\nThis confirms your concrete pour for {jobId} is scheduled to go ahead. Please ensure site access is clear from 07:00 and the area is free of debris and standing water prior to our crew's arrival.\n\nKind regards,\n{staff}\nOpus Form Concrete Specialists"
  },
  {
    id: "late-payment", label: "Late Payment Notice",
    subject: "Payment Reminder — {jobId}",
    body: "Hi {contact},\n\nOur records show the balance on {jobId} remains outstanding. Please arrange payment at your earliest convenience to avoid any further action.\n\nKind regards,\n{staff}\nOpus Form Accounts"
  },
  {
    id: "quote-follow", label: "Quote Follow-up",
    subject: "Following Up — {jobId}",
    body: "Hi {contact},\n\nJust checking in regarding the quote we issued for {jobId}. Let us know if you have any questions, or if you'd like us to proceed.\n\nKind regards,\n{staff}\nOpus Form Concrete Specialists"
  },
  {
    id: "site-meeting", label: "Site Meeting Recap",
    subject: "Site Meeting Notes — {jobId}",
    body: "Hi {contact},\n\nThanks for your time on site today for {jobId}. To summarise what we discussed: [add specifics here]. Let us know if anything needs amending.\n\nKind regards,\n{staff}\nOpus Form Concrete Specialists"
  },
];

const initialJobs = [
  {
    id: "JOB-1041",
    customer: "Halden Logistics Ltd",
    email: "accounts@haldenlogistics.co.uk",
    phone: "01482 220144",
    address: "Yard 3, Sutton Fields Industrial Estate, Hull, HU7 0YF",
    status: "Completed",
    createdAt: "2026-05-02",
    notes: "Yard resurfacing to existing hardstanding. Client supplied own aggregate sub-base.",
    siteCrew: [
      { name: "Danny Vance", role: "Site Supervisor", phone: "07711 987654" }
    ],
    lineItems: [
      { id: 1, description: "Yard slab resurfacing — RC30 concrete", qty: 300, unit: "m²", rate: 32.00 }
    ],
    taxRate: 20,
    media: { before: [], after: [] },
    supplies: [
      { name: "Jewson Hull (Supplies)", type: "Merchants" },
      { name: "Ashcourt Ready Mix Concrete", type: "Concrete" }
    ],
    billedAmount: 11520,
    paidAmount: 11520,
    correspondence: [
      { id: "c101", type: "Meeting", direction: "N/A", staff: "Danny Vance", contact: "Ray Halden", notes: "Final walk-round completed, client signed off on finish quality.", followUp: false, followUpDate: "", createdAt: "2026-06-01T10:15:00" },
      { id: "c102", type: "Email", direction: "Outbound", staff: "Danny Vance", contact: "Accounts Team", notes: "Sent final invoice with completion photos attached.", followUp: false, followUpDate: "", createdAt: "2026-06-02T09:02:00" }
    ]
  },
  {
    id: "JOB-1042",
    customer: "StudWelders",
    email: "accounts@studwelders.co.uk",
    phone: "01482 867123",
    address: "Ashcourt, Hull, HU15 1SG",
    status: "In Progress",
    createdAt: "2026-06-18",
    notes: "Mezzanine Deck Floor Slab — Labour Only. Assumed total pours up to 1; additional pours charged at a minimum of £3,500. Cancelled pours with less than 24hrs notice will be charged.",
    siteCrew: [
      { name: "Danny Vance", role: "Site Supervisor", phone: "07711 987654" },
      { name: "Lee Cooper", role: "Finisher / Powerfloat Specialist", phone: "07843 210987" }
    ],
    lineItems: [
      { id: 1, description: "To lay 150mm thick RC35 concrete", qty: 625, unit: "m²", rate: 4.80 },
      { id: 2, description: "To lay and tie 1 layer A252 mesh", qty: 625, unit: "m²", rate: 3.00 },
      { id: 3, description: "To power float finish concrete surface", qty: 625, unit: "m²", rate: 1.00 },
      { id: 4, description: "Task lighting, column protection, priming cement & washout skip polythene", qty: 1, unit: "sum", rate: 750.00 }
    ],
    taxRate: 20,
    media: { before: [], after: [] },
    supplies: [
      { name: "Jewson Hull (Supplies)", type: "Merchants" },
      { name: "Speedy Hire Hull (Mini-pumps & Tools)", type: "Tool & Pump" },
      { name: "Ashcourt Ready Mix Concrete", type: "Concrete" }
    ],
    billedAmount: 0,
    paidAmount: 0,
    correspondence: [
      { id: "c201", type: "Call", direction: "Inbound", staff: "Leah Cooper", contact: "Ops Manager, StudWelders", notes: "Client called to confirm crane access window for Thursday's pour.", followUp: true, followUpDate: "2026-07-08", createdAt: "2026-06-30T14:22:00" },
      { id: "c202", type: "Note", direction: "N/A", staff: "Danny Vance", contact: "—", notes: "Mesh delivery delayed by one day, revised pour date agreed on site.", followUp: false, followUpDate: "", createdAt: "2026-07-01T08:40:00" }
    ]
  },
  {
    id: "JOB-1043",
    customer: "Priya Natarajan",
    email: "priya.n@example.co.uk",
    phone: "07945 108774",
    address: "8 Kintore Avenue, Birmingham, B3 2AA",
    status: "Quote Pending",
    createdAt: "2026-06-25",
    notes: "Backyard patio slab. Access is tight, will require a mini-pump hire.",
    siteCrew: [
      { name: "Tom Knowles", role: "Pump Operator / Subcontractor", phone: "07911 555333" }
    ],
    lineItems: [
      { id: 1, description: "Concrete Pump Hire (Half Day)", qty: 1, unit: "sum", rate: 450.00 },
      { id: 2, description: "Class 1 Slab Pour - RC35 Concrete", qty: 8, unit: "m³", rate: 220.00 }
    ],
    taxRate: 20,
    media: { before: [], after: [] },
    supplies: [
      { name: "Travis Perkins Birmingham", type: "Merchants" },
      { name: "Brandon Hire Station", type: "Tool & Pump" },
      { name: "Cemex Concrete Plant", type: "Concrete" }
    ],
    billedAmount: 0,
    paidAmount: 0,
    correspondence: [
      { id: "c301", type: "Email", direction: "Outbound", staff: "Danny Vance", contact: "Priya Natarajan", notes: "Sent initial quote for patio slab, awaiting confirmation on access arrangements.", followUp: true, followUpDate: "2026-07-10", createdAt: "2026-06-26T11:05:00" }
    ]
  },
  {
    id: "JOB-1044",
    customer: "Callum Ostrowski",
    email: "callum.o@example.co.uk",
    phone: "07555 902118",
    address: "221 Grange Road, London, NW10 1BU",
    status: "Awaiting Invoice",
    createdAt: "2026-06-10",
    notes: "Commercial foundation slab. Day rate per operative is £240, Supervisor rate is £280.",
    siteCrew: [
      { name: "Marcus Brody", role: "Site Lead", phone: "07422 666777" },
      { name: "Sam West", role: "Operative", phone: "07522 888111" }
    ],
    lineItems: [
      { id: 1, description: "Commercial Slab Prep & Operative Labour (Day Rate)", qty: 4, unit: "days", rate: 240.00 },
      { id: 2, description: "Site Supervisor Rate", qty: 2, unit: "days", rate: 280.00 }
    ],
    taxRate: 20,
    media: { before: [], after: [] },
    supplies: [
      { name: "Selco Builders Warehouse", type: "Merchants" },
      { name: "HSS Hire", type: "Tool & Pump" },
      { name: "London Ready Mix Concrete", type: "Concrete" }
    ],
    billedAmount: 1824,
    paidAmount: 900,
    correspondence: [
      { id: "c401", type: "Call", direction: "Outbound", staff: "Danny Vance", contact: "Callum Ostrowski", notes: "Chased outstanding balance, client confirmed part-payment by Friday.", followUp: true, followUpDate: "2026-07-04", createdAt: "2026-06-29T16:48:00" },
      { id: "c402", type: "SMS", direction: "Outbound", staff: "Danny Vance", contact: "Callum Ostrowski", notes: "Sent short reminder text with bank details for remaining balance.", followUp: false, followUpDate: "", createdAt: "2026-06-30T09:00:00" }
    ]
  }
];

const currency = (n) => {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
};

const safeNum = (v, fallback = 0) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

const calcTotals = (lineItems, taxRate) => {
  const items = Array.isArray(lineItems) ? lineItems : [];
  const rate = safeNum(taxRate, 0);
  const subtotal = items.reduce((sum, li) => sum + safeNum(li.qty) * safeNum(li.rate), 0);
  const tax = subtotal * (rate / 100);
  return { subtotal, tax, total: subtotal + tax };
};

const uid = () => Math.random().toString(36).slice(2, 9);

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const timeAgo = (iso) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

/* ======================================================================
   ICONS
   ====================================================================== */

const Icon = {
  Plus: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>),
  Trash: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-.8 12.2A2 2 0 0 1 16.2 21H7.8a2 2 0 0 1-2-1.8L5 6"/></svg>),
  Back: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 18l-6-6 6-6"/></svg>),
  Send: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"/></svg>),
  Upload: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 16V4m0 0 4 4m-4-4-4 4M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>),
  Jobs: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 7h18M3 12h18M3 17h18"/></svg>),
  Doc: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5"/></svg>),
  Close: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>),
  Menu: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 6h16M4 12h16M4 18h16"/></svg>),
  Phone: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>),
  MapPin: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>),
  Eye: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>),
  EyeOff: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.6 19.6 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.7 19.7 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>),
  Lock: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
  Mail: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>),
  Settings: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>),
  LogOut: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>),
  Building: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M9 6h1M14 6h1M9 10h1M14 10h1M9 14h1M14 14h1"/></svg>),
  Card: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>),
  Trend: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/></svg>),
  Message: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>),
  Chevron: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m6 9 6 6 6-6"/></svg>),
  Check: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6 9 17l-5-5"/></svg>),
  Clock: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>),
  User: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
  Alert: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>),
  Calendar: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>),
  ShieldOff: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19.69 14a6.9 6.9 0 0 0 .31-2V5l-8-3-3.16 1.18M4.73 4.73 4 5v7c0 6 8 10 8 10a20.29 20.29 0 0 0 5.62-4.38M1 1l22 22"/></svg>),
  Wallet: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>),
};

/* ======================================================================
   SHARED UI COMPONENTS
   ====================================================================== */

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES["Quote Pending"];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`}></span>
      {status}
    </span>
  );
}

function RoleBadge({ role, size = "sm" }) {
  const r = ROLES[role] || ROLES.agent;
  const sizing = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide ${sizing} ${r.color}`}>
      {r.short}
    </span>
  );
}

function IconButton({ onClick, title, children, tone = "default" }) {
  const tones = {
    default: "text-steel-600 hover:text-ink hover:bg-steel-100",
    danger: "text-steel-600 hover:text-rust hover:bg-rust-50",
  };
  return (
    <button
      onClick={onClick}
      title={title}
      type="button"
      className={`inline-flex h-11 w-11 items-center justify-center rounded-md transition-colors ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const toneMap = { success: "bg-forest text-white", info: "bg-ink text-white", error: "bg-rust text-white" };
  return (
    <div className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-lg px-4 py-3 text-sm shadow-lg animate-fadeUp ${toneMap[toast.type] || toneMap.info}`}>
      {toast.message}
    </div>
  );
}

function Field({ label, required, hint, ...props }) {
  return (
    <div>
      {label && (
        <label className="mb-1 block text-xs font-medium text-steel-600">
          {label} {required && <span className="text-rust">*</span>}
        </label>
      )}
      <input {...props} className={`w-full rounded-lg border border-steel-200 px-3 py-2.5 text-sm min-h-[44px] focus:border-ink focus:outline-none transition-colors ${props.className || ""}`} />
      {hint && <p className="mt-1 text-[11px] text-steel-400">{hint}</p>}
    </div>
  );
}

function SkeletonBlock({ className }) {
  return <div className={`skeleton animate-shimmer rounded-lg ${className}`}></div>;
}

function RestrictedPanel({ label }) {
  return (
    <div className="rounded-2xl border border-dashed border-steel-200 bg-steel-100/40 p-6 text-center">
      <Icon.ShieldOff className="mx-auto mb-2 h-6 w-6 text-steel-400" />
      <p className="text-sm font-semibold text-steel-600">Restricted — Administrator Access Required</p>
      <p className="mt-1 text-xs text-steel-400">{label}</p>
    </div>
  );
}

/* ======================================================================
   AUTH GATEWAY
   ====================================================================== */

function AuthGateway({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const attemptLogin = (e) => {
    if (e) e.preventDefault();
    setError("");
    const user = MOCK_USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
    if (!email || !password) {
      setError("Enter your work email and password to continue.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (user) {
        onLogin(user);
      } else {
        setError("Those credentials weren't recognised. Try one of the demo accounts below.");
      }
    }, 650);
  };

  const quickFill = (user) => {
    setEmail(user.email);
    setPassword(user.password);
    setError("");
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-paper">
      {/* Brand Panel */}
      <div className="relative hidden md:flex md:w-1/2 lg:w-2/5 flex-col justify-between bg-ink concrete-texture p-10 text-white overflow-hidden">
        <div className="absolute top-0 left-0 h-1.5 w-full safety-stripe opacity-80"></div>
        <div className="flex items-center gap-3 pt-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber font-display text-base font-bold">OF</div>
          <div>
            <p className="font-display text-base font-semibold tracking-wide leading-tight">Opus Form</p>
            <p className="text-xs text-steel-400 leading-tight">Concrete Business Hub</p>
          </div>
        </div>
        <div className="space-y-4 max-w-sm animate-fadeUp">
          <p className="font-display text-3xl font-bold leading-tight">Every pour,<br/>quote and ledger<br/>in one place.</p>
          <p className="text-sm text-steel-400 leading-relaxed">Central administration for scheduling, client correspondence, and financial control across every active site.</p>
        </div>
        <div className="text-[11px] text-steel-400 pb-2">© 2026 Opus Form Concrete Specialists Ltd · Company No. 14902188</div>
      </div>

      {/* Login Panel */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm animate-fadeUp">
          <div className="mb-8 flex items-center gap-2 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber font-display text-sm font-bold text-white">OF</div>
            <p className="font-display text-base font-semibold tracking-wide">Opus Form</p>
          </div>

          <h1 className="font-display text-2xl font-bold text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-steel-600">Sign in to access your operations workspace.</p>

          <form onSubmit={attemptLogin} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-steel-600">Work Email</label>
              <div className="relative">
                <Icon.Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@opusform.co.uk"
                  className="w-full rounded-lg border border-steel-200 py-2.5 pl-10 pr-3 text-sm min-h-[44px] focus:border-ink focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-steel-600">Password</label>
              <div className="relative">
                <Icon.Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
                <input
                  type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-steel-200 py-2.5 pl-10 pr-11 text-sm min-h-[44px] focus:border-ink focus:outline-none"
                />
                <button
                  type="button" onClick={() => setShowPw((s) => !s)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center text-steel-400 hover:text-ink"
                  title={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <Icon.EyeOff className="h-4 w-4" /> : <Icon.Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-steel-600">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-steel-200" />
                Keep me signed in
              </label>
              <span className="text-steel-400">Session auto-expires after 20 min idle</span>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-rust-50 px-3 py-2.5 text-xs text-rust">
                <Icon.Alert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber py-3 text-sm font-semibold text-white hover:bg-amber-600 min-h-[44px] transition-colors disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                  Verifying credentials…
                </>
              ) : "Sign in"}
            </button>
          </form>

          <div className="mt-8 border-t border-steel-200 pt-5">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-steel-400">Try a demo role</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MOCK_USERS.map((u) => (
                <button
                  key={u.id} type="button" onClick={() => quickFill(u)}
                  className="flex flex-col items-start gap-1 rounded-xl border border-steel-200 bg-white p-3 text-left hover:border-ink transition-colors min-h-[44px]"
                >
                  <RoleBadge role={u.role} />
                  <span className="text-xs font-semibold text-ink">{u.name}</span>
                  <span className="text-[11px] text-steel-400">{u.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================================================================
   PROFILE / SESSION CONTROL
   ====================================================================== */

function ProfileControl({ user, secondsLeft, onLogout, onOpenAdmin, compact }) {
  const [open, setOpen] = useState(false);
  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-lg transition-colors min-h-[44px] ${compact ? "px-2 py-1" : "w-full px-2 py-2 hover:bg-white/5"}`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber font-display text-xs font-bold text-white">{initials}</div>
        {!compact && (
          <div className="flex-1 text-left min-w-0">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-[11px] text-steel-400">{user.title}</p>
          </div>
        )}
        <Icon.Chevron className={`h-4 w-4 shrink-0 ${compact ? "text-steel-600" : "text-steel-400"} transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)}></div>
          <div className={`absolute z-40 w-64 rounded-xl border border-steel-200 bg-white p-3 shadow-xl ${compact ? "right-0 top-12" : "left-0 bottom-14"}`}>
            <div className="mb-2 flex items-center gap-2 border-b border-steel-100 pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber font-display text-xs font-bold text-white">{initials}</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                <p className="truncate text-[11px] text-steel-600">{user.email}</p>
              </div>
            </div>
            <div className="mb-2 flex items-center justify-between px-1">
              <RoleBadge role={user.role} size="md" />
              <span className="flex items-center gap-1 font-mono-num text-[11px] text-steel-600">
                <Icon.Clock className="h-3.5 w-3.5" /> {mm}:{ss}
              </span>
            </div>
            {user.role === "admin" && (
              <button
                onClick={() => { onOpenAdmin(); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-sm text-steel-600 hover:bg-paper hover:text-ink min-h-[40px]"
              >
                <Icon.Settings className="h-4 w-4" /> Admin Suite
              </button>
            )}
            <button
              onClick={() => { onLogout(); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-sm text-rust hover:bg-rust-50 min-h-[40px]"
            >
              <Icon.LogOut className="h-4 w-4" /> Log Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ======================================================================
   SIDEBAR & RESPONSIVE NAVIGATION Drawer
   ====================================================================== */

function Navigation({ view, onNavigate, jobCount, user, secondsLeft, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => { onNavigate("dashboard"); setIsOpen(false); }}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]
          ${view === "dashboard" || view === "job" ? "bg-white/10 text-white" : "text-steel-400 hover:bg-white/5 hover:text-white"}`}
      >
        <Icon.Jobs className="h-4 w-4" />
        <span className="flex-1 text-left">Job Dashboard</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-mono-num text-steel-400">{jobCount}</span>
      </button>
      <button
        onClick={() => { onNavigate("generator"); setIsOpen(false); }}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]
          ${view === "generator" ? "bg-white/10 text-white" : "text-steel-400 hover:bg-white/5 hover:text-white"}`}
      >
        <Icon.Doc className="h-4 w-4" />
        <span className="flex-1 text-left">New Quote / Invoice</span>
      </button>
      {user.role === "admin" && (
        <button
          onClick={() => { onNavigate("admin"); setIsOpen(false); }}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]
            ${view === "admin" ? "bg-white/10 text-white" : "text-steel-400 hover:bg-white/5 hover:text-white"}`}
        >
          <Icon.Settings className="h-4 w-4" />
          <span className="flex-1 text-left">Admin Suite</span>
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar Layout */}
      <aside className="hidden md:flex h-screen w-64 shrink-0 flex-col bg-ink px-4 py-6 text-white">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber font-display text-sm font-bold text-white">OF</div>
          <div>
            <p className="font-display text-sm font-semibold tracking-wide text-white leading-tight">Opus Form</p>
            <p className="text-[11px] text-steel-400 leading-tight">Concrete Business Hub</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">{navLinks}</nav>
        <div className="mb-3 rounded-lg bg-white/5 p-3">
          <p className="text-xs text-steel-400">Region Workspace</p>
          <p className="text-sm font-medium text-white">UK Operations (VAT 20%)</p>
        </div>
        <div className="border-t border-white/10 pt-3">
          <ProfileControl user={user} secondsLeft={secondsLeft} onLogout={onLogout} onOpenAdmin={() => onNavigate("admin")} />
        </div>
      </aside>

      {/* Mobile Top Header Navigation */}
      <header className="flex md:hidden w-full h-16 bg-ink text-white items-center justify-between px-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber font-display text-sm font-bold text-white">OF</div>
          <p className="font-display text-sm font-semibold tracking-wide text-white">Opus Form</p>
        </div>
        <div className="flex items-center gap-1">
          <ProfileControl user={user} secondsLeft={secondsLeft} onLogout={onLogout} onOpenAdmin={() => onNavigate("admin")} compact />
          <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-steel-200 min-h-[44px] min-w-[44px]">
            {isOpen ? <Icon.Close className="h-6 w-6" /> : <Icon.Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Slide-out Overlay Drawer for Mobile */}
      {isOpen && (
        <div className="fixed inset-0 top-16 z-20 bg-ink/90 backdrop-blur-sm md:hidden flex flex-col p-4 space-y-4">
          <nav className="flex-1">{navLinks}</nav>
          <div className="rounded-lg bg-white/5 p-3 text-white">
            <p className="text-xs text-steel-400">Region Workspace</p>
            <p className="text-sm font-medium">UK Operations (VAT 20%)</p>
          </div>
        </div>
      )}
    </>
  );
}

/* ======================================================================
   LOGISTICS MAP COMPONENT
   ====================================================================== */

function LogisticsMap({ address, supplies }) {
  const [filter, setFilter] = useState("All");

  const filteredSupplies = useMemo(() => {
    if (filter === "All") return supplies || [];
    return (supplies || []).filter(s => s.type === filter);
  }, [supplies, filter]);

  return (
    <div className="rounded-2xl border border-steel-200 bg-white p-5 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h3 className="font-display text-base font-semibold flex items-center gap-2">
            <Icon.MapPin className="h-4 w-4 text-amber" /> Site Logistics Map
          </h3>
          <p className="text-xs text-steel-600 truncate max-w-xs sm:max-w-md">{address}</p>
        </div>

        <div className="flex space-x-1 bg-paper p-1 rounded-lg text-xs font-medium">
          {["All", "Concrete", "Tool & Pump", "Merchants"].map(t => (
            <button
              key={t} onClick={() => setFilter(t)}
              className={`px-2.5 py-1 rounded-md transition-colors ${filter === t ? "bg-amber text-white shadow-sm" : "text-steel-600 hover:text-ink"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-steel-100 bg-paper h-32 flex items-center justify-center text-steel-400 text-xs">
        Map preview unavailable in offline prototype
      </div>

      <div className="text-xs space-y-1.5">
        <span className="text-xs font-semibold block text-ink">Nearby Logistics Assets:</span>
        {filteredSupplies.length === 0 ? (
          <span className="text-steel-400 italic">No resource filters active matching choice.</span>
        ) : (
          filteredSupplies.map((s, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-steel-600">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>{s.name} <span className="text-[10px] text-steel-400">({s.type})</span></span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ======================================================================
   MEDIA UPLOADER
   ====================================================================== */

function DropZone({ label, images, onAddFiles, onRemove, accent }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  return (
    <div className="flex-1 min-w-0">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-sm font-semibold tracking-wide uppercase text-ink">{label}</p>
        <span className="font-mono-num text-xs text-steel-600">{images.length} photo{images.length !== 1 ? "s" : ""}</span>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/")); if (files.length) onAddFiles(files); }}
        onClick={() => inputRef.current && inputRef.current.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center min-h-[110px] flex flex-col justify-center transition-colors
          ${dragging ? `border-${accent} bg-${accent}-50` : "border-steel-200 bg-white hover:border-steel-400"}`}
      >
        <Icon.Upload className="mx-auto mb-2 h-6 w-6 text-steel-400" />
        <p className="text-sm text-steel-600"><span className="font-medium text-ink">Tap to add</span> or drag pour records</p>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const files = Array.from(e.target.files).filter(f => f.type.startsWith("image/")); if (files.length) onAddFiles(files); e.target.value = ""; }} />
      </div>

      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {images.map((img) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border border-steel-200 bg-steel-100">
              <img src={img.url} alt="Pour media" className="h-full w-full object-cover" />
              <button onClick={(e) => { e.stopPropagation(); onRemove(img.id); }} className="absolute right-1 top-1 h-7 w-7 flex items-center justify-center rounded-full bg-ink/80 text-white">
                <Icon.Close className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BeforeAfterMedia({ media, onChange }) {
  const addFiles = (type) => (files) => {
    const newImages = files.map((f) => ({ id: uid(), url: URL.createObjectURL(f), name: f.name }));
    onChange({ ...media, [type]: [...media[type], ...newImages] });
  };
  const removeImage = (type) => (id) => {
    onChange({ ...media, [type]: media[type].filter((img) => img.id !== id) });
  };

  return (
    <div className="rounded-2xl border border-steel-200 bg-paper p-5">
      <h3 className="font-display mb-4 text-base font-semibold">Pre-Pour &amp; Slabbing Records</h3>
      <div className="flex flex-col gap-4 sm:flex-row">
        <DropZone label="Before Pour / Mesh Prep" images={media.before} onAddFiles={addFiles("before")} onRemove={removeImage("before")} accent="denim" />
        <div className="hidden w-px self-stretch bg-steel-200 sm:block"></div>
        <DropZone label="Finished Float / Stripped Formwork" images={media.after} onAddFiles={addFiles("after")} onRemove={removeImage("after")} accent="forest" />
      </div>
    </div>
  );
}

/* ======================================================================
   DASHBOARD VIEW
   ====================================================================== */

function NewJobModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ customer: "", email: "", phone: "", address: "", notes: "" });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Schedule Site Mix / Pour Job</h3>
          <IconButton onClick={onClose} title="Close"><Icon.Close className="h-4 w-4" /></IconButton>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (form.customer.trim()) onCreate(form); }} className="space-y-3">
          <Field label="Customer Main Contractor" value={form.customer} onChange={(e) => setForm({...form, customer: e.target.value})} required />
          <Field label="Invoicing Email Address" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
          <Field label="Site Agent Mobile" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
          <Field label="UK Site Postcode & Address" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} />
          <div>
            <label className="mb-1 block text-xs font-medium text-steel-600">Pour Specifications / Directives</label>
            <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows="2" className="w-full rounded-lg border border-steel-200 px-3 py-2 text-sm min-h-[44px] focus:border-ink focus:outline-none" />
          </div>
          <button type="submit" className="mt-2 w-full rounded-lg bg-amber py-3 text-sm font-semibold text-white hover:bg-amber-600 min-h-[44px] transition-colors">
            Authorize &amp; Provision Job
          </button>
        </form>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone, mono, icon: IconComp, locked }) {
  const toneText = { amber: "text-amber", rust: "text-rust", denim: "text-denim", forest: "text-forest" }[tone] || "text-ink";
  return (
    <div className="rounded-2xl border border-steel-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-steel-600">{label}</p>
        {IconComp && <IconComp className="h-3.5 w-3.5 text-steel-400" />}
      </div>
      {locked ? (
        <p className="mt-1 flex items-center gap-1.5 font-display text-sm font-semibold text-steel-400">
          <Icon.Lock className="h-3.5 w-3.5" /> Restricted
        </p>
      ) : (
        <p className={`mt-1 font-display text-base md:text-xl font-bold truncate ${toneText} ${mono ? "font-mono-num" : ""}`}>{value}</p>
      )}
    </div>
  );
}

function Dashboard({ jobs, onSelectJob, onCreateJob, user }) {
  const [showModal, setShowModal] = useState(false);
  const isAdmin = user.role === "admin";

  const counts = useMemo(() => {
    const c = { total: jobs.length };
    STATUS_OPTIONS.forEach((s) => (c[s] = jobs.filter((j) => j.status === s).length));
    return c;
  }, [jobs]);

  const outstanding = useMemo(
    () => jobs.reduce((sum, j) => sum + calcTotals(j.lineItems, j.taxRate).total * (j.status === "Completed" ? 0 : 1), 0),
    [jobs]
  );

  const followUpsDue = useMemo(() => {
    const items = [];
    jobs.forEach((j) => (j.correspondence || []).forEach((c) => {
      if (c.followUp) items.push({ ...c, jobId: j.id, customer: j.customer });
    }));
    return items.sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate));
  }, [jobs]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Opus Form Operations</h1>
          <p className="text-sm text-steel-600">Commercial Concrete Pour Schedules &amp; Quantum Quantities.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white min-h-[44px] hover:bg-ink-50 transition-colors"
        >
          <Icon.Plus className="h-4 w-4" /> New Concrete Job
        </button>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Projects" value={counts.total} />
        <StatCard label="Quotes Out" value={counts["Quote Pending"]} tone="amber" />
        <StatCard label="Pours Pending Bill" value={counts["Awaiting Invoice"]} tone="rust" />
        <StatCard label="Slab Value (Ex VAT)" value={currency(outstanding)} mono tone="denim" locked={!isAdmin} />
      </div>

      {followUpsDue.length > 0 && (
        <div className="rounded-2xl border border-amber-50 bg-amber-50 p-4 flex flex-wrap items-start gap-3">
          <Icon.Alert className="h-5 w-5 text-amber shrink-0 mt-0.5" />
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-semibold text-ink">{followUpsDue.length} follow-up{followUpsDue.length !== 1 ? "s" : ""} pending across active jobs</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {followUpsDue.slice(0, 4).map((f) => (
                <button key={f.id} onClick={() => onSelectJob(f.jobId)} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-ink border border-steel-200 hover:border-amber transition-colors">
                  {f.customer} · {formatDate(f.followUpDate)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Responsive Structural Switcher: Cards on Small Screens, Table on Desktop */}
      <div className="overflow-hidden rounded-2xl border border-steel-200 bg-white shadow-sm">
        {/* Mobile View Card Stack */}
        <div className="block md:hidden divide-y divide-steel-100">
          {jobs.map((job) => {
            const { total } = calcTotals(job.lineItems, job.taxRate);
            return (
              <div key={job.id} onClick={() => onSelectJob(job.id)} className="p-4 space-y-3 active:bg-paper">
                <div className="flex justify-between items-center">
                  <span className="font-mono-num text-xs text-steel-400">{job.id}</span>
                  <StatusBadge status={job.status} />
                </div>
                <div>
                  <h4 className="font-semibold text-ink">{job.customer}</h4>
                  <p className="text-xs text-steel-600 truncate">{job.address}</p>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-xs text-steel-400">{job.lineItems.length} Measurement lines</span>
                  {isAdmin ? (
                    <span className="font-mono-num font-medium text-sm text-ink">{currency(total)}</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-steel-400"><Icon.Lock className="h-3 w-3" /> Restricted</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Data Table */}
        <table className="hidden md:table w-full text-left text-sm">
          <thead>
            <tr className="border-b border-steel-200 bg-steel-100/60 text-xs uppercase tracking-wide text-steel-600">
              <th className="px-5 py-3 font-medium">Job Ref</th>
              <th className="px-5 py-3 font-medium">Main Contractor / Site</th>
              <th className="px-5 py-3 font-medium">Pour Status</th>
              <th className="px-5 py-3 font-medium text-right">Schedule Value (inc VAT)</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const { total } = calcTotals(job.lineItems, job.taxRate);
              return (
                <tr key={job.id} onClick={() => onSelectJob(job.id)} className="cursor-pointer border-b border-steel-100 last:border-0 hover:bg-paper transition-colors">
                  <td className="px-5 py-4 font-mono-num text-xs text-steel-600">{job.id}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-ink">{job.customer}</p>
                    <p className="text-xs text-steel-600">{job.address}</p>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={job.status} /></td>
                  <td className="px-5 py-4 text-right font-mono-num font-medium">
                    {isAdmin ? (job.status === "Completed" ? currency(0) : currency(total)) : (
                      <span className="inline-flex items-center gap-1 text-steel-400"><Icon.Lock className="h-3.5 w-3.5" /> —</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right text-xs font-medium text-amber">Manage Field →</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <NewJobModal onClose={() => setShowModal(false)} onCreate={(form) => { onCreateJob(form); setShowModal(false); }} />
      )}
    </div>
  );
}

/* ======================================================================
   CORRESPONDENCE CENTER
   ====================================================================== */

const CORR_TYPES = ["Call", "Email", "Meeting", "SMS", "Note"];
const CORR_ICON = { Call: Icon.Phone, Email: Icon.Mail, Meeting: Icon.User, SMS: Icon.Message, Note: Icon.Doc };
const CORR_COLOR = {
  Call: "bg-denim-50 text-denim", Email: "bg-amber-50 text-amber-600", Meeting: "bg-forest-50 text-forest",
  SMS: "bg-rust-50 text-rust", Note: "bg-steel-100 text-steel-600"
};

function LogActivityForm({ job, currentUser, onAdd }) {
  const [type, setType] = useState("Call");
  const [direction, setDirection] = useState("Outbound");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [templateId, setTemplateId] = useState("");

  const applyTemplate = (id) => {
    setTemplateId(id);
    if (!id) return;
    const t = QUICK_TEMPLATES.find((tp) => tp.id === id);
    if (!t) return;
    const filled = t.body
      .replace(/{jobId}/g, job.id)
      .replace(/{contact}/g, contact || job.customer)
      .replace(/{staff}/g, currentUser.name)
      .replace(/{date}/g, formatDate(new Date().toISOString()));
    setNotes(filled);
    if (type !== "Email") setType("Email");
  };

  const submit = (e) => {
    e.preventDefault();
    if (!notes.trim()) return;
    onAdd({
      id: uid(),
      type, direction: type === "Meeting" || type === "Note" ? "N/A" : direction,
      staff: currentUser.name,
      contact: contact.trim() || "—",
      notes: notes.trim(),
      followUp,
      followUpDate: followUp ? followUpDate : "",
      createdAt: new Date().toISOString(),
    });
    setNotes(""); setContact(""); setFollowUp(false); setFollowUpDate(""); setTemplateId("");
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-steel-200 bg-white p-5">
      <h3 className="font-display text-base font-semibold flex items-center gap-2">
        <Icon.Message className="h-4 w-4 text-amber" /> Log New Activity
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {CORR_TYPES.map((t) => (
          <button
            type="button" key={t} onClick={() => setType(t)}
            className={`rounded-lg border py-2.5 text-xs font-semibold transition-colors min-h-[44px] ${type === t ? "border-ink bg-ink text-white" : "border-steel-200 text-steel-600 hover:border-ink"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {(type === "Call" || type === "Email" || type === "SMS") && (
        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Direction</label>
          <div className="flex overflow-hidden rounded-lg border border-steel-200 text-sm font-medium h-[44px] w-fit">
            {["Inbound", "Outbound"].map((d) => (
              <button
                type="button" key={d} onClick={() => setDirection(d)}
                className={`px-4 transition-colors ${direction === d ? "bg-denim text-white" : "bg-white text-steel-600 hover:bg-paper"}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Staff Member" value={currentUser.name} readOnly className="bg-paper text-steel-600" />
        <Field label="Client Contact Name" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="e.g. Accounts Manager" />
      </div>

      {type === "Email" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Quick Templates</label>
          <select
            value={templateId} onChange={(e) => applyTemplate(e.target.value)}
            className="w-full rounded-lg border border-steel-200 bg-white px-3 py-2.5 text-sm min-h-[44px] focus:border-ink focus:outline-none"
          >
            <option value="">Choose a template to auto-populate…</option>
            {QUICK_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-steel-600">Notes <span className="text-rust">*</span></label>
        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)} rows="4" required
          placeholder="What was discussed or actioned…"
          className="w-full rounded-lg border border-steel-200 px-3 py-2 text-sm focus:border-ink focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-steel-100 pt-3">
        <label className="flex items-center gap-2 text-sm text-steel-600">
          <input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} className="h-4 w-4 rounded border-steel-200" />
          Follow-up action required
        </label>
        {followUp && (
          <input
            type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} required={followUp}
            className="rounded-lg border border-steel-200 px-3 py-2 text-sm min-h-[44px] focus:border-ink focus:outline-none"
          />
        )}
      </div>

      <button type="submit" className="w-full rounded-lg bg-amber py-3 text-sm font-semibold text-white hover:bg-amber-600 min-h-[44px] transition-colors">
        Save Activity to Timeline
      </button>
    </form>
  );
}

function CorrespondenceLog({ job, currentUser, onAddEntry }) {
  const entries = useMemo(
    () => [...(job.correspondence || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [job.correspondence]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-3">
        <h3 className="font-display text-base font-semibold px-1">Communications Timeline</h3>
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-steel-200 bg-white p-8 text-center text-sm text-steel-400">
            No correspondence logged for this job yet.
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((c) => {
              const CIcon = CORR_ICON[c.type] || Icon.Doc;
              return (
                <div key={c.id} className="rounded-2xl border border-steel-200 bg-white p-4 flex gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${CORR_COLOR[c.type] || CORR_COLOR.Note}`}>
                    <CIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink">{c.type}</span>
                        {c.direction !== "N/A" && (
                          <span className="rounded-full bg-steel-100 px-2 py-0.5 text-[10px] font-medium text-steel-600 uppercase">{c.direction}</span>
                        )}
                        {c.followUp && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                            <Icon.Calendar className="h-3 w-3" /> Follow-up {formatDate(c.followUpDate)}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-steel-400" title={formatDateTime(c.createdAt)}>{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-steel-600 whitespace-pre-line">{c.notes}</p>
                    <p className="mt-1.5 text-[11px] text-steel-400">{c.staff} → {c.contact}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="lg:col-span-2">
        <LogActivityForm job={job} currentUser={currentUser} onAdd={onAddEntry} />
      </div>
    </div>
  );
}

/* ======================================================================
   JOB DETAIL VIEW
   ====================================================================== */

function JobDetail({ job, onBack, onUpdateStatus, onUpdateMedia, onStartDocument, onAddCorrespondence, currentUser }) {
  const [tab, setTab] = useState("overview");
  const { total } = calcTotals(job.lineItems, job.taxRate);
  const isAdmin = currentUser.role === "admin";
  const pendingFollowUps = (job.correspondence || []).filter((c) => c.followUp).length;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-steel-600 hover:text-ink min-h-[44px]">
        <Icon.Back className="h-4 w-4" /> Return to Pour Schedules
      </button>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-steel-200 pb-4">
        <div>
          <span className="font-mono-num text-xs text-steel-400">{job.id} Dashboard</span>
          <h1 className="font-display text-2xl font-bold text-ink">{job.customer}</h1>
          <p className="text-sm text-steel-600">{job.address}</p>
          <p className="text-xs text-steel-400 mt-1">Agent Details: {job.email} · {job.phone}</p>
        </div>
        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-3 bg-white p-3 rounded-xl border border-steel-100 sm:bg-transparent sm:border-0 sm:p-0">
          <select
            value={job.status}
            onChange={(e) => onUpdateStatus(e.target.value)}
            className="rounded-lg border border-steel-200 bg-white px-3 py-2 text-sm font-medium min-h-[44px] focus:border-ink focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="text-right">
            <span className="text-[10px] text-steel-600 block uppercase tracking-wider">Gross Contract Subtotal</span>
            {isAdmin ? (
              <span className="font-mono-num text-base md:text-lg font-bold text-ink">{currency(total)}</span>
            ) : (
              <span className="flex items-center gap-1 justify-end text-sm font-semibold text-steel-400"><Icon.Lock className="h-3.5 w-3.5" /> Restricted</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-steel-200 -mt-2 overflow-x-auto">
        {[
          { id: "overview", label: "Overview" },
          { id: "correspondence", label: `Correspondence${pendingFollowUps ? ` (${pendingFollowUps})` : ""}` },
        ].map((t) => (
          <button
            key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors min-h-[44px] ${tab === t.id ? "border-amber text-ink" : "border-transparent text-steel-600 hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">

            {/* Site Crew Section with tap-to-call buttons */}
            <div className="rounded-2xl border border-steel-200 bg-white p-5 space-y-3">
              <h3 className="font-display text-base font-semibold">Assigned Operatives &amp; On-Site Crew</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {job.siteCrew && job.siteCrew.length > 0 ? (
                  job.siteCrew.map((crew, i) => (
                    <div key={i} className="flex items-center justify-between border border-steel-100 p-3 rounded-xl bg-paper/50">
                      <div>
                        <h4 className="text-sm font-semibold text-ink">{crew.name}</h4>
                        <p className="text-xs text-steel-600">{crew.role}</p>
                      </div>
                      <a
                        href={`tel:${crew.phone}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-amber text-white hover:bg-amber-600 shadow-sm transition-transform active:scale-95"
                        title={`Call ${crew.name}`}
                      >
                        <Icon.Phone className="h-4 w-4" />
                      </a>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-steel-400 italic sm:col-span-2">No crew currently assigned to this pour.</p>
                )}
              </div>
              <LogisticsMap address={job.address} supplies={job.supplies} />
            </div>

            {/* Notes Block */}
            <div className="rounded-2xl border border-steel-200 bg-white p-5">
              <h3 className="font-display mb-2 text-base font-semibold">Engineering Remarks &amp; Variations</h3>
              <p className="text-sm text-steel-600 leading-relaxed">{job.notes || "No dynamic variations documented on-site yet."}</p>
            </div>

            {/* Media Records */}
            <BeforeAfterMedia media={job.media} onChange={onUpdateMedia} />
          </div>

          {/* Quantities/Valuation Trigger Column */}
          <div className="space-y-3 rounded-2xl border border-steel-200 bg-white p-5 h-fit shadow-sm">
            <h3 className="font-display text-base font-semibold">Financial Document Processing</h3>
            {isAdmin ? (
              <>
                <p className="text-sm text-steel-600">Draft variations or execute progress payment applications containing logged quantities.</p>
                <button
                  onClick={() => onStartDocument("Quote")}
                  className="w-full rounded-lg border border-steel-200 py-3 text-sm font-semibold hover:border-ink min-h-[44px] transition-colors"
                >
                  Draft Concrete Schedule / Quote
                </button>
                <button
                  onClick={() => onStartDocument("Invoice")}
                  className="w-full rounded-lg bg-amber py-3 text-sm font-semibold text-white hover:bg-amber-600 min-h-[44px] transition-colors"
                >
                  Generate VAT Invoice
                </button>
                <div className="border-t border-steel-100 pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-steel-600"><span>Billed to date</span><span className="font-mono-num">{currency(job.billedAmount)}</span></div>
                  <div className="flex justify-between text-steel-600"><span>Paid to date</span><span className="font-mono-num">{currency(job.paidAmount)}</span></div>
                  <div className="flex justify-between font-semibold text-ink"><span>Outstanding</span><span className="font-mono-num">{currency(job.billedAmount - job.paidAmount)}</span></div>
                </div>
              </>
            ) : (
              <RestrictedPanel label="Gross margin and billing tools are only visible to Administrators." />
            )}
          </div>
        </div>
      )}

      {tab === "correspondence" && (
        <CorrespondenceLog job={job} currentUser={currentUser} onAddEntry={onAddCorrespondence} />
      )}
    </div>
  );
}

/* ======================================================================
   QUOTE / INVOICE GENERATOR VIEW
   ====================================================================== */

function emptyLineItem() { return { id: uid(), description: "", qty: 1, unit: "m²", rate: 0 }; }

function GeneratorView({ initialDraft, onBack, onSave, onSendEmail, company }) {
  const [docType, setDocType] = useState(initialDraft?.docType || "Quote");
  const [customer, setCustomer] = useState({
    name: initialDraft?.customer || "",
    email: initialDraft?.email || "",
    address: initialDraft?.address || "",
  });
  const [lineItems, setLineItems] = useState(
    initialDraft?.lineItems?.length ? initialDraft.lineItems.map((li) => ({ ...li, id: li.id || uid() })) : [emptyLineItem()]
  );
  const [taxRate, setTaxRate] = useState(initialDraft?.taxRate ?? company.defaultVat ?? 20);
  const docNumber = useMemo(() => initialDraft?.jobId || `DRAFT-${Math.floor(1000 + Math.random() * 9000)}`, [initialDraft]);

  const { subtotal, tax, total } = calcTotals(lineItems, taxRate);

  const updateItem = (id, field, value) => {
    setLineItems((items) => items.map((li) => (li.id === id ? { ...li, [field]: value } : li)));
  };
  const addItem = () => setLineItems((items) => [...items, emptyLineItem()]);
  const removeItem = (id) => setLineItems((items) => items.filter((li) => li.id !== id));

  return (
    <div className="p-4 md:p-8 space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-steel-600 hover:text-ink min-h-[44px]">
        <Icon.Back className="h-4 w-4" /> Back
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">{docType === "Quote" ? "Quantities Schedule Master" : "VAT Valuation Statement"}</h1>
        <div className="flex overflow-hidden rounded-lg border border-steel-200 text-sm font-medium h-[44px]">
          {["Quote", "Invoice"].map((t) => (
            <button
              key={t} onClick={() => setDocType(t)}
              className={`px-4 py-2 transition-colors ${docType === t ? "bg-ink text-white" : "bg-white text-steel-600 hover:bg-paper"}`}
            >
              {t === "Quote" ? "Quote" : "Invoice"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* ---------- INTERACTIVE FORM INTERFACE ---------- */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-steel-200 bg-white p-5 space-y-3">
            <h3 className="font-display text-base font-semibold">Contractor Address Metrics</h3>
            <Field label="Client Contracting Entity" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
            <Field label="Valuation Accounts Email" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
            <Field label="Site Works Location / Postcode" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
          </div>

          <div className="rounded-2xl border border-steel-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold">Billable Quantities / Pricing Schedules</h3>
              <button onClick={addItem} className="flex items-center gap-1 text-sm font-medium text-amber hover:text-amber-600 min-h-[44px]">
                <Icon.Plus className="h-3.5 w-3.5" /> Add Concrete Item
              </button>
            </div>

            {/* Form Stack - Mobile Friendly Input Flow */}
            <div className="space-y-4">
              {lineItems.map((li, idx) => (
                <div key={li.id} className="p-3 border border-steel-100 rounded-xl bg-paper/30 space-y-2 relative">
                  <div className="absolute right-2 top-2">
                    <IconButton tone="danger" title="Remove line" onClick={() => removeItem(li.id)}>
                      <Icon.Trash className="h-4 w-4" />
                    </IconButton>
                  </div>
                  <span className="text-xs font-mono text-steel-400">Schedule Line Item #{idx + 1}</span>

                  <Field
                    label="Description of Concrete Works"
                    value={li.description}
                    placeholder="e.g., To lay 150mm thick RC35 concrete"
                    onChange={(e) => updateItem(li.id, "description", e.target.value)}
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Qty Vol" type="number" value={li.qty} onChange={(e) => updateItem(li.id, "qty", safeNum(e.target.value, 0))} />

                    <div>
                      <label className="mb-1 block text-xs font-medium text-steel-600">Unit Metric</label>
                      <select
                        value={li.unit}
                        onChange={(e) => updateItem(li.id, "unit", e.target.value)}
                        className="w-full rounded-lg border border-steel-200 px-2 py-2.5 text-sm min-h-[44px] focus:border-ink bg-white focus:outline-none"
                      >
                        <option value="m²">m²</option>
                        <option value="m³">m³</option>
                        <option value="days">days</option>
                        <option value="sum">sum</option>
                      </select>
                    </div>

                    <Field label="Rate (£)" type="number" step="0.01" value={li.rate} onChange={(e) => updateItem(li.id, "rate", safeNum(e.target.value, 0))} />
                  </div>
                  <div className="text-right pt-1 font-mono-num text-xs text-steel-600">
                    Line Total: {currency(safeNum(li.qty) * safeNum(li.rate))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-end gap-3 border-t border-steel-100 pt-4 text-sm">
              <label className="text-steel-600">VAT rate (%)</label>
              <input
                type="number" min="0" step="1" value={taxRate}
                onChange={(e) => setTaxRate(safeNum(e.target.value, 0))}
                className="w-20 rounded-lg border border-steel-200 px-2 py-2 text-right font-mono-num min-h-[44px] focus:border-ink focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onSave({ docType, docNumber, customer, lineItems, taxRate, subtotal, tax, total })}
              className="flex-1 rounded-lg border border-steel-200 py-3 text-sm font-semibold hover:border-ink min-h-[44px] transition-colors"
            >
              Commit Data Store
            </button>
            <button
              onClick={() => onSendEmail({ docType, docNumber, customer, lineItems, taxRate, subtotal, tax, total })}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber py-3 text-sm font-semibold text-white hover:bg-amber-600 min-h-[44px] transition-colors"
            >
              <Icon.Send className="h-4 w-4" /> Send PDF Ledger
            </button>
          </div>
        </div>

        {/* ---------- LIVE UK DOCUMENT PREVIEW PANEL ---------- */}
        <div className="xl:sticky xl:top-8 h-fit">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-steel-600">Live Compliant PDF Mirror View</p>
          <div className="rounded-2xl bg-white p-4 md:p-8 shadow-md border border-steel-100 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-steel-200 pb-6">
              <div>
                <p className="font-display text-lg font-bold">{company.name}</p>
                <p className="text-xs text-steel-600">Company No. {company.regNumber}</p>
                <p className="text-xs text-steel-600">VAT Reg No. {company.vatNumber}</p>
                <p className="text-xs text-steel-400">{company.email}</p>
              </div>
              <div className="sm:text-right">
                <p className="font-display text-xl font-bold uppercase tracking-wide text-amber">{docType === "Quote" ? "Slab Quote" : "VAT Invoice"}</p>
                <p className="font-mono-num text-xs text-steel-600">Reference: #{docNumber}</p>
                <p className="font-mono-num text-xs text-steel-400">Tax Point Date: {new Date().toLocaleDateString("en-GB")}</p>
              </div>
            </div>

            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-steel-400">Client / Main Contractor Billing Address</p>
              <p className="font-medium text-sm">{customer.name || "Awaiting Main Contractor Name"}</p>
              <p className="text-xs text-steel-600">{customer.address || "No site address mapping matched."}</p>
              <p className="text-xs text-steel-600">{customer.email || "accounts-payable@contractor.co.uk"}</p>
            </div>

            {/* Render Ledger Breakdown Lines */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[400px]">
                <thead>
                  <tr className="border-b border-steel-200 text-steel-400 font-medium">
                    <th className="pb-2">Description of Structural Elements</th>
                    <th className="pb-2 text-right">Volume / Qty</th>
                    <th className="pb-2 text-center">Unit</th>
                    <th className="pb-2 text-right">Unit Rate</th>
                    <th className="pb-2 text-right">Net Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel-100 font-mono-num text-steel-600">
                  {lineItems.map((li) => (
                    <tr key={li.id}>
                      <td className="py-2.5 font-body text-ink text-xs max-w-[180px] truncate">{li.description || <span className="text-steel-300 italic">Empty line detail</span>}</td>
                      <td className="py-2.5 text-right">{safeNum(li.qty)}</td>
                      <td className="py-2.5 text-center font-body">{li.unit}</td>
                      <td className="py-2.5 text-right">{currency(safeNum(li.rate))}</td>
                      <td className="py-2.5 text-right text-ink font-medium">{currency(safeNum(li.qty) * safeNum(li.rate))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ml-auto mt-4 w-60 space-y-1.5 text-xs border-t border-steel-200 pt-3">
              <div className="flex justify-between text-steel-600"><span>Net Subtotal</span><span className="font-mono-num">{currency(subtotal)}</span></div>
              <div className="flex justify-between text-steel-600"><span>UK Standard VAT ({taxRate}%)</span><span className="font-mono-num">{currency(tax)}</span></div>
              <div className="flex justify-between pt-1.5 font-display text-sm font-bold border-t border-dashed border-steel-200"><span>Total Certified Due</span><span className="font-mono-num text-amber">{currency(total)}</span></div>
            </div>

            <div className="bg-paper p-3 rounded-xl border border-steel-100 text-[11px] text-steel-600 space-y-1">
              <span className="font-bold text-ink block">Standard Terms &amp; Pour Conditions:</span>
              <p>• All concrete materials, placement pumps and dedicated washing skip arrays to be provided entirely by the client unless listed above.</p>
              <p>• Value includes provision of CSCS accredited finishers &amp; plant operators.</p>
              <p>• {company.paymentTerms}</p>
            </div>

            <div className="border-t border-dashed border-steel-200 pt-3 text-[11px] text-steel-600 space-y-0.5">
              <span className="font-bold text-ink block mb-1">Banking Details</span>
              <p>{company.bankName} · {company.accountName}</p>
              <p>Sort Code {company.sortCode} · Acc No. {company.accountNumber}</p>
              <p>IBAN {company.iban}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================================================================
   ADMIN SUITE — BUSINESS PROFILE + FINANCIAL HEALTH LEDGER
   ====================================================================== */

function BusinessProfileTab({ company, onChange, showToast }) {
  const [form, setForm] = useState(company);
  const [saving, setSaving] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const updateNum = (field) => (e) => setForm({ ...form, [field]: safeNum(e.target.value, 0) });

  const save = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      onChange(form);
      setSaving(false);
      showToast("Business profile & letterhead configuration saved", "success");
    }, 500);
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="rounded-2xl border border-steel-200 bg-white p-5 space-y-4">
        <h3 className="font-display text-base font-semibold flex items-center gap-2"><Icon.Building className="h-4 w-4 text-amber" /> Company Registration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Registered Company Name" value={form.name} onChange={update("name")} required />
          <Field label="Company Registration Number" value={form.regNumber} onChange={update("regNumber")} />
          <Field label="VAT Registration Number" value={form.vatNumber} onChange={update("vatNumber")} />
          <Field label="Default VAT Rate (%)" type="number" value={form.defaultVat} onChange={updateNum("defaultVat")} />
          <Field label="Registered Address" value={form.address} onChange={update("address")} className="sm:col-span-2" />
          <Field label="Operations Email" type="email" value={form.email} onChange={update("email")} />
          <Field label="Operations Phone" value={form.phone} onChange={update("phone")} />
        </div>
      </div>

      <div className="rounded-2xl border border-steel-200 bg-white p-5 space-y-4">
        <h3 className="font-display text-base font-semibold flex items-center gap-2"><Icon.Card className="h-4 w-4 text-amber" /> Payment Banking Terms</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Bank Name" value={form.bankName} onChange={update("bankName")} />
          <Field label="Account Name" value={form.accountName} onChange={update("accountName")} />
          <Field label="Sort Code" value={form.sortCode} onChange={update("sortCode")} />
          <Field label="Account Number" value={form.accountNumber} onChange={update("accountNumber")} />
          <Field label="IBAN" value={form.iban} onChange={update("iban")} className="sm:col-span-2" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-steel-600">Standard Payment Terms (shown on letterhead)</label>
          <textarea value={form.paymentTerms} onChange={update("paymentTerms")} rows="2" className="w-full rounded-lg border border-steel-200 px-3 py-2 text-sm focus:border-ink focus:outline-none" />
        </div>
      </div>

      <button type="submit" disabled={saving} className="flex items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white min-h-[44px] hover:bg-ink-50 transition-colors disabled:opacity-60">
        {saving ? (<><span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span> Saving…</>) : (<><Icon.Check className="h-4 w-4" /> Save Business Profile</>)}
      </button>
    </form>
  );
}

function FinancialHealthLedger({ jobs }) {
  const stats = useMemo(() => {
    let activeQuotes = 0, activeQuoteValue = 0, billed = 0, paid = 0, grossActive = 0;
    jobs.forEach((j) => {
      const { total } = calcTotals(j.lineItems, j.taxRate);
      if (j.status === "Quote Pending") { activeQuotes += 1; activeQuoteValue += total; }
      if (j.status !== "Completed") grossActive += total;
      billed += safeNum(j.billedAmount);
      paid += safeNum(j.paidAmount);
    });
    return { activeQuotes, activeQuoteValue, billed, paid, outstanding: billed - paid, grossActive };
  }, [jobs]);

  const rows = useMemo(() => jobs.map((j) => {
    const { total } = calcTotals(j.lineItems, j.taxRate);
    return { ...j, total, outstanding: safeNum(j.billedAmount) - safeNum(j.paidAmount) };
  }), [jobs]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Active Quotes" value={stats.activeQuotes} icon={Icon.Doc} />
        <StatCard label="Quoted Value" value={currency(stats.activeQuoteValue)} mono tone="amber" icon={Icon.Trend} />
        <StatCard label="Total Billed" value={currency(stats.billed)} mono tone="denim" icon={Icon.Card} />
        <StatCard label="Paid vs Outstanding" value={`${currency(stats.paid)} / ${currency(stats.outstanding)}`} mono tone="forest" icon={Icon.Wallet} />
      </div>

      <div className="rounded-2xl border border-steel-200 bg-white p-5">
        <h3 className="font-display text-base font-semibold mb-1">Gross Project Metrics</h3>
        <p className="text-sm text-steel-600 mb-4">Aggregate contract value currently active across all non-completed pour schedules.</p>
        <p className="font-mono-num text-2xl font-bold text-ink">{currency(stats.grossActive)}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-steel-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-steel-200 bg-steel-100/60 text-xs uppercase tracking-wide text-steel-600">
              <th className="px-5 py-3 font-medium">Job Ref</th>
              <th className="px-5 py-3 font-medium">Client</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Contract Value</th>
              <th className="px-5 py-3 font-medium text-right">Billed</th>
              <th className="px-5 py-3 font-medium text-right">Paid</th>
              <th className="px-5 py-3 font-medium text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((j) => (
              <tr key={j.id} className="border-b border-steel-100 last:border-0">
                <td className="px-5 py-3 font-mono-num text-xs text-steel-600">{j.id}</td>
                <td className="px-5 py-3 font-medium text-ink">{j.customer}</td>
                <td className="px-5 py-3"><StatusBadge status={j.status} /></td>
                <td className="px-5 py-3 text-right font-mono-num">{currency(j.total)}</td>
                <td className="px-5 py-3 text-right font-mono-num">{currency(j.billedAmount)}</td>
                <td className="px-5 py-3 text-right font-mono-num text-forest">{currency(j.paidAmount)}</td>
                <td className={`px-5 py-3 text-right font-mono-num font-semibold ${j.outstanding > 0 ? "text-rust" : "text-steel-400"}`}>{currency(j.outstanding)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminSettings({ jobs, company, onChangeCompany, showToast, onBack }) {
  const [tab, setTab] = useState("profile");

  return (
    <div className="p-4 md:p-8 space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-steel-600 hover:text-ink min-h-[44px]">
        <Icon.Back className="h-4 w-4" /> Back
      </button>

      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Icon.Settings className="h-5 w-5 text-amber" /> Company Administration Suite</h1>
        <p className="text-sm text-steel-600">Business profile, letterhead configuration and executive financial analytics.</p>
      </div>

      <div className="flex gap-1 border-b border-steel-200 overflow-x-auto">
        {[
          { id: "profile", label: "Business Profile" },
          { id: "ledger", label: "Financial Health Ledger" },
        ].map((t) => (
          <button
            key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors min-h-[44px] ${tab === t.id ? "border-amber text-ink" : "border-transparent text-steel-600 hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && <BusinessProfileTab company={company} onChange={onChangeCompany} showToast={showToast} />}
      {tab === "ledger" && <FinancialHealthLedger jobs={jobs} />}
    </div>
  );
}

/* ======================================================================
   ROOT MANAGEMENT GATEWAY
   ====================================================================== */

const SESSION_SECONDS = 20 * 60;

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [jobs, setJobs] = useState(initialJobs);
  const [company, setCompany] = useState(DEFAULT_COMPANY);
  const [view, setView] = useState("dashboard");
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [generatorDraft, setGeneratorDraft] = useState(null);
  const [toast, setToast] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Session inactivity timeout
  useEffect(() => {
    if (!currentUser) return;
    const resetTimer = () => setSecondsLeft(SESSION_SECONDS);
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          setCurrentUser(null);
          setView("dashboard");
          showToast("Session expired due to inactivity. Please sign in again.", "error");
          return SESSION_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
      clearInterval(interval);
    };
  }, [currentUser]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setSecondsLeft(SESSION_SECONDS);
    setView("dashboard");
    showToast(`Signed in as ${user.name} (${ROLES[user.role].label})`, "success");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView("dashboard");
    setSelectedJobId(null);
    showToast("You have been signed out", "info");
  };

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || null;

  const handleCreateJob = (form) => {
    const newJob = {
      id: `JOB-${1045 + jobs.length}`,
      customer: form.customer,
      email: form.email,
      phone: form.phone,
      address: form.address,
      status: "Quote Pending",
      createdAt: new Date().toISOString().slice(0, 10),
      notes: form.notes,
      siteCrew: [{ name: "Danny Vance", role: "Site Supervisor", phone: "07711 987654" }],
      lineItems: [],
      taxRate: company.defaultVat,
      media: { before: [], after: [] },
      supplies: [{ name: "Local Merchant Alternative", type: "Merchants" }],
      billedAmount: 0,
      paidAmount: 0,
      correspondence: [],
    };
    setJobs((js) => [newJob, ...js]);
    showToast(`Pour record provisioned for ${form.customer}`, "success");
  };

  const handleStartDocument = (job, docType) => {
    setGeneratorDraft({
      docType, jobId: job.id, customer: job.customer, email: job.email, address: job.address, lineItems: job.lineItems, taxRate: job.taxRate,
    });
    setView("generator");
  };

  const handleAddCorrespondence = (entry) => {
    setJobs((js) => js.map((j) => j.id === selectedJobId ? { ...j, correspondence: [...(j.correspondence || []), entry] } : j));
    showToast("Correspondence logged to job timeline", "success");
  };

  if (!currentUser) {
    return <AuthGateway onLogin={handleLogin} />;
  }

  const guardedView = (view === "admin" && currentUser.role !== "admin") ? "dashboard" : view;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-paper antialiased selection:bg-amber/20">
      <Navigation
        view={guardedView} onNavigate={(v) => setView(v)} jobCount={jobs.length}
        user={currentUser} secondsLeft={secondsLeft} onLogout={handleLogout}
      />

      <main className="flex-1 overflow-y-auto">
        {guardedView === "dashboard" && (
          <Dashboard jobs={jobs} onCreateJob={handleCreateJob} onSelectJob={(id) => { setSelectedJobId(id); setView("job"); }} user={currentUser} />
        )}

        {guardedView === "job" && selectedJob && (
          <JobDetail
            job={selectedJob}
            currentUser={currentUser}
            onBack={() => setView("dashboard")}
            onUpdateStatus={(status) => { setJobs(js => js.map(j => j.id === selectedJob.id ? {...j, status} : j)); showToast(`Job state mapped to ${status}`, "success"); }}
            onUpdateMedia={(media) => setJobs(js => js.map(j => j.id === selectedJob.id ? {...j, media} : j))}
            onStartDocument={(docType) => handleStartDocument(selectedJob, docType)}
            onAddCorrespondence={handleAddCorrespondence}
          />
        )}

        {guardedView === "generator" && (
          <GeneratorView
            initialDraft={generatorDraft}
            company={company}
            onBack={() => setView(generatorDraft?.jobId ? "job" : "dashboard")}
            onSave={(payload) => { showToast("Quantities saved successfully to project ledger", "success"); }}
            onSendEmail={(payload) => { showToast(`Valuation dispatch simulated to ${payload.customer.email || "agent"}`, "success"); }}
          />
        )}

        {guardedView === "admin" && currentUser.role === "admin" && (
          <AdminSettings
            jobs={jobs} company={company}
            onChangeCompany={(c) => setCompany(c)}
            showToast={showToast}
            onBack={() => setView("dashboard")}
          />
        )}
      </main>

      <Toast toast={toast} />
    </div>
  );
}

export { App as OpusFormApp };
export default App;
