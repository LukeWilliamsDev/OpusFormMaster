import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessageSquareText, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { usePortal } from "../context/PortalContext";

type JobNote = Database["public"]["Tables"]["job_notes"]["Row"];
type JobNoteReply = Database["public"]["Tables"]["job_note_replies"]["Row"];

function formatNoteTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export const ForemanJobNotesPanel: React.FC<{
  jobId: string;
  readOnly?: boolean;
}> = ({ jobId, readOnly = false }) => {
  const { user } = usePortal();
  const [notes, setNotes] = useState<JobNote[]>([]);
  const [replies, setReplies] = useState<JobNoteReply[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const noteIdsRef = useRef<Set<string>>(new Set());

  const loadNotes = useCallback(async () => {
    setError(null);
    if (import.meta.env.DEV && jobId.startsWith("local-foreman-")) {
      const localNote: JobNote = {
        author_staff_id: "local-foreman-worker-001",
        author_type: "foreman",
        id: `${jobId}-internal-note-sample`,
        job_id: jobId,
        user_id: user?.id ?? "local-foreman-user",
        user_email: null,
        body: "Please confirm the pour progress and flag any blockers before the next shift.",
        created_at: new Date().toISOString(),
        reminder_at: null,
        tenant_id: "local-fixture",
      };
      setNotes([localNote]);
      noteIdsRef.current = new Set([localNote.id]);
      setReplies([
        {
          id: `${jobId}-internal-reply-sample`,
          note_id: localNote.id,
          author_id: "local-operations-user",
          author_first_name: "Operations",
          body: "Thanks — the update has been noted. Please add a photo if the site condition changes.",
          created_at: new Date().toISOString(),
          tenant_id: "local-fixture",
        },
      ]);
      setLoading(false);
      return;
    }
    const { data: noteData, error: noteError } = await supabase
      .from("job_notes")
      .select("id,job_id,user_id,author_type,author_staff_id,body,created_at,reminder_at,tenant_id")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });
    if (noteError) {
      setError("Internal updates could not be loaded.");
      setLoading(false);
      return;
    }
    const nextNotes = (noteData ?? []).map((note) => ({ ...note, user_email: null }));
    const { data: replyData, error: replyError } = nextNotes.length
      ? await supabase
          .from("job_note_replies")
          .select("id,note_id,author_id,author_first_name,body,created_at,tenant_id")
          .in(
            "note_id",
            nextNotes.map((note) => note.id),
          )
          .order("created_at", { ascending: true })
      : { data: [], error: null };
    if (replyError) {
      setError("Internal responses could not be loaded.");
      setNotes(nextNotes);
      setReplies([]);
      setLoading(false);
      return;
    }
    setNotes(nextNotes);
    noteIdsRef.current = new Set(nextNotes.map((note) => note.id));
    setReplies(replyData ?? []);
    setLoading(false);
  }, [jobId, user?.id]);

  useEffect(() => {
    void loadNotes();
    const channel = supabase
      .channel(`foreman-job-notes-${jobId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_notes", filter: `job_id=eq.${jobId}` },
        loadNotes,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_note_replies" },
        (payload) => {
          const changedNoteId =
            (payload.new as Partial<JobNoteReply>).note_id ??
            (payload.old as Partial<JobNoteReply>).note_id;
          if (changedNoteId && noteIdsRef.current.has(changedNoteId)) void loadNotes();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, loadNotes]);

  const repliesByNote = useMemo(() => {
    const grouped = new Map<string, JobNoteReply[]>();
    for (const reply of replies)
      grouped.set(reply.note_id, [...(grouped.get(reply.note_id) ?? []), reply]);
    return grouped;
  }, [replies]);

  const postNote = async () => {
    if (!body.trim() || !user || readOnly) return;
    setPosting(true);
    try {
      if (import.meta.env.DEV && jobId.startsWith("local-foreman-")) {
        const localNote: JobNote = {
          author_staff_id: "local-foreman-worker-001",
          author_type: "foreman",
          id: `${jobId}-internal-note-${Date.now()}`,
          job_id: jobId,
          user_id: user.id,
          user_email: null,
          body: body.trim(),
          created_at: new Date().toISOString(),
          reminder_at: null,
          tenant_id: "local-fixture",
        };
        setNotes((current) => [localNote, ...current]);
      } else {
        const { error: insertError } = await supabase.from("job_notes").insert({
          job_id: jobId,
          body: body.trim(),
          user_id: user.id,
        });
        if (insertError) throw insertError;
        await loadNotes();
      }
      setBody("");
      toast.success("Internal note sent to operations");
    } catch (postError) {
      console.error("Failed to post internal Foreman note", postError);
      toast.error("The internal note could not be sent");
    } finally {
      setPosting(false);
    }
  };

  return (
    <section
      className="rounded-2xl border border-border bg-card p-5 sm:p-6"
      aria-labelledby="foreman-internal-notes-heading"
    >
      <div className="flex items-start gap-3">
        <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <h2
            id="foreman-internal-notes-heading"
            className="text-xs font-black uppercase tracking-[0.14em]"
          >
            Contact operations
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Contact operations about a question, access need, or blocker. Internal staff can respond
            here.
          </p>
        </div>
      </div>

      {!readOnly && (
        <div className="mt-5 rounded-xl border border-border bg-background p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="foreman-internal-note"
              className="text-sm font-semibold text-foreground"
            >
              Contact operations
            </label>
          </div>
          <textarea
            id="foreman-internal-note"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="What does the operations team need to know?"
            className="mt-2 min-h-24 w-full resize-y rounded-lg border border-border bg-card p-3 text-sm leading-relaxed outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <div className="mt-2 flex justify-end">
            <Button
              className="min-h-11"
              disabled={posting || !body.trim()}
              onClick={() => void postNote()}
            >
              {posting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}{" "}
              {posting ? "Sending..." : "Send internal note"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading internal
          updates...
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
        >
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            className="mt-3 min-h-11"
            onClick={() => {
              setLoading(true);
              void loadNotes();
            }}
          >
            Retry
          </Button>
        </div>
      ) : notes.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border px-5 py-9 text-center">
          <MessageSquareText
            className="mx-auto h-7 w-7 text-muted-foreground/60"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm text-muted-foreground">No internal updates yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your first note will appear here with any response from operations.
          </p>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-border">
          {notes.map((note) => {
            const author = note.user_id === user?.id ? "You" : "Operations";
            return (
              <article key={note.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-black"
                    aria-hidden="true"
                  >
                    {initials(author)}
                  </span>
                  <div className="min-w-0">
                    <p className="break-words whitespace-pre-line text-sm leading-6 text-foreground">
                      {note.body}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {author} · {formatNoteTime(note.created_at)}
                    </p>
                  </div>
                </div>
                {(repliesByNote.get(note.id) ?? []).length > 0 && (
                  <div className="ml-4 mt-3 border-l-2 border-primary/30 pl-4">
                    {(repliesByNote.get(note.id) ?? []).map((reply) => (
                      <div key={reply.id} className="py-2">
                        <p className="break-words whitespace-pre-line text-sm leading-6 text-foreground">
                          {reply.body}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {reply.author_first_name || "Operations"} ·{" "}
                          {formatNoteTime(reply.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
