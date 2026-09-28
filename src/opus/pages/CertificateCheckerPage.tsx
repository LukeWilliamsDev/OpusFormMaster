import React, { useEffect, useMemo, useState } from "react";
import { BadgeCheck, ExternalLink, FileUp, History, ShieldCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { usePortal } from "../context/PortalContext";
import { supabase } from "../../integrations/supabase/client";
import { formatUKDate } from "../utils/week";

const db = supabase as any;
const OFFICIAL_CSCS_CHECKER = "https://www.cscs.uk.com/checkcards/";

type CheckResult = "verified" | "not_found" | "expired" | "mismatch" | "unable_to_verify";

const RESULT_LABELS: Record<CheckResult, string> = {
  verified: "Verified",
  not_found: "Not found",
  expired: "Expired",
  mismatch: "Details do not match",
  unable_to_verify: "Unable to verify",
};

const RESULT_STYLES: Record<CheckResult, string> = {
  verified: "border-success/30 bg-success/10 text-success",
  not_found: "border-destructive/30 bg-destructive/10 text-destructive",
  expired: "border-destructive/30 bg-destructive/10 text-destructive",
  mismatch: "border-warning/30 bg-warning/10 text-warning",
  unable_to_verify: "border-warning/30 bg-warning/10 text-warning",
};

export const CertificateCheckerPage: React.FC = () => {
  const { user, profile, workers } = usePortal();
  const [searchParams] = useSearchParams();
  const [staffId, setStaffId] = useState(searchParams.get("staffId") ?? "");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [result, setResult] = useState<CheckResult>("verified");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [evidence, setEvidence] = useState<File | null>(null);
  const [checks, setChecks] = useState<any[]>([]);
  const [loadingChecks, setLoadingChecks] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectedWorker = useMemo(
    () => workers.find((worker) => worker.id === staffId),
    [workers, staffId],
  );

  const loadChecks = async () => {
    if (!staffId) return setChecks([]);
    setLoadingChecks(true);
    const { data, error } = await db
      .from("staff_certificate_checks")
      .select(
        "id, certificate_type, certificate_number, result, expiry_date, notes, evidence_path, created_at, checked_by",
      )
      .eq("staff_id", staffId)
      .order("created_at", { ascending: false });
    setLoadingChecks(false);
    if (error) return toast.error(error.message || "Unable to load check history");
    setChecks(data ?? []);
  };

  useEffect(() => {
    loadChecks();
  }, [staffId]);

  const openEvidence = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("certificate-check-evidence")
      .createSignedUrl(path, 300);
    if (error || !data?.signedUrl) return toast.error(error?.message || "Unable to open evidence");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const recordCheck = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!staffId || !certificateNumber.trim() || !user || !profile?.tenant_id) return;
    setSaving(true);
    let evidencePath: string | null = null;
    if (evidence) {
      const extension = evidence.name.split(".").pop() || "bin";
      evidencePath = `${profile.tenant_id}/${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage
        .from("certificate-check-evidence")
        .upload(evidencePath, evidence);
      if (error) {
        setSaving(false);
        return toast.error(error.message || "Unable to upload evidence");
      }
    }
    const { error } = await db.from("staff_certificate_checks").insert({
      tenant_id: profile.tenant_id,
      staff_id: staffId,
      checked_by: user.id,
      certificate_type: "CSCS",
      certificate_number: certificateNumber.trim(),
      result,
      expiry_date: expiryDate || null,
      notes: notes.trim() || null,
      evidence_path: evidencePath,
    });
    setSaving(false);
    if (error) return toast.error(error.message || "Unable to save certificate check");
    setCertificateNumber("");
    setDateOfBirth("");
    setExpiryDate("");
    setNotes("");
    setEvidence(null);
    await loadChecks();
    toast.success("CSCS check recorded");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          Staff compliance
        </p>
        <h1 className="mt-2 text-3xl font-black text-foreground">Certificate checker</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Check a CSCS card using the official checker, then record the result against the staff
          member.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form
          onSubmit={recordCheck}
          className="space-y-5 rounded-2xl border-2 border-border bg-card p-5 sm:p-6"
        >
          <div className="flex items-start gap-3 border-b border-border pb-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BadgeCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest">New CSCS check</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                The date of birth is used only while checking and is never stored.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-muted-foreground sm:col-span-2">
              Staff member
              <select
                required
                value={staffId}
                onChange={(event) => setStaffId(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground"
              >
                <option value="">Select a staff member</option>
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name} · {worker.role}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-muted-foreground">
              CSCS card number
              <input
                required
                value={certificateNumber}
                onChange={(event) => setCertificateNumber(event.target.value)}
                placeholder="Enter card number"
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground"
              />
            </label>
            <label className="text-xs font-bold text-muted-foreground">
              Date of birth
              <input
                type="date"
                value={dateOfBirth}
                onChange={(event) => setDateOfBirth(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground"
              />
            </label>
          </div>
          <a
            href={OFFICIAL_CSCS_CHECKER}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-primary hover:bg-primary/20"
          >
            <ExternalLink className="h-4 w-4" />
            Open official CSCS checker
          </a>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-muted-foreground">
              Checker result
              <select
                value={result}
                onChange={(event) => setResult(event.target.value as CheckResult)}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground"
              >
                {Object.entries(RESULT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-muted-foreground">
              Expiry date, if shown
              <input
                type="date"
                value={expiryDate}
                onChange={(event) => setExpiryDate(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground"
              />
            </label>
          </div>
          <label className="block text-xs font-bold text-muted-foreground">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Record anything relevant from the official check..."
              className="mt-1.5 min-h-24 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary">
            <FileUp className="h-4 w-4 text-primary" />
            <span className="truncate">
              {evidence?.name || "Upload evidence or screenshot (optional)"}
            </span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(event) => setEvidence(event.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="submit"
            disabled={saving || !selectedWorker}
            className="min-h-11 rounded-lg bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Saving..." : "Record check"}
          </button>
        </form>

        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-success" />
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              Use the official source
            </p>
          </div>
          <p className="text-sm font-bold">
            Opus Form records the outcome; CSCS confirms the card.
          </p>
          <p className="text-sm text-muted-foreground">
            Open the official checker, enter the card number and date of birth, then return here to
            record the result and evidence.
          </p>
          <p className="text-xs text-muted-foreground">
            Checks are tenant-scoped, audited, and visible only to internal users.
          </p>
        </aside>
      </div>

      <section className="rounded-2xl border-2 border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-black uppercase tracking-widest">
              Check history{selectedWorker ? ` · ${selectedWorker.name}` : ""}
            </h2>
          </div>
          {loadingChecks && <span className="text-xs text-muted-foreground">Loading...</span>}
        </div>
        {!staffId ? (
          <p className="mt-5 text-sm text-muted-foreground">
            Select a staff member to view previous checks.
          </p>
        ) : checks.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            No checks recorded for this staff member yet.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {checks.map((check) => (
              <div
                key={check.id}
                className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-bold">
                    {check.certificate_type} · {check.certificate_number}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Checked {formatUKDate(check.created_at?.slice(0, 10))}
                    {check.expiry_date ? ` · Expires ${formatUKDate(check.expiry_date)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${RESULT_STYLES[check.result as CheckResult]}`}
                  >
                    {RESULT_LABELS[check.result as CheckResult]}
                  </span>
                  {check.evidence_path && (
                    <button
                      onClick={() => openEvidence(check.evidence_path)}
                      className="text-xs font-bold text-primary"
                    >
                      View evidence
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
