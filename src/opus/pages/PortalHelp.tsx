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
  LockKeyhole,
  MessageSquareText,
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

const HELP_SECTIONS: HelpSection[] = [
  {
    id: "staff",
    title: "Manage your staff",
    summary: "Check approval status and keep staff evidence up to date.",
    icon: Users,
    content: (
      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>
          Open <strong className="text-foreground">Staff</strong> from the portal menu.
        </li>
        <li>Search for the person and open their record.</li>
        <li>Check the approval status and the documents held against the person.</li>
        <li>
          If the record says <strong className="text-foreground">Review</strong>, Opus Form still
          needs to check the information or evidence.
        </li>
      </ol>
    ),
  },
  {
    id: "sites",
    title: "Open an assigned site",
    summary: "Find the site record, status, staff, photos, notes, and files.",
    icon: Image,
    content: (
      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>
          Open <strong className="text-foreground">Assigned sites</strong> or select a site from the
          home page.
        </li>
        <li>Confirm the site name, address, and status before adding information.</li>
        <li>Read the latest note and check its author and date.</li>
        <li>
          Use the site’s photo and attachment areas to view or provide supporting information where
          the control is available.
        </li>
      </ol>
    ),
  },
  {
    id: "updates",
    title: "Add a note or file",
    summary: "Share a concise site update and verify that it was saved.",
    icon: MessageSquareText,
    content: (
      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Open the correct site before selecting an update or upload action.</li>
        <li>Keep notes factual, short, and relevant to that site.</li>
        <li>
          Choose a clear filename and check that the file contains no unrelated personal
          information.
        </li>
        <li>
          Follow the file type and size rules shown by the portal, then wait for the new item to
          appear before closing the page.
        </li>
      </ol>
    ),
  },
  {
    id: "mobile",
    title: "Use the portal on a phone",
    summary: "The layout adapts to smaller screens without changing your access.",
    icon: Smartphone,
    content: (
      <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Use the mobile menu to move between Home, Staff, and Sites.</li>
        <li>Scroll down: cards and actions stack vertically on smaller screens.</li>
        <li>
          Use <strong className="text-foreground">More</strong> for account, theme, legal, and
          logout options.
        </li>
        <li>
          If an action is difficult to select, use a larger screen and report the problem if it
          continues.
        </li>
      </ul>
    ),
  },
];

const STATUS_ITEMS = [
  ["Current / Active", "The record is accepted or available to your account."],
  ["Review / Needs review", "Opus Form needs to check information or evidence."],
  ["Expiring soon", "Renewed evidence may be needed before the expiry date."],
  ["Expired", "The evidence is past its expiry date and should not be treated as current."],
];

export const PortalHelpPage: React.FC = () => {
  const [openSection, setOpenSection] = useState("staff");

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            Third-party portal help
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">How to use the portal</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Short, practical guidance for checking staff, opening assigned sites, and sharing site
            information with Opus Form.
          </p>
        </header>

        <section
          className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6"
          aria-labelledby="quick-start-heading"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary p-2.5 text-primary-foreground">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="quick-start-heading" className="text-base font-bold">
                Your first five minutes
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  "Sign in with your own account",
                  "Check anything needing attention",
                  "Open the right site",
                  "Confirm your update appears",
                ].map((step, index) => (
                  <div
                    key={step}
                    className="flex gap-3 rounded-xl border border-border/70 bg-card/70 p-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">
                      {index + 1}
                    </span>
                    <span className="text-xs font-semibold leading-5 text-foreground">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="help-topics-heading">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 id="help-topics-heading" className="text-lg font-bold">
                Common tasks
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Open a task to see the steps without leaving your work.
              </p>
            </div>
            <a
              href="/guides/third-party-portal-user-guide.pdf"
              download
              className="hidden items-center gap-2 text-xs font-bold text-primary hover:underline sm:flex"
            >
              <FileDown className="h-4 w-4" aria-hidden="true" />
              Download PDF guide
            </a>
          </div>
          <div className="space-y-3">
            {HELP_SECTIONS.map(({ id, title, summary, icon: Icon, content }) => {
              const isOpen = openSection === id;
              return (
                <div key={id} className="overflow-hidden rounded-xl border border-border bg-card">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`help-${id}`}
                    onClick={() => setOpenSection(isOpen ? "" : id)}
                    className="flex min-h-[72px] w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/50 sm:px-5"
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
            Download the PDF guide
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
            aria-labelledby="security-heading"
          >
            <div className="flex items-center gap-3">
              <LockKeyhole className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 id="security-heading" className="text-base font-bold">
                Keep your access safe
              </h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                Never forward your password or sign-in link.
              </li>
              <li className="flex gap-2">
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                Only upload documents relevant to the selected site or staff member.
              </li>
              <li className="flex gap-2">
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                Log out on shared or public devices.
              </li>
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
                Need help?
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Contact your Opus Form contact and include the organisation, site name, approximate
                time, device and browser, what you were trying to do, and the exact error message.
              </p>
              <Link
                to="/portal/contact"
                className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
              >
                Contact Opus Form IT
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
