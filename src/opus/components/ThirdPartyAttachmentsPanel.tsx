import React, { useEffect, useState } from "react";
import { Check, Download, Loader2, Paperclip, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";
import { usePortal } from "../context/PortalContext";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const db = supabase as any;

export const ThirdPartyAttachmentsPanel: React.FC<{
  jobId: string;
  refreshKey?: number;
  action?: React.ReactNode;
}> = ({ jobId, refreshKey = 0, action }) => {
  const { role } = usePortal();
  const [files, setFiles] = useState<any[]>([]);
  const [renameTarget, setRenameTarget] = useState<any | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const canManage = role === "third_party";
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

  const saveRename = async () => {
    const fileName = renameValue.trim();
    if (!renameTarget || !fileName) return;
    setSaving(true);
    const { error } = await db.rpc("rename_third_party_attachment", {
      p_attachment_id: renameTarget.id,
      p_file_name: fileName,
    });
    setSaving(false);
    if (error) return toast.error(error.message || "Unable to rename attachment");
    setFiles((current) =>
      current.map((file) =>
        file.id === renameTarget.id ? { ...file, file_name: fileName } : file,
      ),
    );
    setRenameTarget(null);
    toast.success("Attachment renamed");
  };

  const deleteAttachment = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const { error } = await db.from("third_party_attachments").delete().eq("id", deleteTarget.id);
    if (error) {
      setSaving(false);
      return toast.error(error.message || "Unable to delete attachment");
    }
    const { error: storageError } = await supabase.storage
      .from("third-party-attachments")
      .remove([deleteTarget.file_path]);
    setSaving(false);
    setDeleteTarget(null);
    setFiles((current) => current.filter((file) => file.id !== deleteTarget.id));
    if (storageError) {
      toast.warning("Attachment record deleted, but file cleanup failed");
    } else {
      toast.success("Attachment deleted");
    }
  };

  return (
    <div className="mt-5 rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-widest">
            {role === "third_party" ? "Your attachments" : "Attachments"}
          </h3>
        </div>
        {action}
      </div>
      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground">No third-party attachments.</p>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="rounded-lg border border-border px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => openFile(file)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left hover:text-primary"
                >
                  <span className="truncate text-xs font-bold">{file.file_name}</span>
                  <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Rename ${file.file_name}`}
                      onClick={() => {
                        setRenameTarget(file);
                        setRenameValue(file.file_name);
                      }}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${file.file_name}`}
                      onClick={() => setDeleteTarget(file)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {canManage && renameTarget?.id === file.id && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && void saveRename()}
                    className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                    autoFocus
                  />
                  <button
                    type="button"
                    aria-label="Save attachment name"
                    disabled={saving || !renameValue.trim()}
                    onClick={() => void saveRename()}
                    className="rounded-md p-1.5 text-primary hover:bg-primary/10 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Cancel rename"
                    onClick={() => setRenameTarget(null)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        tone="destructive"
        title="Delete attachment?"
        confirmLabel="Delete attachment"
        cancelLabel="Keep attachment"
        onConfirm={deleteAttachment}
        message={
          deleteTarget &&
          `Remove "${deleteTarget.file_name}" from this site record? This cannot be undone.`
        }
      />
    </div>
  );
};
