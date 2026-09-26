import React, { useEffect, useMemo, useState } from "react";
import { Check, Download, ExternalLink, History, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../integrations/supabase/client";
import { usePortal } from "../context/PortalContext";
import { formatUKDate } from "../utils/week";

const db = supabase as any;
const latestByType = (rows: any[], keyFor: (row: any) => string) => {
  const latest = new Map<string, any>();
  for (const row of [...rows].sort((a, b) =>
    String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
  )) {
    const key = keyFor(row);
    if (!latest.has(key)) latest.set(key, row);
  }
  return [...latest.values()];
};

export const ThirdPartyApprovalsPage: React.FC = () => {
  const { workers } = usePortal();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [documents, setDocuments] = useState<Record<string, any[]>>({});
  const [documentHistory, setDocumentHistory] = useState<any[]>([]);
  const [showPrevious, setShowPrevious] = useState(false);
  const load = async () => {
    const { data, error } = await db
      .from("third_party_staff_submissions")
      .select("id, name, role, email, postcode, notes, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) return toast.error(error.message);
    const rows = data ?? [];
    setSubmissions(rows);
    if (!rows.length) return setDocuments({});
    const { data: docs } = await db
      .from("third_party_staff_documents")
      .select(
        "id, submission_id, ticket_type, ticket_number, expiry_date, file_name, file_path, created_at",
      )
      .in(
        "submission_id",
        rows.map((row: any) => row.id),
      );
    const grouped: Record<string, any[]> = {};
    for (const row of rows) {
      grouped[row.id] = latestByType(
        (docs ?? []).filter((doc: any) => doc.submission_id === row.id),
        (doc) => doc.ticket_type,
      );
    }
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
  const currentDocuments = useMemo(
    () =>
      latestByType(documentHistory, (document) => `${document.staff_id}:${document.ticket_type}`),
    [documentHistory],
  );
  const previousDocuments = useMemo(() => {
    const currentIds = new Set(currentDocuments.map((document) => document.id));
    return documentHistory.filter((document) => !currentIds.has(document.id));
  }, [currentDocuments, documentHistory]);
  const openDocument = async (path: string, download = false, fileName?: string) => {
    const { data, error } = await supabase.storage
      .from("third-party-staff-documents")
      .createSignedUrl(path, 300, download ? { download: fileName ?? true } : undefined);
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
                    <div
                      key={doc.id ?? doc.file_name}
                      className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                    >
                      <p className="min-w-0 truncate text-xs">
                        <span className="font-bold">{doc.ticket_type}</span>
                        {doc.ticket_number ? ` · ${doc.ticket_number}` : ""}
                        {doc.expiry_date
                          ? ` · expires ${formatUKDate(doc.expiry_date)}`
                          : ""} · {doc.file_name}
                      </p>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void openDocument(doc.file_path)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-black uppercase tracking-widest hover:border-primary"
                        >
                          <ExternalLink className="h-3 w-3" /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => void openDocument(doc.file_path, true, doc.file_name)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-black uppercase tracking-widest hover:border-primary"
                        >
                          <Download className="h-3 w-3" /> Download
                        </button>
                      </div>
                    </div>
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
            Current certificate documents
          </h2>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Renewals create new records. Previous files are retained for audit and hidden from the
          current list.
        </p>
        {currentDocuments.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            No approved certificate documents yet.
          </p>
        ) : (
          <div className="mt-5 space-y-2">
            {currentDocuments.map((document) => {
              const staffName =
                workers.find((worker) => worker.id === document.staff_id)?.name ?? "Unknown staff";
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
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                      Current
                    </span>
                    <button
                      type="button"
                      onClick={() => void openDocument(document.file_path)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest hover:border-primary"
                    >
                      <ExternalLink className="h-3 w-3" /> View
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void openDocument(document.file_path, true, document.file_name)
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest hover:border-primary"
                    >
                      <Download className="h-3 w-3" /> Download
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {previousDocuments.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setShowPrevious((visible) => !visible)}
              className="text-xs font-black uppercase tracking-widest text-primary"
            >
              {showPrevious
                ? "Hide previous versions"
                : `View ${previousDocuments.length} previous version${previousDocuments.length === 1 ? "" : "s"}`}
            </button>
            {showPrevious && (
              <div className="mt-3 space-y-2">
                {previousDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs"
                  >
                    <span className="min-w-0 truncate">
                      {workers.find((worker) => worker.id === document.staff_id)?.name ??
                        "Unknown staff"}{" "}
                      · {document.ticket_type} · {document.file_name}
                    </span>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => void openDocument(document.file_path)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-black uppercase tracking-widest hover:border-primary"
                      >
                        <ExternalLink className="h-3 w-3" /> View
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void openDocument(document.file_path, true, document.file_name)
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-black uppercase tracking-widest hover:border-primary"
                      >
                        <Download className="h-3 w-3" /> Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
