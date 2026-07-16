import React, { useEffect, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { FileText, ExternalLink } from 'lucide-react';

export const AdminPolicies: React.FC = () => {
  const [policies, setPolicies] = useState<{ name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const policyFiles = [
      'Anti-Bribery-Policy.pdf',
      'Health-and-Safety-Policy.pdf',
      'Modern-Slavery-Statement.pdf',
      'Quality-Management-Policy.pdf',
      'Responsible-Sourcing-Policy.pdf',
      'Sustainability-Policy.pdf',
    ];

    const policiesWithUrls = policyFiles.map(file => {
      const { data: { publicUrl } } = supabase.storage.from('policies').getPublicUrl(file);
      return {
        name: file.replace(/-/g, ' ').replace('.pdf', ''),
        url: publicUrl,
      };
    });

    setPolicies(policiesWithUrls);
    setLoading(false);
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 w-full">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white font-archivo uppercase">Compliance Policies</h2>
        <p className="text-muted-foreground mt-2">
          Manage and view the official company compliance documents.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {policies.map((policy) => (
            <Card key={policy.name} className="bg-card hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-wider leading-tight text-white">
                  {policy.name}
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end mt-4">
                  <a
                    href={policy.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
                  >
                    View Document
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {policies.length === 0 && (
            <div className="col-span-full p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              No policies found. Ensure they have been uploaded to the bucket.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
