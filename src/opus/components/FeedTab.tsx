import React, { useEffect, useMemo, useState } from "react";
import { Send, Loader, Trash2 } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";
import { CardGrid } from "./CardGrid";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Database } from "@/integrations/supabase/types";
import { MANAGEMENT_WRITE_ROLES, usePortal } from "../context/PortalContext";

interface JobNote {
  id: string;
  created_at: string;
  body: string;
  user_email: string | null;
}

type JobNoteReply = Database["public"]["Tables"]["job_note_replies"]["Row"];

export function groupNotesByDay(notes: JobNote[]): { day: string; notes: JobNote[] }[] {
  const byDay = new Map<string, JobNote[]>();
  for (const note of notes) {
    const day = note.created_at.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(note);
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([day, dayNotes]) => ({
      day,
      notes: [...dayNotes].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    }));
}

function formatDayHeading(day: string): string {
  const d = new Date(`${day}T00:00:00`);
  if (isNaN(d.getTime())) return day;
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "TBC";
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export const FeedTab: React.FC<{ jobId: string }> = ({ jobId }) => {
  const { role } = usePortal();
  const [notes, setNotes] = useState<JobNote[]>([]);
  const [replies, setReplies] = useState<JobNoteReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<JobNote | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [namesByEmail, setNamesByEmail] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from("job_notes")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load job notes", error);
      setLoading(false);
      return;
    }
    setNotes(data || []);
    const { data: replyData } = data?.length
      ? await supabase
          .from("job_note_replies")
          .select("id,note_id,author_id,author_first_name,body,created_at,tenant_id")
          .in(
            "note_id",
            data.map((note) => note.id),
          )
          .order("created_at", { ascending: true })
      : { data: [] };
    setReplies(replyData || []);
    setLoading(false);
  };

  useEffect(() => {
    supabase
      .from("profiles")
      .select("email, full_name")
      .then(({ data }) => {
        const map: Record<string, string> = {};
        for (const p of data || []) {
          if (p.email && p.full_name) map[p.email] = p.full_name;
        }
        setNamesByEmail(map);
      });
  }, []);

  useEffect(() => {
    fetchNotes();
    const channel = supabase
      .channel(`job-notes-${jobId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_notes", filter: `job_id=eq.${jobId}` },
        fetchNotes,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_note_replies" },
        fetchNotes,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const canReply = role ? MANAGEMENT_WRITE_ROLES.includes(role) : false;
  const repliesByNote = useMemo(() => {
    const grouped = new Map<string, JobNoteReply[]>();
    replies.forEach((reply) =>
      grouped.set(reply.note_id, [...(grouped.get(reply.note_id) ?? []), reply]),
    );
    return grouped;
  }, [replies]);

  const handleReply = async (noteId: string) => {
    if (!replyBody.trim()) return;
    setReplying(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("job_note_replies").insert({
        note_id: noteId,
        author_id: user?.id ?? "",
        body: replyBody.trim(),
      });
      if (error) throw error;
      setReplyBody("");
      setReplyingTo(null);
      await fetchNotes();
      toast.success("Reply added");
    } catch (err) {
      console.error("Error posting job note reply:", err);
      toast.error("Failed to add reply");
    } finally {
      setReplying(false);
    }
  };

  const handlePost = async () => {
    if (!body.trim()) return;
    setPosting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("job_notes").insert({
        job_id: jobId,
        user_id: user?.id ?? null,
        user_email: user?.email ?? "admin@opusform.co.uk",
        body: body.trim(),
      });
      if (error) throw error;
      await supabase.rpc("log_anonymous_audit", {
        p_user_email: user?.email || "admin@opusform.co.uk",
        p_action: "ADD_NOTE",
        p_target_type: "jobs",
        p_target_id: jobId,
        p_details: { note_body: body.trim() },
      });
      setBody("");
      setComposerOpen(false);
      await fetchNotes();
      toast.success("Note added");
    } catch (err) {
      console.error("Error posting job note:", err);
      toast.error("Failed to add note");
    } finally {
      setPosting(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("job_notes").delete().eq("id", deleteTarget.id);
      if (error) throw error;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.rpc("log_anonymous_audit", {
        p_user_email: user?.email || "admin@opusform.co.uk",
        p_action: "DELETE_NOTE",
        p_target_type: "jobs",
        p_target_id: jobId,
        p_details: { note_body: deleteTarget.body },
      });

      setDeleteTarget(null);
      await fetchNotes();
      toast.success("Note deleted");
    } catch (err) {
      console.error("Error deleting job note:", err);
      toast.error("Failed to delete note");
    } finally {
      setDeleting(false);
    }
  };

  const grouped = groupNotesByDay(notes);
  const skipDayHeadings = grouped.length === 1 && notes.length <= 5;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-3">
        {composerOpen ? (
          <div className="relative">
            <textarea
              id="job-note-body"
              autoFocus
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onBlur={() => {
                if (!body.trim()) setComposerOpen(false);
              }}
              placeholder="Add a progress update…"
              className="w-full min-h-[72px] rounded-lg border border-border bg-background p-3 pr-12 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/30"
            />
            <button
              type="button"
              onClick={handlePost}
              disabled={posting || !body.trim()}
              aria-label="Post note"
              className={`absolute bottom-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer disabled:cursor-default ${
                body.trim()
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground border border-border"
              }`}
            >
              {posting ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="w-full text-left rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:border-foreground/30 cursor-pointer transition-colors"
          >
            Add note
          </button>
        )}
      </div>

      <div className="border-t border-border">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 px-4">
            <Loader className="w-4 h-4 animate-spin text-primary" />
            <span>Loading notes…</span>
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-xs text-muted-foreground py-8 px-4 text-center">
            No notes yet. Add progress, issue, or handover details.
          </div>
        ) : (
          <CardGrid
            items={grouped}
            className="divide-y divide-border"
            renderCard={({ day, notes: dayNotes }: { day: string; notes: JobNote[] }) => (
              <div key={day} className="px-3 py-2.5 space-y-2.5">
                {!skipDayHeadings && (
                  <div className="text-[11px] text-primary font-bold uppercase tracking-wider">
                    {formatDayHeading(day)}
                  </div>
                )}
                {dayNotes.map((n) => {
                  const displayName =
                    (n.user_email && namesByEmail[n.user_email]) || n.user_email || "?";
                  return (
                    <div key={n.id} className="group">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-secondary text-foreground text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {initials(displayName)}
                        </div>
                        <div className="min-w-0 flex-1 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm text-foreground leading-relaxed">{n.body}</p>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {displayName} · {formatRelativeTime(n.created_at)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(n)}
                            className="shrink-0 p-1 text-muted-foreground hover:text-destructive cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {(repliesByNote.get(n.id) ?? []).length > 0 && (
                        <div className="ml-9 mt-2 space-y-2 border-l-2 border-primary/30 pl-3">
                          {(repliesByNote.get(n.id) ?? []).map((reply) => (
                            <div key={reply.id} className="rounded-lg bg-background p-2.5">
                              <p className="text-sm leading-relaxed text-foreground">
                                {reply.body}
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {reply.author_first_name || "Operations"} ·{" "}
                                {formatRelativeTime(reply.created_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      {canReply &&
                        (replyingTo === n.id ? (
                          <div className="ml-9 mt-2 flex flex-col gap-2 sm:flex-row">
                            <textarea
                              autoFocus
                              value={replyBody}
                              onChange={(event) => setReplyBody(event.target.value)}
                              placeholder="Reply to this note..."
                              className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-background p-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                            <div className="flex gap-2 sm:flex-col">
                              <button
                                type="button"
                                className="min-h-11 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50"
                                disabled={replying || !replyBody.trim()}
                                onClick={() => void handleReply(n.id)}
                              >
                                {replying ? "Sending..." : "Send"}
                              </button>
                              <button
                                type="button"
                                className="min-h-11 rounded-lg border border-border px-3 text-xs font-bold"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyBody("");
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="ml-9 mt-2 min-h-11 text-xs font-bold text-primary underline-offset-4 hover:underline"
                            onClick={() => setReplyingTo(n.id)}
                          >
                            Reply to note
                          </button>
                        ))}
                    </div>
                  );
                })}
              </div>
            )}
            emptyMessage="No notes yet. Add progress, issue, or handover details."
            emptyIcon={<span className="text-xs text-muted-foreground py-8 text-center" />}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        tone="destructive"
        title="Delete note?"
        message="This permanently removes the note. It cannot be undone, and the deletion will be recorded in this job's audit history."
        confirmLabel={deleting ? "Deleting..." : "Delete Note"}
        onConfirm={executeDelete}
      />
    </div>
  );
};
