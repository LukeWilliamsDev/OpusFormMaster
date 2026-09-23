import React, { useCallback, useEffect, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../integrations/supabase/client";
import { usePortal } from "../context/PortalContext";
import { formatUKDate } from "../utils/week";

const db = supabase as any;
const INTERNAL_ROLES = new Set(["admin", "director", "logistics_coordinator"]);

export const ThirdPartyNotesPanel: React.FC<{ jobId: string }> = ({ jobId }) => {
  const { role, profile } = usePortal();
  const [notes, setNotes] = useState<any[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const canReply = INTERNAL_ROLES.has(role ?? "");

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
          .select("id, note_id, body, author_id, created_at")
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
              <div className="mt-3 space-y-2 border-l-2 border-primary/30 pl-3">
                {note.replies.map((replyItem: any) => (
                  <div key={replyItem.id} className="rounded-md bg-background p-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                      Opus Form team · {formatUKDate(replyItem.created_at?.slice(0, 10))}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-foreground">
                      {replyItem.body}
                    </p>
                  </div>
                ))}
              </div>
              {canReply && (
                <div className="mt-3 flex gap-2">
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
    </div>
  );
};
