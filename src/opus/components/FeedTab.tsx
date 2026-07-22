import React, { useEffect, useState } from "react";
import { Bell, Send, Loader } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { toast } from "sonner";

interface JobNote {
  id: string;
  created_at: string;
  body: string;
  reminder_at: string | null;
  user_email: string | null;
}

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

export function sortUpcomingReminders(notes: JobNote[], now: Date): JobNote[] {
  return notes
    .filter((n) => n.reminder_at && new Date(n.reminder_at).getTime() > now.getTime())
    .sort((a, b) => new Date(a.reminder_at!).getTime() - new Date(b.reminder_at!).getTime());
}

function formatDayHeading(day: string): string {
  const d = new Date(`${day}T00:00:00`);
  if (isNaN(d.getTime())) return day;
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

function formatReminderTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "TBC";
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export const FeedTab: React.FC<{ jobId: string }> = ({ jobId }) => {
  const [notes, setNotes] = useState<JobNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [wantsReminder, setWantsReminder] = useState(false);
  const [reminderAt, setReminderAt] = useState("");
  const [posting, setPosting] = useState(false);

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
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();
    const channel = supabase
      .channel(`job-notes-${jobId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_notes", filter: `job_id=eq.${jobId}` },
        fetchNotes,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

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
        reminder_at: wantsReminder && reminderAt ? new Date(reminderAt).toISOString() : null,
      });
      if (error) throw error;
      setBody("");
      setWantsReminder(false);
      setReminderAt("");
      await fetchNotes();
      toast.success("Note added");
    } catch (err) {
      console.error("Error posting job note:", err);
      toast.error("Failed to add note");
    } finally {
      setPosting(false);
    }
  };

  const upcoming = sortUpcomingReminders(notes, new Date());
  const grouped = groupNotesByDay(notes);

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <label htmlFor="job-note-body" className="text-xs font-bold uppercase tracking-wider text-foreground">
          Add a note
        </label>
        <textarea
          id="job-note-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What happened, what's next..."
          className="w-full min-h-[72px] rounded-lg border border-border bg-background p-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={wantsReminder}
              onChange={(e) => setWantsReminder(e.target.checked)}
            />
            <Bell className="w-4 h-4" /> Remind me
          </label>
          {wantsReminder && (
            <input
              type="datetime-local"
              value={reminderAt}
              onChange={(e) => setReminderAt(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
            />
          )}
          <button
            type="button"
            onClick={handlePost}
            disabled={posting || !body.trim()}
            className="ml-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-bold bg-primary text-primary-foreground disabled:opacity-50 cursor-pointer"
          >
            {posting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Post
          </button>
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Bell className="w-4 h-4 text-warning" /> Upcoming reminders
          </div>
          {upcoming.map((n) => (
            <div key={n.id} className="text-sm text-foreground flex items-center justify-between gap-2">
              <span className="truncate">{n.body}</span>
              <span className="text-xs text-muted-foreground shrink-0">{formatReminderTime(n.reminder_at!)}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Loader className="w-4 h-4 animate-spin text-primary" />
          <span>Loading feed...</span>
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-xs text-muted-foreground py-8 text-center uppercase tracking-wider">
          No notes yet
        </div>
      ) : (
        grouped.map(({ day, notes: dayNotes }) => (
          <div key={day} className="space-y-2">
            <div className="text-[12px] text-primary font-bold uppercase tracking-wider border-b border-border pb-1">
              {formatDayHeading(day)}
            </div>
            {dayNotes.map((n) => (
              <div key={n.id} className="bg-card border border-border rounded-lg p-3">
                <p className="text-sm text-foreground leading-relaxed">{n.body}</p>
                <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                  <span>{n.user_email}</span>
                  <span>{formatReminderTime(n.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
};
