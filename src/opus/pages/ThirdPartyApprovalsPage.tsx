import React, { useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, History, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../integrations/supabase/client";
import { usePortal } from "../context/PortalContext";
import { formatUKDate } from "../utils/week";

const db = supabase as any;

export const ThirdPartyApprovalsPage: React.FC = () => {
  const { workers } = usePortal();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [documents, setDocuments] = useState<Record<string, any[]>>({});
  const [documentHistory, setDocumentHistory] = useState<any[]>([]);
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
  const loadDocumentHistory = async () => {
    const { data, error } = await db
      .from("third_party_staff_documents")
      .select(
        "id, staff_id, ticket_type, ticket_number, expiry_date, file_name, file_path, created_at",
      )
      .not("staff_id", "is", null)
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message || "Unable to load certificate history");
    setDocumentHistory(data ?? []);
  };
  useEffect(() => {
    load();
    loadDocumentHistory();
  }, []);
  const currentDocumentIds = useMemo(() => {
    const current = new Set<string>();
    const ids = new Set<string>();
    for (const document of documentHistory) {
      const key = `${document.staff_id}:${document.ticket_type}`;
      if (!current.has(key)) {
        current.add(key);
        ids.add(document.id);
      }
    }
    return ids;
  }, [documentHistory]);
  const openDocument = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("third-party-staff-documents")
      .createSignedUrl(path, 300);
    if (error || !data?.signedUrl)
      return toast.error(error?.message || "Unable to open certificate");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
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
                    Certificates
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
      <section className="rounded-2xl border-2 border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-black uppercase tracking-widest">
            Certificate document history
          </h2>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Renewals create new records. Previous files remain available for audit.
        </p>
        {documentHistory.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            No approved certificate documents yet.
          </p>
        ) : (
          <div className="mt-5 space-y-2">
            {documentHistory.map((document) => {
              const staffName =
                workers.find((worker) => worker.id === document.staff_id)?.name ?? "Unknown staff";
              const current = currentDocumentIds.has(document.id);
              return (
                <div
                  key={document.id}
                  className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {staffName} · {document.ticket_type}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {document.file_name} · uploaded{" "}
                      {formatUKDate(document.created_at?.slice(0, 10))}
                      {document.expiry_date
                        ? ` · expires ${formatUKDate(document.expiry_date)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${current ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"}`}
                    >
                      {current ? "Current" : "Previous"}
                    </span>
                    <button
                      type="button"
                      onClick={() => void openDocument(document.file_path)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest hover:border-primary"
                    >
                      <ExternalLink className="h-3 w-3" /> Open
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
