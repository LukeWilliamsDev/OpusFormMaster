import React, { useEffect, useState } from "react";
import { Download, Paperclip } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as any;

export const ThirdPartyAttachmentsPanel: React.FC<{
  jobId: string;
  refreshKey?: number;
  action?: React.ReactNode;
}> = ({ jobId, refreshKey = 0, action }) => {
  const [files, setFiles] = useState<any[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await db
        .from("third_party_attachments")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) toast.error(error.message || "Unable to load third-party attachments");
      setFiles(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId, refreshKey]);

  const openFile = async (file: any) => {
    const { data, error } = await supabase.storage
      .from("third-party-attachments")
      .createSignedUrl(file.file_path, 300);
    if (error || !data?.signedUrl)
      return toast.error(error?.message || "Unable to open attachment");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    await db.rpc("log_third_party_action", {
      p_action: "THIRD_PARTY_ATTACHMENT_VIEWED",
      p_target_type: "jobs",
      p_target_id: jobId,
      p_details: { file_name: file.file_name },
    });
  };

  return (
    <div className="mt-5 rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-widest">Attachments</h3>
        </div>
        {action}
      </div>
      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground">No third-party attachments.</p>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <button
              key={file.id}
              onClick={() => openFile(file)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left hover:bg-background"
            >
              <span className="truncate text-xs font-bold">{file.file_name}</span>
              <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
