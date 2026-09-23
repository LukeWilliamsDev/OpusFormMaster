import React, { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { formatUKDate } from "../utils/week";

const db = supabase as any;

export const ThirdPartyNotesPanel: React.FC<{ jobId: string }> = ({ jobId }) => {
  const [notes, setNotes] = useState<any[]>([]);
  useEffect(() => {
    db.from("third_party_job_notes")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .then(({ data }: { data: any[] | null }) => setNotes(data ?? []));
  }, [jobId]);
  return <div className="mt-5 rounded-xl border border-border bg-card p-4"><div className="mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /><h3 className="text-sm font-black uppercase tracking-widest">Third Party Notes</h3></div>{notes.length === 0 ? <p className="text-xs text-muted-foreground">No third-party notes.</p> : <div className="space-y-3">{notes.map((note) => <div key={note.id} className="rounded-lg border border-border p-3"><p className="whitespace-pre-wrap text-sm text-foreground">{note.body}</p><p className="mt-2 text-[10px] text-muted-foreground">{formatUKDate(note.created_at?.slice(0, 10))}</p></div>)}</div>}</div>;
};
