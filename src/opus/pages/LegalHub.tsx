import React from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ShieldCheck, Cookie, ScrollText, Users } from "lucide-react";

const POLICIES = [
  {
    label: "Staff Privacy Notice",
    description: "How we collect, use, and protect your personal data.",
    path: "/portal/privacy",
    icon: ShieldCheck,
  },
  {
    label: "Usage Policy",
    description: "Terms governing your use of the workforce portal.",
    path: "/portal/terms",
    icon: FileText,
  },
  {
    label: "Acceptable Use",
    description: "Rules for appropriate conduct on company systems.",
    path: "/portal/acceptable-use",
    icon: ScrollText,
  },
  {
    label: "Cookie Statement",
    description: "What cookies we use on this platform and why.",
    path: "/portal/cookies",
    icon: Cookie,
  },
  {
    label: "Modern Slavery",
    description: "Our statement on modern slavery and human trafficking.",
    path: "/portal/modern-slavery",
    icon: Users,
  },
];

export const LegalHubPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 min-h-0 bg-background text-foreground overflow-y-auto px-4 sm:px-6 py-6 pb-20">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-black uppercase tracking-wide font-archivo mb-1">
          Legal & Privacy
        </h1>
        <p className="text-sm text-muted-foreground mb-6">Select a policy to view.</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {POLICIES.map(({ label, description, path, icon: Icon }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="text-left bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <Icon className="w-5 h-5 text-primary mb-3" />
              <div className="text-sm font-bold uppercase tracking-wide">{label}</div>
              <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
