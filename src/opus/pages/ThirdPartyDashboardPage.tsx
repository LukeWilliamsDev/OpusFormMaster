import React from "react";
import { ArrowRight, ClipboardCheck, HardHat, MapPinned } from "lucide-react";
import { Link } from "react-router-dom";
import { usePortal } from "../context/PortalContext";

export const ThirdPartyDashboardPage: React.FC = () => {
  const { workers, jobs } = usePortal();
  const cards = [
    {
      href: "/portal/third-party/staff",
      label: "Staff",
      description: "Submit staff, track approvals, and maintain approved records.",
      count: workers.length,
      icon: HardHat,
    },
    {
      href: "/portal/third-party/staff?section=jobs",
      label: "Assigned sites",
      description: "View assigned jobs and add notes, photos, and attachments.",
      count: jobs.length,
      icon: MapPinned,
    },
  ];
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          Third-party portal
        </p>
        <h1 className="mt-2 text-2xl font-black text-foreground">Good morning</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose what you need to do. You only see your staff and assigned sites.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map(({ href, label, description, count, icon: Icon }) => (
          <Link
            key={href}
            to={href}
            className="group rounded-2xl border-2 border-border bg-card p-5 transition-colors hover:border-primary"
          >
            <div className="flex items-start justify-between">
              <Icon className="h-5 w-5 text-primary" />
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <p className="mt-6 text-lg font-black">{label}</p>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            <p className="mt-5 text-xs font-black uppercase tracking-widest text-muted-foreground">
              {count} visible
            </p>
          </Link>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-black uppercase tracking-widest">Your access</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Staff approval is handled by Opus Form. Job access appears automatically when your
          approved staff are assigned.
        </p>
      </div>
    </div>
  );
};
