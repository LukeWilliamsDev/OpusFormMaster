import React, { useEffect, useState } from "react";
import { supabase } from "../../integrations/supabase/client";
import { FileText, ExternalLink } from "lucide-react";

export const AdminPolicies: React.FC = () => {
  const [policies, setPolicies] = useState<{ name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const policyFiles = [
      "Anti-Bribery-Policy.pdf",
      "Health-and-Safety-Policy.pdf",
      "Modern-Slavery-Statement.pdf",
      "Quality-Management-Policy.pdf",
      "Responsible-Sourcing-Policy.pdf",
      "Sustainability-Policy.pdf",
    ];

    const policiesWithUrls = policyFiles.map((file) => {
      const {
        data: { publicUrl },
      } = supabase.storage.from("policies").getPublicUrl(file);
      return {
        name: file.replace(/-/g, " ").replace(".pdf", ""),
        url: publicUrl,
      };
    });

    setPolicies(policiesWithUrls);
    setLoading(false);
  }, []);

  return (
    <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto space-y-6 animate-fade-in text-foreground flex flex-col bg-background">
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-archivo tracking-tight">
          Compliance Policies
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Company policies and compliance documents.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          {policies.map((policy) => (
            <a
              key={policy.name}
              href={policy.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4 hover:bg-muted/30 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{policy.name}</span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary shrink-0 group-hover:underline">
                View Document
                <ExternalLink className="h-3 w-3" />
              </span>
            </a>
          ))}

          {policies.length === 0 && (
            <div className="py-20 text-center text-xs font-mono text-muted-foreground">
              No policies found. Ensure they have been uploaded to the bucket.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
