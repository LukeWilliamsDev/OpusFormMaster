import React, { useCallback, useEffect, useState } from "react";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../integrations/supabase/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePortal } from "../context/PortalContext";
import { formatUKDate } from "../utils/week";
import { formatAppRoleLabel } from "../context/PortalContext";

const db = supabase as any;
const INTERNAL_ROLES = new Set(["admin", "director", "logistics_coordinator"]);

export const ThirdPartyNotesPanel: React.FC<{ jobId: string }> = ({ jobId }) => {
  const { role, profile, user } = usePortal();
  const [notes, setNotes] = useState<any[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const canReply = INTERNAL_ROLES.has(role ?? "") || role === "third_party";

  const load = useCallback(async () => {
    const { data: noteRows, error } = await db
      .from("third_party_job_notes")
      .select("id, body, author_id, created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true });
    if (error) return toast.error(error.message || "Unable to load note history");
    const rows = noteRows ?? [];
    const { data: replies } = rows.length
      ? await db
          .from("third_party_job_note_replies")
          .select("id, note_id, body, author_id, author_first_name, author_role, created_at")
          .in(
            "note_id",
            rows.map((note: any) => note.id),
          )
          .order("created_at", { ascending: true })
      : { data: [] };
    const grouped: Record<string, any[]> = {};
    for (const reply of replies ?? []) (grouped[reply.note_id] ??= []).push(reply);
    setNotes(rows.map((note: any) => ({ ...note, replies: grouped[note.id] ?? [] })));
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const reply = async (noteId: string) => {
    const body = replyDrafts[noteId]?.trim();
    if (!body) return;
    setReplyingTo(noteId);
    const { data: authUser } = await supabase.auth.getUser();
    const { error } = await db.from("third_party_job_note_replies").insert({
      note_id: noteId,
      body,
      author_id: authUser.user?.id,
      tenant_id: profile?.tenant_id,
    });
    setReplyingTo(null);
    if (error) return toast.error(error.message || "Unable to send response");
    setReplyDrafts((current) => ({ ...current, [noteId]: "" }));
    await load();
    toast.success("Response sent");
  };

  const deleteNote = async () => {
    if (!deleteTarget) return;
    const { error } = await db.from("third_party_job_notes").delete().eq("id", deleteTarget.id);
    if (error) return toast.error(error.message || "Unable to delete note");
    setDeleteTarget(null);
    await load();
    toast.success("Note deleted");
  };

  return (
    <div className="mt-5 rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-black uppercase tracking-widest">Third Party Notes</h3>
      </div>
      {notes.length === 0 ? (
        <p className="text-xs text-muted-foreground">No third-party notes.</p>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-border p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Third party · {formatUKDate(note.created_at?.slice(0, 10))}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{note.body}</p>
              {role === "third_party" &&
                note.author_id === user?.id &&
                note.replies.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(note)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" /> Delete note
                  </button>
                )}
              <div className="mt-3 space-y-2 border-l-2 border-primary/30 pl-3">
                {note.replies.map((replyItem: any) => (
                  <div key={replyItem.id} className="rounded-md bg-background p-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                      {replyItem.author_id === user?.id
                        ? "You"
                        : [
                            replyItem.author_first_name,
                            replyItem.author_role && formatAppRoleLabel(replyItem.author_role),
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Opus Form team"}{" "}
                      · {formatUKDate(replyItem.created_at?.slice(0, 10))}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-foreground">
                      {replyItem.body}
                    </p>
                  </div>
                ))}
              </div>
              {canReply && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={replyDrafts[note.id] ?? ""}
                    onChange={(event) =>
                      setReplyDrafts((current) => ({ ...current, [note.id]: event.target.value }))
                    }
                    placeholder="Reply to this note..."
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs"
                  />
                  <button
                    onClick={() => reply(note.id)}
                    disabled={replyingTo === note.id || !replyDrafts[note.id]?.trim()}
                    className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                  >
                    <Send className="h-3 w-3" /> Reply
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
        title="Delete note?"
        confirmLabel="Delete note"
        cancelLabel="Keep note"
        onConfirm={deleteNote}
        message="This note has no response and will be removed from the site record."
      />
    </div>
  );
};
