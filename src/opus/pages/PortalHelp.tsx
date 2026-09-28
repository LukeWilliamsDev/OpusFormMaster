import React, { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileDown,
  FileText,
  HelpCircle,
  Image,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  MessageSquareText,
  Paperclip,
  Smartphone,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

type HelpSection = {
  id: string;
  title: string;
  summary: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
};

const HelpSections: HelpSection[] = [
  {
    id: "staff",
    title: "Add or manage staff",
    summary: "Submit people for review and keep their records current.",
    icon: Users,
    content: (
      <div className="space-y-3 text-sm leading-6 text-muted-foreground">
        <p>
          Open <strong className="text-foreground">Staff</strong> to search approved staff and
          people awaiting review. Select{" "}
          <strong className="text-foreground">Add staff member</strong>, enter accurate details, and
          submit the record to Opus Form.
        </p>
        <p>
          A new submission is <strong className="text-foreground">Pending review</strong> until Opus
          Form checks it. It will not create site access until approved. You can upload certificates
          after submitting and edit the staff member’s name, role, email, phone, and postcode.
        </p>
        <Link
          to="/portal/third-party/staff"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-bold uppercase tracking-wider text-primary-foreground"
        >
          Open Staff <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    ),
  },
  {
    id: "certificates",
    title: "Upload or renew a certificate",
    summary: "Add evidence, replace an expiry, and understand the review status.",
    icon: FileText,
    content: (
      <div className="space-y-3 text-sm leading-6 text-muted-foreground">
        <p>
          Open a staff record and choose{" "}
          <strong className="text-foreground">Add certificate</strong> or{" "}
          <strong className="text-foreground">Replace</strong>. Enter the certificate type, number,
          and expiry date, then upload a PDF, JPG, JPEG, or PNG file no larger than 10 MB.
        </p>
        <p>
          Replacing evidence creates a new current record; previous versions remain available to
          Opus Form for audit. Uploading a document does not approve it: Opus Form completes the
          review.
        </p>
        <p>
          <strong className="text-foreground">Valid</strong> means current.{" "}
          <strong className="text-foreground">Expiring</strong> means renewal may be needed soon.{" "}
          <strong className="text-foreground">Expired</strong> means it is no longer current.{" "}
          <strong className="text-foreground">Needs review</strong> means Opus Form needs to check
          it.
        </p>
        <Link
          to="/portal/third-party/staff"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-bold uppercase tracking-wider text-primary-foreground"
        >
          Open Staff <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    ),
  },
  {
    id: "sites",
    title: "Find an assigned site",
    summary: "Search sites, filter by status, and open the right record.",
    icon: Image,
    content: (
      <div className="space-y-3 text-sm leading-6 text-muted-foreground">
        <p>
          Select <strong className="text-foreground">Sites</strong> to see locations linked to your
          approved staff through their assignments. Sites are assigned by Opus Form; they are not
          added manually by third-party users.
        </p>
        <p>
          Search by site name or postcode and use the filters for{" "}
          <strong className="text-foreground">All</strong>,{" "}
          <strong className="text-foreground">Open</strong>,{" "}
          <strong className="text-foreground">Needs attention</strong>, or{" "}
          <strong className="text-foreground">Completed</strong>.
        </p>
        <Link
          to="/portal/third-party/sites"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-bold uppercase tracking-wider text-primary-foreground"
        >
          Open Sites <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    ),
  },
  {
    id: "updates",
    title: "Add a note or upload a file",
    summary: "Share a site update and confirm that it was saved.",
    icon: MessageSquareText,
    content: (
      <div className="space-y-3 text-sm leading-6 text-muted-foreground">
        <p>
          Open an open site and check its name before using{" "}
          <strong className="text-foreground">Add a note</strong> or the attachment upload control.
          Keep notes factual and relevant. You can reply to Opus Form’s responses; use a new note
          for a new update.
        </p>
        <p>
          Site attachments are limited to 10 MB per file. Accepted types are PDF, DOC, DOCX, XLS,
          XLSX, and TXT. Use a clear filename and upload only information relevant to that site.
          Site photos supplied by Opus Form are view-only.
        </p>
        <p>
          After posting or uploading, confirm the new item appears in the conversation or file list.
          If an upload fails, check the size and file type before trying again.
        </p>
        <Link
          to="/portal/third-party/sites"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-bold uppercase tracking-wider text-primary-foreground"
        >
          Open Sites <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    ),
  },
  {
    id: "completed",
    title: "View a completed site",
    summary: "Completed records stay available as read-only history.",
    icon: CheckCircle2,
    content: (
      <div className="space-y-3 text-sm leading-6 text-muted-foreground">
        <p>
          Completed sites remain in <strong className="text-foreground">Sites</strong> so you can
          view their photos, attachments, notes, replies, assigned staff, and completion details.
        </p>
        <p>
          A completed site is <strong className="text-foreground">view-only</strong>. You cannot add
          notes, upload attachments, rename files, or delete content from it.
        </p>
        <Link
          to="/portal/third-party/sites?filter=completed"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-bold uppercase tracking-wider text-primary-foreground"
        >
          View Site History <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    ),
  },
  {
    id: "mobile",
    title: "Use the portal on a phone",
    summary: "Home, Staff, Sites, Help, and More stay available on small screens.",
    icon: Smartphone,
    content: (
      <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
        <li>Use the bottom navigation to move between Home, Staff, Sites, and Help.</li>
        <li>
          Use <strong className="text-foreground">More</strong> for Contact IT, settings, legal,
          theme, and logout.
        </li>
        <li>
          On a detail page, the bottom navigation remains available so you do not need to go back
          repeatedly.
        </li>
        <li>Cards and actions stack vertically. Scroll down to see the complete record.</li>
      </ul>
    ),
  },
];

const STATUS_ITEMS = [
  [
    "Needs attention",
    "A certificate, submission, or site update needs action. Open the linked item.",
  ],
  [
    "Pending review",
    "Submitted to Opus Form and awaiting review. No further action is needed unless requested.",
  ],
  ["Valid", "The certificate is current."],
  ["Expiring", "Renewal may be needed before the expiry date."],
  ["Expired", "The certificate is no longer current; upload a replacement."],
  ["Needs review", "Opus Form needs to check the certificate or supporting evidence."],
  [
    "Completed — view only",
    "Site work is complete. History remains available, but new updates are disabled.",
  ],
];

export const PortalHelpPage: React.FC = () => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["staff"]));
  const toggleSection = (id: string) =>
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            Third-party portal help
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Complete a task</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Use the links below to manage staff, check certificates, and update assigned sites. If
            you are unsure what to do next, start with{" "}
            <strong className="text-foreground">Needs attention</strong> on Home.
          </p>
        </header>

        <section
          className="overflow-hidden rounded-2xl border border-[#35464a] bg-[#18252a] text-[#f7f4ee] shadow-lg"
          aria-labelledby="quick-start-heading"
        >
          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[0.9fr_1.4fr] lg:items-center">
            <div>
              <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#d79a5b]">
                <ListChecks className="h-4 w-4" aria-hidden="true" />
                Quick start
              </div>
              <h2 id="quick-start-heading" className="text-2xl font-black tracking-tight">
                Know what needs doing
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-[#d8d1c6]">
                The Home screen brings together staff, certificate, and site actions that need your
                attention. Start there when you are not sure where to begin.
              </p>
              <Link
                to="/portal/third-party"
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#b5651d] px-4 text-xs font-black uppercase tracking-wider text-white hover:bg-[#c4772c]"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Open Home
              </Link>
            </div>
            <ol className="grid gap-2 sm:grid-cols-2">
              {[
                ["Open Home", "See the current picture."],
                ["Review Needs attention items", "Find the item that needs action."],
                ["Open the linked record", "Check the staff member or site."],
                ["Complete and confirm", "Look for the updated status or new item."],
              ].map(([title, description], index) => (
                <li
                  key={title}
                  className="flex gap-3 rounded-xl border border-[#405257] bg-[#223238] p-3.5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#b5651d] text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <span>
                    <strong className="block text-xs font-bold text-[#f7f4ee]">{title}</strong>
                    <span className="mt-1 block text-[11px] leading-4 text-[#c5c0b8]">
                      {description}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="help-topics-heading">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 id="help-topics-heading" className="text-lg font-bold">
                What do you need to do?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Open one or more tasks for the steps and the correct place to start.
              </p>
            </div>
            <a
              href="/guides/third-party-portal-user-guide.pdf"
              download
              className="hidden items-center gap-2 text-xs font-bold text-primary hover:underline sm:flex"
            >
              <FileDown className="h-4 w-4" aria-hidden="true" />
              Download PDF guide · v2.0 · Updated September 2026
            </a>
          </div>
          <div className="space-y-3">
            {HelpSections.map(({ id, title, summary, icon: Icon, content }) => {
              const isOpen = openSections.has(id);
              return (
                <div key={id} className="overflow-hidden rounded-xl border border-border bg-card">
                  <h3 className="m-0">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`help-${id}`}
                      onClick={() => toggleSection(id)}
                      className="flex min-h-[72px] w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 sm:px-5"
                    >
                      <span className="rounded-lg bg-primary/10 p-2 text-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold">{title}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{summary}</span>
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </button>
                  </h3>
                  {isOpen && (
                    <div id={`help-${id}`} className="border-t border-border px-4 py-4 sm:px-5">
                      {content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <a
            href="/guides/third-party-portal-user-guide.pdf"
            download
            className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-xs font-bold text-primary hover:bg-muted sm:hidden"
          >
            <FileDown className="h-4 w-4" aria-hidden="true" />
            Download the PDF guide · v2.0 · Updated September 2026
          </a>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section
            className="rounded-xl border border-border bg-card p-5"
            aria-labelledby="status-heading"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 id="status-heading" className="text-base font-bold">
                Status words
              </h2>
            </div>
            <dl className="mt-4 divide-y divide-border">
              {STATUS_ITEMS.map(([term, description]) => (
                <div key={term} className="py-3 first:pt-0 last:pb-0">
                  <dt className="text-sm font-semibold">{term}</dt>
                  <dd className="mt-1 text-xs leading-5 text-muted-foreground">{description}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section
            className="rounded-xl border border-border bg-card p-5"
            aria-labelledby="rules-heading"
          >
            <div className="flex items-center gap-3">
              <Paperclip className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 id="rules-heading" className="text-base font-bold">
                File and access rules
              </h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>Certificates: PDF, JPG, JPEG, or PNG; maximum 10 MB.</li>
              <li>Site attachments: maximum 10 MB per file; upload only relevant information.</li>
              <li>Never share your password or sign-in link.</li>
              <li>Completed sites are view-only.</li>
            </ul>
          </section>
        </div>

        <section
          className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5"
          aria-labelledby="support-heading"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            <div>
              <h2 id="support-heading" className="text-base font-bold">
                Contact IT
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Use Contact IT for access problems, missing records, upload errors, or site-note
                issues. Include the site or staff name, what you were doing, approximate time,
                device/browser, and exact error. Do not include passwords, sign-in links, payment
                details, or unrelated personal information.
              </p>
              <Link
                to="/portal/contact"
                className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
              >
                Contact IT
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
