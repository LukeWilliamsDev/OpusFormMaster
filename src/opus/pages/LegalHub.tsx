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
    download: "/policies/Staff-Privacy-Notice.pdf",
    icon: ShieldCheck,
  },
  {
    label: "Usage Policy",
    description: "Rules for using the portal.",
    path: "/portal/terms",
    download: "/policies/Portal-Usage-Policy.pdf",
    icon: FileText,
  },
  {
    label: "Acceptable Use",
    description: "What you can and cannot do on the system.",
    path: "/portal/acceptable-use",
    download: "/policies/Acceptable-Use-Policy.pdf",
    icon: ScrollText,
  },
  {
    label: "Cookie Statement",
    description: "What cookies we use and why.",
    path: "/portal/cookies",
    download: "/policies/Cookie-Statement.pdf",
    icon: Cookie,
  },
  {
    label: "Modern Slavery",
    description: "How we oppose slavery and trafficking.",
    path: "/portal/modern-slavery",
    download: "/policies/Modern-Slavery-Statement.pdf",
    icon: Users,
  },
  {
    label: "Right to Work",
    description: "How we verify permission to work in the UK.",
    path: "/portal/right-to-work",
    download: "/policies/Right-to-Work-Policy.pdf",
    icon: BriefcaseBusiness,
  },
  {
    label: "Anti-Bribery Policy",
    description: "Our rules for preventing bribery and improper influence.",
    path: "/portal/policies/anti-bribery",
    download: "/policies/Anti-Bribery-Policy.pdf",
    icon: ShieldCheck,
  },
  {
    label: "Health, Safety & Environmental Policy",
    description: "Our health, safety, and environmental commitments.",
    path: "/portal/policies/health-safety-environmental",
    download: "/policies/Health-and-Safety-Policy.pdf",
    icon: ShieldCheck,
  },
  {
    label: "Quality Management Policy",
    description: "How we maintain consistent quality in our work.",
    path: "/portal/policies/quality-management",
    download: "/policies/Quality-Management-Policy.pdf",
    icon: ShieldCheck,
  },
  {
    label: "Responsible Sourcing Policy",
    description: "How we approach responsible sourcing and suppliers.",
    path: "/portal/policies/responsible-sourcing",
    download: "/policies/Responsible-Sourcing-Policy.pdf",
    icon: ShieldCheck,
  },
  {
    label: "Sustainability Policy",
    description: "Our approach to reducing environmental impact.",
    path: "/portal/policies/sustainability",
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
                <div>
                  <div className="rounded">
                    <Icon className="mb-3 h-5 w-5 text-primary" />
                    <div className="text-sm font-bold uppercase tracking-wide">{label}</div>
                    <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
                  </div>
                  <div className="mt-4 flex gap-2 border-t border-border pt-3">
                    <button
                      onClick={() => navigate(path)}
                      className="min-h-9 flex-1 rounded-lg border border-border px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-primary hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      Read online
                    </button>
                    <a
                      href={download}
                      download
                      className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg bg-primary px-2 text-center text-[10px] font-mono font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
                    >
                      Download PDF
                    </a>
                  </div>
                </div>
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
