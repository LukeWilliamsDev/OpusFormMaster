import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../integrations/supabase/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePortal } from "../context/PortalContext";
import { formatUKDate } from "../utils/week";
import { formatAppRoleLabel } from "../context/PortalContext";

const db = supabase as any;
const INTERNAL_ROLES = new Set(["admin", "director", "logistics_coordinator"]);

export const ThirdPartyNotesPanel: React.FC<{
  jobId: string;
  showHeading?: boolean;
  readOnly?: boolean;
}> = ({ jobId, showHeading = true, readOnly = false }) => {
  const { role, profile, user } = usePortal();
  const [notes, setNotes] = useState<any[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const canReply = !readOnly && (INTERNAL_ROLES.has(role ?? "") || role === "third_party");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: noteRows, error } = await db
      .from("third_party_job_notes")
      .select("id, body, author_id, created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true });
    if (error) {
      setLoading(false);
      setError(
        "We couldn’t load the conversation. Try again, or contact support if the problem continues.",
      );
      return toast.error("We couldn’t load the conversation. Try again.");
    }
    const rows = noteRows ?? [];
    const { data: replies, error: repliesError } = rows.length
      ? await db
          .from("third_party_job_note_replies")
          .select("id, note_id, body, author_id, author_first_name, author_role, created_at")
          .in(
            "note_id",
            rows.map((note: any) => note.id),
          )
          .order("created_at", { ascending: true })
      : { data: [] };
    if (repliesError) {
      setLoading(false);
      setError(
        "We couldn’t load note responses. Try again, or contact support if the problem continues.",
      );
      return toast.error("We couldn’t load note responses. Try again.");
    }
    const grouped: Record<string, any[]> = {};
    for (const reply of replies ?? []) (grouped[reply.note_id] ??= []).push(reply);
    setNotes(rows.map((note: any) => ({ ...note, replies: grouped[note.id] ?? [] })));
    setLoading(false);
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
    if (error) return toast.error("We couldn’t send the response. Try again.");
    setReplyDrafts((current) => ({ ...current, [noteId]: "" }));
    await load();
    setConfirmation("Response sent and added to the conversation.");
    toast.success("Response sent");
  };

  const deleteNote = async () => {
    if (!deleteTarget) return;
    const { error } = await db.from("third_party_job_notes").delete().eq("id", deleteTarget.id);
    if (error) return toast.error("We couldn’t delete the note. Try again.");
    setDeleteTarget(null);
    await load();
    setConfirmation("Note deleted from the site record.");
    toast.success("Note deleted");
  };

  return (
    <div className={`${showHeading ? "mt-5" : ""} rounded-xl border border-border bg-card p-4`}>
      {showHeading && (
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-widest">Third Party Notes</h3>
        </div>
      )}
      {confirmation && (
        <p
          role="status"
          className="mb-3 flex items-center gap-2 rounded-lg border border-status-success/30 bg-status-success/10 px-3 py-2 text-xs text-status-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {confirmation}
        </p>
      )}
      {loading ? (
        <div className="space-y-2">
          <div className="h-20 animate-pulse rounded-lg bg-muted" />
          <div className="h-20 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-xs text-muted-foreground"
        >
          <p>{error}</p>
          <button type="button" onClick={() => void load()} className="mt-3 font-bold text-primary">
            Try again →
          </button>
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">No updates yet.</p>
          {!readOnly && <p className="mt-1">Add a note to share the first update for this site.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Third party · {formatUKDate(note.created_at?.slice(0, 10))}
                </p>
                {!readOnly &&
                  role === "third_party" &&
                  note.author_id === user?.id &&
                  note.replies.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(note)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-bold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{note.body}</p>
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
                    aria-label={`Reply to note from ${formatUKDate(note.created_at?.slice(0, 10))}`}
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
