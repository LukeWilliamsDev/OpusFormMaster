import { useMemo, useRef, useState, type ChangeEvent, type ReactNode, type SVGProps } from "react";

/* ============================================================
   TYPES
   ============================================================ */

type Status = "Quote Pending" | "In Progress" | "Awaiting Invoice" | "Completed";

interface LineItem {
  id: string | number;
  description: string;
  qty: number;
  unit: string;
  rate: number;
}

interface CrewMember {
  name: string;
  role: string;
  phone: string;
}

interface Supply {
  name: string;
  type: string;
}

interface MediaImage {
  id: string;
  url: string;
  name?: string;
}

interface JobMedia {
  before: MediaImage[];
  after: MediaImage[];
}

interface Job {
  id: string;
  customer: string;
  email: string;
  phone: string;
  address: string;
  status: Status;
  createdAt: string;
  notes: string;
  siteCrew: CrewMember[];
  lineItems: LineItem[];
  taxRate: number;
  media: JobMedia;
  supplies: Supply[];
}

type DocType = "Quote" | "Invoice";

interface GeneratorDraft {
  docType: DocType;
  jobId?: string;
  customer: string;
  email: string;
  address: string;
  lineItems: LineItem[];
  taxRate: number;
}

interface ToastState {
  message: string;
  type: "success" | "info" | "error";
}

/* ============================================================
   MOCK DATA
   ============================================================ */

const STATUS_OPTIONS: Status[] = ["Quote Pending", "In Progress", "Awaiting Invoice", "Completed"];

const STATUS_STYLES: Record<Status, { bg: string; text: string; dot: string }> = {
  "Quote Pending": { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber" },
  "In Progress": { bg: "bg-denim-50", text: "text-denim", dot: "bg-denim" },
  "Awaiting Invoice": { bg: "bg-rust-50", text: "text-rust", dot: "bg-rust" },
  Completed: { bg: "bg-forest-50", text: "text-forest", dot: "bg-forest" },
};

const initialJobs: Job[] = [
  {
    id: "JOB-1042",
    customer: "StudWelders",
    email: "accounts@studwelders.co.uk",
    phone: "01482 867123",
    address: "Ashcourt, Hull, HU15 1SG",
    status: "In Progress",
    createdAt: "2026-06-18",
    notes:
      "Mezzanine Deck Floor Slab — Labour Only. Assumed total pours up to 1; additional pours charged at a minimum of £3,500. Cancelled pours with less than 24hrs notice will be charged.",
    siteCrew: [
      { name: "Danny Vance", role: "Site Supervisor", phone: "07711 987654" },
      { name: "Lee Cooper", role: "Finisher / Powerfloat Specialist", phone: "07843 210987" },
    ],
    lineItems: [
      { id: 1, description: "To lay 150mm thick RC35 concrete", qty: 625, unit: "m²", rate: 4.8 },
      { id: 2, description: "To lay and tie 1 layer A252 mesh", qty: 625, unit: "m²", rate: 3.0 },
      { id: 3, description: "To power float finish concrete surface", qty: 625, unit: "m²", rate: 1.0 },
      { id: 4, description: "Task lighting, column protection, priming cement & washout skip polythene", qty: 1, unit: "sum", rate: 750.0 },
    ],
    taxRate: 20,
    media: { before: [], after: [] },
    supplies: [
      { name: "Jewson Hull (Supplies)", type: "Merchants" },
      { name: "Speedy Hire Hull (Mini-pumps & Tools)", type: "Tool & Pump" },
      { name: "Ashcourt Ready Mix Concrete", type: "Concrete" },
    ],
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
    siteCrew: [{ name: "Tom Knowles", role: "Pump Operator / Subcontractor", phone: "07911 555333" }],
    lineItems: [
      { id: 1, description: "Concrete Pump Hire (Half Day)", qty: 1, unit: "sum", rate: 450.0 },
      { id: 2, description: "Class 1 Slab Pour - RC35 Concrete", qty: 8, unit: "m³", rate: 220.0 },
    ],
    taxRate: 20,
    media: { before: [], after: [] },
    supplies: [
      { name: "Travis Perkins Birmingham", type: "Merchants" },
      { name: "Brandon Hire Station", type: "Tool & Pump" },
      { name: "Cemex Concrete Plant", type: "Concrete" },
    ],
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
      { name: "Sam West", role: "Operative", phone: "07522 888111" },
    ],
    lineItems: [
      { id: 1, description: "Commercial Slab Prep & Operative Labour (Day Rate)", qty: 4, unit: "days", rate: 240.0 },
      { id: 2, description: "Site Supervisor Rate", qty: 2, unit: "days", rate: 280.0 },
    ],
    taxRate: 20,
    media: { before: [], after: [] },
    supplies: [
      { name: "Selco Builders Warehouse", type: "Merchants" },
      { name: "HSS Hire", type: "Tool & Pump" },
      { name: "London Ready Mix Concrete", type: "Concrete" },
    ],
  },
];

