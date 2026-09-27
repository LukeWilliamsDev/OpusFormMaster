import React, { useState } from "react";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../../integrations/supabase/client";

export const PortalContactPage: React.FC = () => {
  const [form, setForm] = useState({ subject: "", message: "" });
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setSending(true);

    const { error } = await supabase.functions.invoke("send-portal-help-request", {
      body: { subject: form.subject.trim(), message: form.message.trim() },
    });

    setSending(false);
    if (error) {
      setStatus({
        type: "error",
        text: "Your message could not be sent. Please try again or email IT directly.",
      });
      return;
    }

    setForm({ subject: "", message: "" });
    setStatus({ type: "success", text: "Your message has been sent to the Opus Form IT team." });
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <Link
            to="/portal/help"
            className="mb-5 inline-flex min-h-[44px] items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Help &amp; Guidance
          </Link>
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
                Opus Form IT
              </div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Contact support</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                Send a question or report a problem to IT. Your signed-in email address will be
                included so the team can reply.
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="contact-subject"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Subject
              </label>
              <input
                id="contact-subject"
                required
                maxLength={120}
                value={form.subject}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, subject: event.target.value }))
                }
                placeholder="For example: I cannot open my assigned site"
                className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label
                htmlFor="contact-message"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Message
              </label>
              <textarea
                id="contact-message"
                required
                maxLength={5000}
                rows={8}
                value={form.message}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, message: event.target.value }))
                }
                placeholder="Tell us what happened, including the site name and any error message."
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Do not include passwords or unrelated personal information.
              </p>
            </div>
            {status && (
              <p
                role="status"
                className={`rounded-lg border px-3 py-2.5 text-sm ${status.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-destructive/30 bg-destructive/10 text-destructive"}`}
              >
                {status.text}
              </p>
            )}
            <button
              type="submit"
              disabled={sending}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {sending ? "Sending..." : "Send message"}
            </button>
          </form>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Your message will be sent securely to the Opus Form IT team.
        </p>
      </div>
    </div>
  );
};
