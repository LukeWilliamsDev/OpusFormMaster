import React, { useState } from "react";
import { QuoteInvoiceBuilder } from "../components/QuoteInvoiceBuilder";
import { DOCUMENT_SEND_ROLES, usePortal } from "../context/PortalContext";

export const DocumentSendPage: React.FC = () => {
  const { jobs, role } = usePortal();
  const [mode, setMode] = useState<"quote" | "finalBill">("quote");
  const [jobId, setJobId] = useState<string>("");
  const [builderKey, setBuilderKey] = useState(0);

  const selectedJob = jobs.find((job) => job.id === jobId);
  const canSend = role ? DOCUMENT_SEND_ROLES.includes(role) : false;

  if (!canSend) return null;

  const startDocument = (nextMode: "quote" | "finalBill") => {
    setMode(nextMode);
    setBuilderKey((current) => current + 1);
  };

  return (
    <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto space-y-6 animate-fade-in">
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Document sending
          </p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-foreground">
            Prepare and send a client document
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This workspace only exposes quote, invoice and client-email actions.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Job (required for invoice)
            </span>
            <select
              value={jobId}
              onChange={(event) => {
                setJobId(event.target.value);
                setBuilderKey((current) => current + 1);
              }}
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="">Standalone quote</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.jobRef} — {job.siteName}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Document type
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startDocument("quote")}
                className={`flex-1 rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                  mode === "quote"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                Quote
              </button>
              <button
                type="button"
                onClick={() => startDocument("finalBill")}
                disabled={!selectedJob}
                className={`flex-1 rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  mode === "finalBill"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                Invoice
              </button>
            </div>
          </div>
        </div>
      </section>

      {mode === "finalBill" && !selectedJob ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Select a job before preparing an invoice.
        </div>
      ) : (
        <QuoteInvoiceBuilder
          key={`${builderKey}-${mode}-${jobId}`}
          onLogout={() => {}}
          onBack={() => setBuilderKey((current) => current + 1)}
          mode={mode}
          sendOnly
          jobId={selectedJob?.id}
          jobRef={selectedJob?.jobRef}
          prefill={
            selectedJob
              ? {
                  entity: selectedJob.mainContractor,
                  email: selectedJob.email || "",
                  site: selectedJob.siteName,
                  postcode: selectedJob.postcode,
                }
              : undefined
          }
        />
      )}
    </div>
  );
};