const currency = (n: number) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });

const calcTotals = (lineItems: LineItem[], taxRate: number) => {
  const subtotal = lineItems.reduce((sum, li) => sum + li.qty * li.rate, 0);
  const tax = subtotal * (taxRate / 100);
  return { subtotal, tax, total: subtotal + tax };
};

const uid = () => Math.random().toString(36).slice(2, 9);

/* ============================================================
   SHARED UI
   ============================================================ */

function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES["Quote Pending"];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`}></span>
      {status}
    </span>
  );
}

function IconButton({
  onClick,
  title,
  children,
  tone = "default",
}: {
  onClick?: () => void;
  title: string;
  children: ReactNode;
  tone?: "default" | "danger";
}) {
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

const Icon = {
  Plus: (p: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Trash: (p: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-.8 12.2A2 2 0 0 1 16.2 21H7.8a2 2 0 0 1-2-1.8L5 6" />
    </svg>
  ),
  Back: (p: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
  Send: (p: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
    </svg>
  ),
  Upload: (p: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 16V4m0 0 4 4m-4-4-4 4M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  ),
  Jobs: (p: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 7h18M3 12h18M3 17h18" />
    </svg>
  ),
  Doc: (p: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 2h9l5 5v15H6z" />
      <path d="M15 2v5h5" />
    </svg>
  ),
  Close: (p: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  Menu: (p: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Phone: (p: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  MapPin: (p: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
};

function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  const toneMap = {
    success: "bg-forest text-white",
    info: "bg-ink text-white",
    error: "bg-rust text-white",
  } as const;
  return (
    <div className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-lg px-4 py-3 text-sm shadow-lg ${toneMap[toast.type] || toneMap.info}`}>
      {toast.message}
    </div>
  );
}

/* ============================================================
   NAVIGATION
   ============================================================ */

