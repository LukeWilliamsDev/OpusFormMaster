import React, { useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, Mail, Send, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../../integrations/supabase/client";

export const PortalContactPage: React.FC = () => {
  const contactTeam = "IT";
  const [form, setForm] = useState({ category: "", subject: "", message: "" });
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const subjectLimit = Math.max(1, 120 - (form.category ? form.category.length + 3 : 0));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    if (!form.subject.trim() || !form.message.trim()) {
      setStatus({ type: "error", text: "Add a subject and message before sending." });
      return;
    }
    setSending(true);
    const subject = form.category
      ? `[${form.category}] ${form.subject.trim()}`
      : form.subject.trim();

    const { error } = await supabase.functions.invoke("send-portal-help-request", {
      body: {
        subject: subject.slice(0, 120),
        message: form.message.trim(),
      },
    });

    setSending(false);
    if (error) {
      setStatus({
        type: "error",
        text: "Your message could not be sent.",
      });
      return;
    }

    setForm({ category: "", subject: "", message: "" });
    setStatus({
      type: "success",
      text: "Message sent. Opus Form IT has received your request and will reply during working hours.",
    });
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-5xl space-y-8">
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
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Contact {contactTeam}
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                Send a question or report a problem to {contactTeam}. Your signed-in email address
                will be included so the team can reply. We normally respond during working hours.
              </p>
            </div>
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)]">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <div className="mb-6 border-b border-border pb-5">
              <h2 className="text-lg font-black tracking-tight">Send a support request</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The more specific the details, the faster we can find the problem.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="contact-category"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  What is this about?
                </label>
                <select
                  id="contact-category"
                  value={form.category}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, category: event.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select a category (optional)</option>
                  <option>Site access</option>
                  <option>Staff or certificate</option>
                  <option>Upload problem</option>
                  <option>Site note or reply</option>
                  <option>Account or password</option>
                  <option>Other</option>
                </select>
              </div>
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
                  maxLength={subjectLimit}
                  value={form.subject}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, subject: event.target.value }))
                  }
                  placeholder="For example: Certificate upload failed for Alex Morgan"
                  className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <p className="mt-1.5 text-right text-[11px] text-muted-foreground">
                  {form.subject.length}/{subjectLimit}
                </p>
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
                  placeholder="What were you trying to do? What happened? What should happen instead?"
                  className="w-full resize-y rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Do not include passwords or unrelated personal information.
                </p>
                <p className="mt-1 text-right text-[11px] text-muted-foreground">
                  {form.message.length}/5000
                </p>
              </div>
              {status && (
                <p
                  role={status.type === "error" ? "alert" : "status"}
                  aria-live="polite"
                  className={`rounded-lg border px-3 py-2.5 text-sm ${status.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-destructive/30 bg-destructive/10 text-destructive"}`}
                >
                  {status.text}
                  {status.type === "error" && (
                    <>
                      {" "}
                      Try again, or email IT directly at{" "}
                      <a href="mailto:luke@opusform.co.uk" className="font-bold underline">
                        luke@opusform.co.uk
                      </a>
                      .
                    </>
                  )}
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

          <aside className="space-y-4">
            <section className="rounded-2xl border border-[#35464a] bg-[#18252a] p-5 text-[#f7f4ee] shadow-sm">
              <div className="flex items-center gap-2 text-[#d79a5b]">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                <h2 className="text-xs font-black uppercase tracking-[0.18em]">
                  What happens next
                </h2>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#d8d1c6]">
                Your signed-in email address is included automatically. {contactTeam} normally
                replies during working hours.
              </p>
              <div className="mt-4 flex items-start gap-2 border-t border-[#405257] pt-4 text-xs leading-5 text-[#c5c0b8]">
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#d79a5b]"
                  aria-hidden="true"
                />
                <span>
                  Keep the site or staff name in your message so we can locate the record.
                </span>
              </div>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <h2 className="text-xs font-black uppercase tracking-[0.18em]">Before you send</h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-5 text-muted-foreground">
                <li>Include what you were trying to do and what happened.</li>
                <li>Add the site or staff member involved, if relevant.</li>
                <li>Include the exact error message and approximate time.</li>
                <li>Never include passwords, sign-in links, or payment details.</li>
              </ul>
            </section>
          </aside>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Your message will be sent securely to the Opus Form IT team.
        </p>
      </div>
    </div>
  );
};
