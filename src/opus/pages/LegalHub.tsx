import React from "react";
import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, Cookie, FileText, ScrollText, ShieldCheck, Users } from "lucide-react";

type PolicyItem = {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  download?: string;
};

const POLICIES: PolicyItem[] = [
  {
    label: "Staff Privacy Notice",
    description: "How we handle your personal data.",
    path: "/portal/privacy",
    icon: ShieldCheck,
  },
  {
    label: "Usage Policy",
    description: "Rules for using the portal.",
    path: "/portal/terms",
    icon: FileText,
  },
  {
    label: "Acceptable Use",
    description: "What you can and cannot do on the system.",
    path: "/portal/acceptable-use",
    icon: ScrollText,
  },
  {
    label: "Cookie Statement",
    description: "What cookies we use and why.",
    path: "/portal/cookies",
    icon: Cookie,
  },
  {
    label: "Modern Slavery",
    description: "How we oppose slavery and trafficking.",
    path: "/portal/modern-slavery",
    icon: Users,
  },
  {
    label: "Right to Work",
    description: "How we verify permission to work in the UK.",
    path: "/portal/right-to-work",
    icon: BriefcaseBusiness,
  },
  {
    label: "Anti-Bribery Policy",
    description: "Our rules for preventing bribery and improper influence.",
    download: "/policies/Anti-Bribery-Policy.pdf",
    icon: ShieldCheck,
  },
  {
    label: "Health, Safety & Environmental Policy",
    description: "Our health, safety, and environmental commitments.",
    download: "/policies/Health-and-Safety-Policy.pdf",
    icon: ShieldCheck,
  },
  {
    label: "Quality Management Policy",
    description: "How we maintain consistent quality in our work.",
    download: "/policies/Quality-Management-Policy.pdf",
    icon: ShieldCheck,
  },
  {
    label: "Responsible Sourcing Policy",
    description: "How we approach responsible sourcing and suppliers.",
    download: "/policies/Responsible-Sourcing-Policy.pdf",
    icon: ShieldCheck,
  },
  {
    label: "Sustainability Policy",
    description: "Our approach to reducing environmental impact.",
    download: "/policies/Sustainability-Policy.pdf",
    icon: ShieldCheck,
  },
];

export const LegalHubPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-background px-4 py-6 pb-20 text-foreground sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-1 font-archivo text-2xl font-black uppercase tracking-wide">
          Legal &amp; Privacy
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Read a policy online or download the available PDF.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {POLICIES.map(({ label, description, path, icon: Icon, download }) => (
            <div
              key={path ?? download}
              className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50"
            >
              {path ? (
                <button
                  onClick={() => navigate(path)}
                  className="w-full rounded text-left focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <Icon className="mb-3 h-5 w-5 text-primary" />
                  <div className="text-sm font-bold uppercase tracking-wide">{label}</div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
                  <span className="mt-3 inline-block text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
                    Read online
                  </span>
                </button>
              ) : (
                <a
                  href={download}
                  download
                  className="block rounded text-left focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <Icon className="mb-3 h-5 w-5 text-primary" />
                  <div className="text-sm font-bold uppercase tracking-wide">{label}</div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
                  <span className="mt-3 inline-block text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
                    Download PDF
                  </span>
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