function Navigation({
  view,
  onNavigate,
  jobCount,
}: {
  view: string;
  onNavigate: (v: "dashboard" | "generator") => void;
  jobCount: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => {
          onNavigate("dashboard");
          setIsOpen(false);
        }}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]
          ${view === "dashboard" || view === "job" ? "bg-white/10 text-white" : "text-steel-400 hover:bg-white/5 hover:text-white"}`}
      >
        <Icon.Jobs className="h-4 w-4" />
        <span className="flex-1 text-left">Job Dashboard</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-mono-num text-steel-400">{jobCount}</span>
      </button>
      <button
        onClick={() => {
          onNavigate("generator");
          setIsOpen(false);
        }}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]
          ${view === "generator" ? "bg-white/10 text-white" : "text-steel-400 hover:bg-white/5 hover:text-white"}`}
      >
        <Icon.Doc className="h-4 w-4" />
        <span className="flex-1 text-left">New Quote / Invoice</span>
      </button>
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex h-screen w-64 shrink-0 flex-col bg-ink px-4 py-6 text-white">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber font-display text-sm font-bold text-white">OF</div>
          <div>
            <p className="font-display text-sm font-semibold tracking-wide text-white leading-tight">Opus Form</p>
            <p className="text-[11px] text-steel-400 leading-tight">Concrete Specialists</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">{navLinks}</nav>
        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-xs text-steel-400">Region Workspace</p>
          <p className="text-sm font-medium text-white">UK Operations (VAT 20%)</p>
        </div>
      </aside>

      <header className="flex md:hidden w-full h-16 bg-ink text-white items-center justify-between px-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber font-display text-sm font-bold text-white">OF</div>
          <p className="font-display text-sm font-semibold tracking-wide text-white">Opus Form</p>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-steel-200 min-h-[44px] min-w-[44px]">
          {isOpen ? <Icon.Close className="h-6 w-6" /> : <Icon.Menu className="h-6 w-6" />}
        </button>
      </header>

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

/* ============================================================
   LOGISTICS MAP
   ============================================================ */

