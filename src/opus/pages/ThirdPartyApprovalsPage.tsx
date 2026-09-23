import React, { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../integrations/supabase/client";

const db = supabase as any;

export const ThirdPartyApprovalsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [documents, setDocuments] = useState<Record<string, any[]>>({});
  const load = async () => {
    const { data, error } = await db
      .from("third_party_staff_submissions")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) return toast.error(error.message);
    const rows = data ?? [];
    setSubmissions(rows);
    if (!rows.length) return setDocuments({});
    const { data: docs } = await db
      .from("third_party_staff_documents")
      .select("submission_id, ticket_type, ticket_number, expiry_date, file_name")
      .in(
        "submission_id",
        rows.map((row: any) => row.id),
      );
    const grouped: Record<string, any[]> = {};
    for (const doc of docs ?? []) (grouped[doc.submission_id] ??= []).push(doc);
    setDocuments(grouped);
  };
  useEffect(() => {
    load();
  }, []);
  const review = async (id: string, approve: boolean) => {
    const { error } = await db.rpc("review_third_party_staff", {
      p_submission_id: id,
      p_approve: approve,
      p_review_notes: null,
    });
    if (error) return toast.error(error.message || "Unable to review submission");
    await load();
    toast.success(approve ? "Staff approved" : "Staff rejected");
  };
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          Third-party staff
        </p>
        <h1 className="mt-2 text-2xl font-black">Approval queue</h1>
      </header>
      {submissions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">
          No pending submissions.
        </p>
      ) : (
        submissions.map((submission) => (
          <article key={submission.id} className="rounded-xl border border-border bg-card p-4">
            <div>
              <h2 className="font-bold">{submission.name}</h2>
              <p className="text-xs text-muted-foreground">
                {submission.role} · {submission.email || "No email"} ·{" "}
                {submission.postcode || "No postcode"}
              </p>
              {submission.notes && (
                <p className="mt-2 text-sm text-muted-foreground">{submission.notes}</p>
              )}
              {documents[submission.id]?.length > 0 && (
                <div className="mt-3 rounded-lg border border-border p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Certificates and tickets
                  </p>
                  {documents[submission.id].map((doc: any) => (
                    <p key={doc.file_name} className="mt-1 text-xs">
                      {doc.ticket_type}
                      {doc.ticket_number ? ` · ${doc.ticket_number}` : ""}
                      {doc.expiry_date ? ` · expires ${doc.expiry_date}` : ""} · {doc.file_name}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => review(submission.id, true)}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
              >
                <Check className="h-3 w-3" />
                Approve
              </button>
              <button
                onClick={() => review(submission.id, false)}
                className="flex items-center gap-2 rounded-lg border border-destructive px-3 py-2 text-xs font-bold text-destructive"
              >
                <X className="h-3 w-3" />
                Reject
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
};
