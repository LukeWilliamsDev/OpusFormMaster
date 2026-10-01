import React, { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  FileDown,
  FileText,
  HelpCircle,
  Image,
  LayoutDashboard,
  ListChecks,
  MessageSquareText,
  Paperclip,
  Smartphone,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { usePortal } from "../context/PortalContext";

type HelpItem = {
  title: string;
  summary: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
};

const ActionLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link
    to={to}
    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-bold uppercase tracking-wider text-primary-foreground"
  >
    {children} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
  </Link>
);

const HelpLayout: React.FC<{
  label: string;
  title: string;
  intro: string;
  items: HelpItem[];
  support: "it" | "operations";
  pdf?: boolean;
}> = ({ label, title, intro, items, support, pdf = false }) => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set([items[0]?.title]));
  const toggle = (title: string) =>
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            {label}
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">{intro}</p>
        </header>

        <section aria-labelledby="help-topics-heading">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 id="help-topics-heading" className="text-lg font-bold">
                What do you need to do?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Open a task for the steps and the correct place to start.
              </p>
            </div>
            {pdf && (
              <a
                href="/guides/third-party-portal-user-guide.pdf"
                download
                className="hidden items-center gap-2 text-xs font-bold text-primary hover:underline sm:flex"
              >
                <FileDown className="h-4 w-4" aria-hidden="true" /> Download PDF guide · v2.0
              </a>
            )}
          </div>
          <div className="space-y-3">
            {items.map((item) => {
              const Icon = item.icon;
              const isOpen = openSections.has(item.title);
              return (
                <div
                  key={item.title}
                  className="overflow-hidden rounded-xl border border-border bg-card"
                >
                  <h3 className="m-0">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => toggle(item.title)}
                      className="flex min-h-[72px] w-full items-center gap-4 px-4 py-4 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 sm:px-5"
                    >
                      <span className="rounded-lg bg-primary/10 p-2 text-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold">{item.title}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {item.summary}
                        </span>
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </button>
                  </h3>
                  {isOpen && (
                    <div className="border-t border-border px-4 py-4 text-sm leading-6 text-muted-foreground sm:px-5">
                      {item.content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {pdf && (
            <a
              href="/guides/third-party-portal-user-guide.pdf"
              download
              className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-xs font-bold text-primary hover:bg-muted sm:hidden"
            >
              <FileDown className="h-4 w-4" aria-hidden="true" /> Download the PDF guide · v2.0
            </a>
          )}
        </section>

        <section
          className="rounded-xl border border-border bg-card p-5"
          aria-labelledby="rules-heading"
        >
          <div className="flex items-center gap-3">
            <Paperclip className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id="rules-heading" className="text-base font-bold">
              Access and mobile guidance
            </h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>
              Use the exact navigation labels shown in this guide. On a phone, open{" "}
              <strong className="text-foreground">More</strong> for navigation that is not in the
              bottom bar.
            </li>
            <li>
              Cards and actions stack vertically on small screens; scroll to see the complete
              record.
            </li>
            <li>Never share your password or sign-in link.</li>
          </ul>
        </section>

        <section
          className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5"
          aria-labelledby="support-heading"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            <div>
              <h2 id="support-heading" className="text-base font-bold">
                {support === "it" ? "Contact IT" : "Contact operations"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {support === "it"
                  ? "Use Contact IT for access problems, missing records, or errors. Include what you were doing, the approximate time, device/browser, and exact error."
                  : "Use Contact operations for access problems, missing assignments, blockers, or questions about a site update."}
              </p>
              <Link
                to="/portal/contact"
                className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground"
              >
                {support === "it" ? "Contact IT" : "Contact operations"}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const InternalHelp: React.FC<{
  role: "admin" | "director" | "logistics_coordinator" | "logistics_assistant";
}> = ({ role }) => {
  const assistant = role === "logistics_assistant";
  const coordinator = role === "logistics_coordinator";
  const director = role === "director";
  const title =
    role === "admin"
      ? "Manage the whole portal"
      : director
        ? "Manage operations and people"
        : coordinator
          ? "Coordinate site operations"
          : "Review operational information";
  const restriction = assistant
    ? "Most operational pages are read-only for this role. Staff Approvals and general job, staff, schedule, note, attachment, quote, and document edits are not available. Certificate Checker is a separate exception for recording a CSCS outcome."
    : director
      ? "Users is available. Tenant-wide Audit Log and Policies are not available to this role."
      : coordinator
        ? "Users, tenant-wide Audit Log, and Policies are not available to this role."
        : "You can manage portal users, review the tenant-wide Audit Log, and manage Policies.";
  const items: HelpItem[] = [
    {
      title: "Review operations",
      summary: "Use the operational pages available to your role.",
      icon: LayoutDashboard,
      content: (
        <p>
          Use <strong className="text-foreground">Dashboard</strong>,{" "}
          <strong className="text-foreground">Job Ledger</strong>,{" "}
          <strong className="text-foreground">Site Schedule</strong>, and{" "}
          <strong className="text-foreground">Calendar</strong> to see jobs, schedules, and events.{" "}
          {assistant
            ? "The verified assistant access is for review; treat these records as read-only."
            : "Your role can update operational records where the page provides an edit action."}
        </p>
      ),
    },
    {
      title: "Staff and certificates",
      summary: assistant
        ? "Find staff records and read certificate status."
        : "Manage staff records and certificate checks.",
      icon: Users,
      content: (
        <p>
          Open <strong className="text-foreground">Staff</strong> to find staff and certificate
          information.{" "}
          {assistant
            ? "Review staff records and status. Use Certificate Checker only when you need to record a CSCS outcome; other certificate and evidence changes are not available here."
            : "You can manage staff and certificates according to your role."}
        </p>
      ),
    },
    {
      title: "Schedule and approvals",
      summary: assistant
        ? "Review schedules without promising edits."
        : "Assign people and review submissions.",
      icon: CalendarDays,
      content: (
        <p>
          Use <strong className="text-foreground">Site Schedule</strong> and{" "}
          <strong className="text-foreground">Calendar</strong> to plan work.{" "}
          {assistant ? (
            "Staff Approvals are not available to this role. You can review the staff view and schedule; schedule changes are not available."
          ) : (
            <>
              Use <strong className="text-foreground">Staff Approvals</strong> to review
              submissions, then assign staff to sites.
            </>
          )}
        </p>
      ),
    },
    {
      title: "Quotes and documents",
      summary: assistant
        ? "Review financial records only."
        : "Create and manage operational documents.",
      icon: FileText,
      content: (
        <p>
          Open <strong className="text-foreground">Quotes</strong> to track quotes and related
          documents.{" "}
          {assistant
            ? "The verified UI presents Pipeline and financial records as view-only; do not create or edit quotes or documents."
            : "You can create and manage quotes and operational documents."}
        </p>
      ),
    },
    {
      title: "Your access boundaries",
      summary: "Know what this role can see and change.",
      icon: CheckCircle2,
      content: <p>{restriction}</p>,
    },
    {
      title: "Use the portal on mobile",
      summary: "Navigate internal pages on a small screen.",
      icon: Smartphone,
      content: (
        <p>
          Use the bottom navigation where available. Open{" "}
          <strong className="text-foreground">More</strong> for{" "}
          <strong className="text-foreground">Help</strong>,{" "}
          <strong className="text-foreground">Contact IT</strong>, settings, legal, theme, and sign
          out. Scroll through stacked cards to reach all actions.
        </p>
      ),
    },
  ];
  return (
    <HelpLayout
      label={`${role.replaceAll("_", " ")} help`}
      title={title}
      intro="Use the pages and exact navigation labels below to complete your role’s work. Help describes verified access, not every control that may appear on screen."
      items={items}
      support="it"
    />
  );
};

const ThirdPartyHelp: React.FC = () => {
  const items: HelpItem[] = [
    {
      title: "Start from Portal Home",
      summary: "See staff, certificate, and site items needing attention.",
      icon: LayoutDashboard,
      content: (
        <>
          <p>
            Open <strong className="text-foreground">Home</strong>, review{" "}
            <strong className="text-foreground">Needs attention</strong>, open the linked record,
            and confirm the new status or item.
          </p>
          <ActionLink to="/portal/third-party">Open Home</ActionLink>
        </>
      ),
    },
    {
      title: "Add or manage your staff",
      summary: "Submit people and keep your records current.",
      icon: Users,
      content: (
        <>
          <p>
            Open <strong className="text-foreground">Staff</strong>, choose{" "}
            <strong className="text-foreground">Add staff member</strong>, and submit accurate
            details. Pending submissions await Opus Form review. You can update your own staff
            details.
          </p>
          <ActionLink to="/portal/third-party/staff">Open Staff</ActionLink>
        </>
      ),
    },
    {
      title: "Upload or renew a certificate",
      summary: "Add evidence and understand review status.",
      icon: FileText,
      content: (
        <p>
          On a staff record choose <strong className="text-foreground">Add certificate</strong> or{" "}
          <strong className="text-foreground">Replace</strong>. Upload PDF, JPG, JPEG, or PNG files
          up to 10 MB. Uploading does not approve the certificate; Opus Form reviews it.
        </p>
      ),
    },
    {
      title: "Find an assigned site",
      summary: "Search sites linked to your approved staff.",
      icon: Image,
      content: (
        <>
          <p>
            Open <strong className="text-foreground">Assigned Sites</strong> (shown as{" "}
            <strong className="text-foreground">Sites</strong> on mobile), search by site name or
            postcode, and use <strong className="text-foreground">All</strong>,{" "}
            <strong className="text-foreground">Open</strong>,{" "}
            <strong className="text-foreground">Needs attention</strong>, or{" "}
            <strong className="text-foreground">Completed</strong>.
          </p>
          <ActionLink to="/portal/third-party/sites">Open Sites</ActionLink>
        </>
      ),
    },
    {
      title: "Add a note or upload a file",
      summary: "Update an open assigned site.",
      icon: MessageSquareText,
      content: (
        <p>
          On an open site choose <strong className="text-foreground">Add a note</strong> or the
          attachment upload control. Files are limited to 10 MB. Your conversation contains your
          notes and replies attached to those notes; it does not expose internal-only notes.
        </p>
      ),
    },
    {
      title: "View completed site history",
      summary: "Completed sites remain read-only.",
      icon: CheckCircle2,
      content: (
        <p>
          Open <strong className="text-foreground">Sites</strong> and filter{" "}
          <strong className="text-foreground">Completed</strong>. You can view history, but cannot
          add notes or upload, rename, or delete content.
        </p>
      ),
    },
    {
      title: "Use the portal on mobile",
      summary: "Find Home, Staff, Sites, Help, and More.",
      icon: Smartphone,
      content: (
        <p>
          Use the bottom navigation for <strong className="text-foreground">Home</strong>,{" "}
          <strong className="text-foreground">Staff</strong>,{" "}
          <strong className="text-foreground">Sites</strong>, and{" "}
          <strong className="text-foreground">Help</strong>. Use{" "}
          <strong className="text-foreground">More</strong> for{" "}
          <strong className="text-foreground">Contact IT</strong>, settings, legal, theme, and
          logout.
        </p>
      ),
    },
  ];
  return (
    <HelpLayout
      label="Third-party portal help"
      title="Complete a task"
      intro="Use the links below to manage your staff, certificates, and assigned sites. Start with Home when you are unsure what needs attention."
      items={items}
      support="it"
      pdf
    />
  );
};

const ForemanHelp: React.FC = () => (
  <HelpLayout
    label="Foreman help"
    title="Run today’s site work"
    intro="Use Today, Sites, Shifts, and More to complete assigned site work. Completed sites stay read-only."
    support="operations"
    items={[
      {
        title: "Complete Today’s Site Update",
        summary: "Record progress and the next-shift handoff.",
        icon: ListChecks,
        content: (
          <>
            <p>
              Open <strong className="text-foreground">Today</strong>, complete the update, then
              choose <strong className="text-foreground">Save draft</strong> or{" "}
              <strong className="text-foreground">Submit update</strong>. At risk and Blocked
              statuses need blocker details.
            </p>
            <ActionLink to="/portal/foreman">Open Today</ActionLink>
          </>
        ),
      },
      {
        title: "Report a blocker or risk",
        summary: "Give operations the detail they need.",
        icon: AlertCircle,
        content: (
          <p>
            Use the update form on <strong className="text-foreground">Today</strong> to record a
            blocker or risk. Contact operations if an assignment or site is missing.
          </p>
        ),
      },
      {
        title: "Add a site photo",
        summary: "Keep an assigned site record current.",
        icon: Image,
        content: (
          <p>
            Open the site and choose <strong className="text-foreground">Add photo</strong>. Photos
            must be 10 MB or smaller. Completed sites cannot be changed.
          </p>
        ),
      },
      {
        title: "Find assigned sites and shifts",
        summary: "Review current, upcoming, and past assignments.",
        icon: CalendarDays,
        content: (
          <p>
            Use <strong className="text-foreground">Sites</strong> to search and{" "}
            <strong className="text-foreground">Shifts</strong> for assignments. On mobile, open{" "}
            <strong className="text-foreground">More</strong> for{" "}
            <strong className="text-foreground">Help</strong>,{" "}
            <strong className="text-foreground">Contact operations</strong>, settings, legal, theme,
            and sign out.
          </p>
        ),
      },
      {
        title: "Contact operations",
        summary: "Ask about blockers, assignments, or missing sites.",
        icon: MessageSquareText,
        content: (
          <p>
            Use <strong className="text-foreground">Contact operations</strong> on the site record
            to send an internal update to operations. Completed sites are{" "}
            <strong className="text-foreground">view-only</strong>.
          </p>
        ),
      },
    ]}
  />
);

const NoAccess: React.FC = () => (
  <div className="flex flex-1 items-center justify-center bg-background px-6 py-12 text-foreground">
    <section className="max-w-lg rounded-2xl border border-border bg-card p-6 text-center">
      <h1 className="text-xl font-black">Portal access is not enabled for this account.</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Contact Opus Form if you expected access.
      </p>
    </section>
  </div>
);

export const PortalHelpPage: React.FC = () => {
  const { role } = usePortal();
  if (role === "labourer" || !role) return <NoAccess />;
  if (role === "site_foreman") return <ForemanHelp />;
  if (role === "third_party") return <ThirdPartyHelp />;
  return <InternalHelp role={role} />;
};