function LogisticsMap({ address, supplies }: { address: string; supplies: Supply[] }) {
  const [filter, setFilter] = useState<"All" | "Concrete" | "Tool & Pump" | "Merchants">("All");
  const filteredSupplies = useMemo(() => {
    if (filter === "All") return supplies ?? [];
    return (supplies ?? []).filter((s) => s.type === filter);
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
          {(["All", "Concrete", "Tool & Pump", "Merchants"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-2.5 py-1 rounded-md transition-colors ${filter === t ? "bg-amber text-white shadow-sm" : "text-steel-600 hover:text-ink"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full h-44 rounded-xl border border-steel-200 relative overflow-hidden bg-slate-100 flex flex-col justify-between p-3">
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(#1A1A1A 1px, transparent 1px)", backgroundSize: "16px 16px" }}
        ></div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full space-y-1">
          <div className="bg-ink text-white px-2 py-1 rounded shadow text-[11px] font-mono-num flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber animate-pulse"></span> Target Pour Site
          </div>
          <p className="text-[10px] text-steel-600 text-center px-6">Access routes optimized for 8m³ Ready-Mix Agitators</p>
        </div>

        <div className="z-10 bg-white/90 backdrop-blur-sm p-2 rounded-lg border border-steel-100 text-[11px] font-mono-num space-y-1">
          <span className="text-xs font-semibold block text-ink">Nearby Logistics Assets:</span>
          {filteredSupplies.length === 0 ? (
            <span className="text-steel-400 italic">No resource filters active matching choice.</span>
          ) : (
            filteredSupplies.map((s, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-steel-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span>
                  {s.name} <span className="text-[10px] text-steel-400">({s.type})</span>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MEDIA UPLOADER
   ============================================================ */

const ACCENT_CLASSES = {
  denim: { border: "border-denim", bg: "bg-denim-50" },
  forest: { border: "border-forest", bg: "bg-forest-50" },
} as const;

function DropZone({
  label,
  images,
  onAddFiles,
  onRemove,
  accent,
}: {
  label: string;
  images: MediaImage[];
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  accent: keyof typeof ACCENT_CLASSES;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const accentCls = ACCENT_CLASSES[accent];

  return (
    <div className="flex-1 min-w-0">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-sm font-semibold tracking-wide uppercase text-ink">{label}</p>
        <span className="font-mono-num text-xs text-steel-600">
          {images.length} photo{images.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
          if (files.length) onAddFiles(files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center min-h-[110px] flex flex-col justify-center transition-colors
          ${dragging ? `${accentCls.border} ${accentCls.bg}` : "border-steel-200 bg-white hover:border-steel-400"}`}
      >
        <Icon.Upload className="mx-auto mb-2 h-6 w-6 text-steel-400" />
        <p className="text-sm text-steel-600">
          <span className="font-medium text-ink">Tap to add</span> or drag pour records
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
            if (files.length) onAddFiles(files);
            e.target.value = "";
          }}
        />
      </div>

      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {images.map((img) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border border-steel-200 bg-steel-100">
              <img src={img.url} alt="Pour media" className="h-full w-full object-cover" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(img.id);
                }}
                className="absolute right-1 top-1 h-7 w-7 flex items-center justify-center rounded-full bg-ink/80 text-white"
              >
                <Icon.Close className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BeforeAfterMedia({ media, onChange }: { media: JobMedia; onChange: (m: JobMedia) => void }) {
  const addFiles = (type: keyof JobMedia) => (files: File[]) => {
    const newImages: MediaImage[] = files.map((f) => ({ id: uid(), url: URL.createObjectURL(f), name: f.name }));
    onChange({ ...media, [type]: [...media[type], ...newImages] });
  };
  const removeImage = (type: keyof JobMedia) => (id: string) => {
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

/* ============================================================
   FORM PRIMITIVES
   ============================================================ */

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
}

function Field({ label, required, ...props }: FieldProps) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-steel-600">
        {label} {required && <span className="text-rust">*</span>}
      </label>
      <input
        {...props}
        className="w-full rounded-lg border border-steel-200 px-3 py-2.5 text-sm min-h-[44px] focus:border-ink focus:outline-none"
      />
    </div>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */

function NewJobModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (form: { customer: string; email: string; phone: string; address: string; notes: string }) => void;
}) {
  const [form, setForm] = useState({ customer: "", email: "", phone: "", address: "", notes: "" });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Schedule Site Mix / Pour Job</h3>
          <IconButton onClick={onClose} title="Close">
            <Icon.Close className="h-4 w-4" />
          </IconButton>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (form.customer.trim()) onCreate(form);
          }}
          className="space-y-3"
        >
          <Field label="Customer Main Contractor" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} required />
          <Field label="Invoicing Email Address" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Field label="Site Agent Mobile" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Field label="UK Site Postcode & Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div>
            <label className="mb-1 block text-xs font-medium text-steel-600">Pour Specifications / Directives</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-steel-200 px-3 py-2 text-sm min-h-[44px] focus:border-ink focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-amber py-3 text-sm font-semibold text-white hover:bg-amber-600 min-h-[44px] transition-colors"
          >
            Authorize &amp; Provision Job
          </button>
        </form>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone, mono }: { label: string; value: string | number; tone?: "amber" | "rust" | "denim"; mono?: boolean }) {
  const toneText = tone ? { amber: "text-amber", rust: "text-rust", denim: "text-denim" }[tone] : "text-ink";
  return (
    <div className="rounded-2xl border border-steel-200 bg-white p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-steel-600">{label}</p>
      <p className={`mt-1 font-display text-base md:text-xl font-bold truncate ${toneText} ${mono ? "font-mono-num" : ""}`}>{value}</p>
    </div>
  );
}

function Dashboard({
  jobs,
  onSelectJob,
  onCreateJob,
}: {
  jobs: Job[];
  onSelectJob: (id: string) => void;
  onCreateJob: (form: { customer: string; email: string; phone: string; address: string; notes: string }) => void;
}) {
  const [showModal, setShowModal] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = { total: jobs.length };
    STATUS_OPTIONS.forEach((s) => (c[s] = jobs.filter((j) => j.status === s).length));
    return c;
  }, [jobs]);

  const outstanding = useMemo(
    () => jobs.reduce((sum, j) => sum + calcTotals(j.lineItems, j.taxRate).total * (j.status === "Completed" ? 0 : 1), 0),
    [jobs]
  );

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Projects" value={counts.total} />
        <StatCard label="Quotes Out" value={counts["Quote Pending"]} tone="amber" />
        <StatCard label="Pours Pending Bill" value={counts["Awaiting Invoice"]} tone="rust" />
        <StatCard label="Slab Value (Ex VAT)" value={currency(outstanding)} mono tone="denim" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-steel-200 bg-white shadow-sm">
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
                  <span className="font-mono-num font-medium text-sm text-ink">{currency(total)}</span>
                </div>
              </div>
            );
          })}
        </div>

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
                <tr
                  key={job.id}
                  onClick={() => onSelectJob(job.id)}
                  className="cursor-pointer border-b border-steel-100 last:border-0 hover:bg-paper transition-colors"
                >
                  <td className="px-5 py-4 font-mono-num text-xs text-steel-600">{job.id}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-ink">{job.customer}</p>
                    <p className="text-xs text-steel-600">{job.address}</p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-5 py-4 text-right font-mono-num font-medium">
                    {job.status === "Completed" ? currency(0) : currency(total)}
                  </td>
                  <td className="px-5 py-4 text-right text-xs font-medium text-amber">Manage Field →</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <NewJobModal
          onClose={() => setShowModal(false)}
          onCreate={(form) => {
            onCreateJob(form);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
   JOB DETAIL
   ============================================================ */

function JobDetail({
  job,
  onBack,
  onUpdateStatus,
  onUpdateMedia,
  onStartDocument,
}: {
  job: Job;
  onBack: () => void;
  onUpdateStatus: (status: Status) => void;
  onUpdateMedia: (media: JobMedia) => void;
  onStartDocument: (docType: DocType) => void;
}) {
  const { total } = calcTotals(job.lineItems, job.taxRate);

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
          <p className="text-xs text-steel-400 mt-1">
            Agent Details: {job.email} · {job.phone}
          </p>
        </div>
        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-3 bg-white p-3 rounded-xl border border-steel-100 sm:bg-transparent sm:border-0 sm:p-0">
          <select
            value={job.status}
            onChange={(e) => onUpdateStatus(e.target.value as Status)}
            className="rounded-lg border border-steel-200 bg-white px-3 py-2 text-sm font-medium min-h-[44px] focus:border-ink focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="text-right">
            <span className="text-[10px] text-steel-600 block uppercase tracking-wider">Gross Contract Subtotal</span>
            <span className="font-mono-num text-base md:text-lg font-bold text-ink">{currency(total)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
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
                <p className="text-sm text-steel-400 italic col-span-2">
                  No active steel fixers or power float engineers provisioned to site.
                </p>
              )}
            </div>
          </div>

          <LogisticsMap address={job.address} supplies={job.supplies} />

          <div className="rounded-2xl border border-steel-200 bg-white p-5">
            <h3 className="font-display mb-2 text-base font-semibold">Engineering Remarks &amp; Variations</h3>
            <p className="text-sm text-steel-600 leading-relaxed">{job.notes || "No dynamic variations documented on-site yet."}</p>
          </div>

          <BeforeAfterMedia media={job.media} onChange={onUpdateMedia} />
        </div>

        <div className="space-y-3 rounded-2xl border border-steel-200 bg-white p-5 h-fit shadow-sm">
          <h3 className="font-display text-base font-semibold">Financial Document Processing</h3>
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
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   GENERATOR
   ============================================================ */

function emptyLineItem(): LineItem {
  return { id: uid(), description: "", qty: 1, unit: "m²", rate: 0 };
}

function GeneratorView({
  initialDraft,
  onBack,
  onSave,
  onSendEmail,
}: {
  initialDraft: GeneratorDraft | null;
  onBack: () => void;
  onSave: (payload: unknown) => void;
  onSendEmail: (payload: { customer: { email: string } } & Record<string, unknown>) => void;
}) {
  const [docType, setDocType] = useState<DocType>(initialDraft?.docType ?? "Quote");
  const [customer, setCustomer] = useState({
    name: initialDraft?.customer ?? "",
    email: initialDraft?.email ?? "",
    address: initialDraft?.address ?? "",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initialDraft?.lineItems?.length ? initialDraft.lineItems.map((li) => ({ ...li, id: li.id || uid() })) : [emptyLineItem()]
  );
  const [taxRate, setTaxRate] = useState<number>(initialDraft?.taxRate ?? 20);
  const docNumber = useMemo(
    () => initialDraft?.jobId || `DRAFT-${Math.floor(1000 + Math.random() * 9000)}`,
    [initialDraft]
  );

  const { subtotal, tax, total } = calcTotals(lineItems, taxRate);

  const updateItem = (id: LineItem["id"], field: keyof LineItem, value: string | number) => {
    setLineItems((items) => items.map((li) => (li.id === id ? { ...li, [field]: value } : li)));
  };
  const addItem = () => setLineItems((items) => [...items, emptyLineItem()]);
  const removeItem = (id: LineItem["id"]) => setLineItems((items) => items.filter((li) => li.id !== id));

  return (
    <div className="p-4 md:p-8 space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-steel-600 hover:text-ink min-h-[44px]">
        <Icon.Back className="h-4 w-4" /> Back
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">
          {docType === "Quote" ? "Quantities Schedule Master" : "VAT Valuation Statement"}
        </h1>
        <div className="flex overflow-hidden rounded-lg border border-steel-200 text-sm font-medium h-[44px]">
          {(["Quote", "Invoice"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setDocType(t)}
              className={`px-4 py-2 transition-colors ${docType === t ? "bg-ink text-white" : "bg-white text-steel-600 hover:bg-paper"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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

            <div className="space-y-4">
              {lineItems.map((li, idx) => (
                <div key={li.id} className="p-3 border border-steel-100 rounded-xl bg-paper/30 space-y-2 relative">
                  <div className="absolute right-2 top-2">
                    <IconButton tone="danger" title="Remove line" onClick={() => removeItem(li.id)}>
                      <Icon.Trash className="h-4 w-4" />
                    </IconButton>
                  </div>
                  <span className="text-xs font-mono-num text-steel-400">Schedule Line Item #{idx + 1}</span>

                  <Field
                    label="Description of Concrete Works"
                    value={li.description}
                    placeholder="e.g., To lay 150mm thick RC35 concrete"
                    onChange={(e) => updateItem(li.id, "description", e.target.value)}
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <Field
                      label="Qty Vol"
                      type="number"
                      value={li.qty}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => updateItem(li.id, "qty", parseFloat(e.target.value) || 0)}
                    />

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

                    <Field
                      label="Rate (£)"
                      type="number"
                      step="0.01"
                      value={li.rate}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => updateItem(li.id, "rate", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="text-right pt-1 font-mono-num text-xs text-steel-600">Line Total: {currency(li.qty * li.rate)}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-end gap-3 border-t border-steel-100 pt-4 text-sm">
              <label className="text-steel-600">VAT rate (%)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
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

        <div className="xl:sticky xl:top-8 h-fit">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-steel-600">Live Compliant PDF Mirror View</p>
          <div className="rounded-2xl bg-white p-4 md:p-8 shadow-md border border-steel-100 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-steel-200 pb-6">
              <div>
                <p className="font-display text-lg font-bold">Opus Form Concrete Specialists</p>
                <p className="text-xs text-steel-600">Company No. 14902188</p>
                <p className="text-xs text-steel-600">VAT Reg No. GB 412 8876 21</p>
                <p className="text-xs text-steel-400">operations@opusform.co.uk</p>
              </div>
              <div className="sm:text-right">
                <p className="font-display text-xl font-bold uppercase tracking-wide text-amber">
                  {docType === "Quote" ? "Slab Quote" : "VAT Invoice"}
                </p>
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
                      <td className="py-2.5 font-body text-ink text-xs max-w-[180px] truncate">
                        {li.description || <span className="text-steel-300 italic">Empty line detail</span>}
                      </td>
                      <td className="py-2.5 text-right">{li.qty}</td>
                      <td className="py-2.5 text-center font-body">{li.unit}</td>
                      <td className="py-2.5 text-right">{currency(li.rate)}</td>
                      <td className="py-2.5 text-right text-ink font-medium">{currency(li.qty * li.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ml-auto mt-4 w-60 space-y-1.5 text-xs border-t border-steel-200 pt-3">
              <div className="flex justify-between text-steel-600">
                <span>Net Subtotal</span>
                <span className="font-mono-num">{currency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-steel-600">
                <span>UK Standard VAT ({taxRate}%)</span>
                <span className="font-mono-num">{currency(tax)}</span>
              </div>
              <div className="flex justify-between pt-1.5 font-display text-sm font-bold border-t border-dashed border-steel-200">
                <span>Total Certified Due</span>
                <span className="font-mono-num text-amber">{currency(total)}</span>
              </div>
            </div>

            <div className="bg-paper p-3 rounded-xl border border-steel-100 text-[11px] text-steel-600 space-y-1">
              <span className="font-bold text-ink block">Standard Terms &amp; Pour Conditions:</span>
              <p>• All concrete materials, placement pumps and dedicated washing skip arrays to be provided entirely by the client unless listed above.</p>
              <p>• Value includes provision of CSCS accredited finishers &amp; plant operators.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ROOT
   ============================================================ */

type View = "dashboard" | "job" | "generator";

export function OpusFormApp() {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [view, setView] = useState<View>("dashboard");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [generatorDraft, setGeneratorDraft] = useState<GeneratorDraft | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastState["type"] = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || null;

  const handleCreateJob = (form: { customer: string; email: string; phone: string; address: string; notes: string }) => {
    const newJob: Job = {
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
      taxRate: 20,
      media: { before: [], after: [] },
      supplies: [{ name: "Local Merchant Alternative", type: "Merchants" }],
    };
    setJobs((js) => [newJob, ...js]);
    showToast(`Pour record provisioned for ${form.customer}`, "success");
  };

  const handleStartDocument = (job: Job, docType: DocType) => {
    setGeneratorDraft({
      docType,
      jobId: job.id,
      customer: job.customer,
      email: job.email,
      address: job.address,
      lineItems: job.lineItems,
      taxRate: job.taxRate,
    });
    setView("generator");
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-paper antialiased selection:bg-amber/20 font-body text-ink">
      <Navigation view={view} onNavigate={(v) => setView(v)} jobCount={jobs.length} />

      <main className="flex-1 overflow-y-auto">
        {view === "dashboard" && (
          <Dashboard
            jobs={jobs}
            onCreateJob={handleCreateJob}
            onSelectJob={(id) => {
              setSelectedJobId(id);
              setView("job");
            }}
          />
        )}

        {view === "job" && selectedJob && (
          <JobDetail
            job={selectedJob}
            onBack={() => setView("dashboard")}
            onUpdateStatus={(status) => {
              setJobs((js) => js.map((j) => (j.id === selectedJob.id ? { ...j, status } : j)));
              showToast(`Job state mapped to ${status}`, "success");
            }}
            onUpdateMedia={(media) => setJobs((js) => js.map((j) => (j.id === selectedJob.id ? { ...j, media } : j)))}
            onStartDocument={(docType) => handleStartDocument(selectedJob, docType)}
          />
        )}

        {view === "generator" && (
          <GeneratorView
            initialDraft={generatorDraft}
            onBack={() => setView(generatorDraft?.jobId ? "job" : "dashboard")}
            onSave={() => {
              showToast("Quantities saved successfully to project ledger", "success");
            }}
            onSendEmail={(payload) => {
              showToast(`Valuation dispatch simulated to ${payload.customer.email || "agent"}`, "success");
            }}
          />
        )}
      </main>

      <Toast toast={toast} />
    </div>
  );
}