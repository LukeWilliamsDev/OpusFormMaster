import React from "react";
import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, FileText, ShieldCheck, Cookie, ScrollText, Users } from "lucide-react";

const POLICIES = [
  {
    label: "Staff Privacy Notice",
    description: "How we handle your personal data.",
    path: "/portal/privacy",
    icon: ShieldCheck,
  },
  {
    label: "Portal Usage Policy",
    description: "How staff should use the portal.",
    path: "/portal/terms",
    icon: FileText,
  },
  {
    label: "Acceptable Use",
    description: "What you can and cannot do in the portal.",
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
    download: "/policies/Modern-Slavery-Statement.pdf",
  },
  {
    label: "Right to Work",
    description: "How we verify permission to work in the UK.",
    path: "/portal/right-to-work",
    icon: BriefcaseBusiness,
    download: "/policies/Right-to-Work-Policy.pdf",
  },
];

const DOWNLOADABLE_POLICIES = [
  ["Anti-Bribery Policy", "/policies/Anti-Bribery-Policy.pdf"],
  ["Health, Safety & Environmental Policy", "/policies/Health-and-Safety-Policy.pdf"],
  ["Quality Management Policy", "/policies/Quality-Management-Policy.pdf"],
  ["Responsible Sourcing Policy", "/policies/Responsible-Sourcing-Policy.pdf"],
  ["Sustainability Policy", "/policies/Sustainability-Policy.pdf"],
];

export const LegalHubPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 min-h-0 bg-background text-foreground overflow-y-auto px-4 sm:px-6 py-6 pb-20">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-black uppercase tracking-wide font-archivo mb-1">
          Legal & Privacy
        </h1>
        <p className="text-sm text-muted-foreground mb-6">Choose a policy to read.</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {POLICIES.map(({ label, description, path, icon: Icon, download }) => (
            <div
              key={path}
              className="text-left bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
            >
              <button
                onClick={() => navigate(path)}
                className="w-full text-left focus:outline-none focus:ring-2 focus:ring-primary/40 rounded"
              >
                <Icon className="w-5 h-5 text-primary mb-3" />
                <div className="text-sm font-bold uppercase tracking-wide">{label}</div>
                <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
              </button>
              {download && (
                <a
                  href={download}
                  download
                  className="inline-block mt-3 text-[10px] font-mono font-bold uppercase tracking-wider text-primary hover:underline"
                >
                  Download PDF
                </a>
              )}
            </div>
          ))}
        </div>
        <div className="mt-8 border-t border-border pt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide">Downloadable policies</h2>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
            {DOWNLOADABLE_POLICIES.map(([label, href]) => (
              <a key={href} href={href} download className="text-xs text-primary hover:underline">
                {label} (PDF)
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
