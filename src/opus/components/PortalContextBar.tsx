import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  findActivePortalNavigation,
  isPortalNavItemActive,
  type PortalNavigationItem,
} from "../utils/portalNavigation";
import { usePortal } from "../context/PortalContext";
import { PortalViewSwitcher } from "./PortalNavigationPrimitives";

const getContextLabel = (
  pathname: string,
  search: string,
  item: PortalNavigationItem | undefined,
  jobs: { id: string; siteName: string }[],
  workers: { id: string; name: string }[],
) => {
  if (pathname === "/portal/roster") {
    return new URLSearchParams(search).get("view") === "staff" ? "Staff" : "Schedule";
  }
  if (pathname === "/portal/pipeline") {
    return new URLSearchParams(search).get("view") === "quote-builder" ? "Quote builder" : "Quotes";
  }
  if (pathname.includes("/staff/") || pathname.endsWith("/staff/new")) {
    const staffId = pathname.split("/").pop();
    return workers.find((worker) => worker.id === staffId)?.name ?? "Staff record";
  }
  if (pathname.includes("/sites/") || pathname.includes("/jobs/")) {
    const jobId = pathname.split("/").pop();
    return jobs.find((job) => job.id === jobId)?.siteName ?? "Site record";
  }
  if (pathname === "/portal/ledger" && new URLSearchParams(search).has("jobId")) {
    const jobId = new URLSearchParams(search).get("jobId");
    return jobs.find((job) => job.id === jobId)?.siteName ?? "Job record";
  }
  return item?.label;
};

const getTabs = (pathname: string) => {
  if (pathname === "/portal/roster") {
    return [
      { label: "Schedule", path: "/portal/roster?view=calendar" },
      { label: "Staff", path: "/portal/roster?view=staff" },
      { label: "Calendar", path: "/portal/calendar" },
    ];
  }
  if (pathname === "/portal/pipeline") {
    return [
      { label: "Quotes", path: "/portal/pipeline?view=pipeline-registry" },
      { label: "Quote builder", path: "/portal/pipeline?view=quote-builder" },
    ];
  }
  return [];
};

const getBackLink = (pathname: string, search: string) => {
  if (pathname === "/portal/ledger" && new URLSearchParams(search).has("jobId")) {
    return { label: "Back to jobs", path: "/portal/ledger" };
  }
  if (pathname === "/portal/roster" && new URLSearchParams(search).has("workerId")) {
    return { label: "Back to Staff", path: "/portal/roster?view=staff" };
  }
  if (pathname.includes("/foreman/sites/")) {
    return { label: "Back to sites", path: `/portal/foreman/sites${search}` };
  }
  if (pathname.includes("/third-party/staff/")) {
    return { label: "Back to staff", path: `/portal/third-party/staff${search}` };
  }
  if (pathname.includes("/third-party/sites/") || pathname.includes("/third-party/jobs/")) {
    return { label: "Back to sites", path: `/portal/third-party/sites${search}` };
  }
  return null;
};

export const PortalContextBar: React.FC<{ role: string | null }> = ({ role }) => {
  const location = useLocation();
  const { jobs, workers } = usePortal();
  const { workspace, item } = findActivePortalNavigation(role, location.pathname, location.search);
  const contextLabel = getContextLabel(location.pathname, location.search, item, jobs, workers);
  const tabs = getTabs(location.pathname);
  const backLink = getBackLink(location.pathname, location.search);

  const isTopLevel =
    location.pathname === "/portal/dashboard" ||
    (location.pathname === "/portal/ledger" &&
      !new URLSearchParams(location.search).has("jobId")) ||
    location.pathname === "/portal/foreman" ||
    location.pathname === "/portal/foreman/sites" ||
    location.pathname === "/portal/third-party" ||
    location.pathname === "/portal/third-party/staff" ||
    location.pathname === "/portal/third-party/sites";

  if (!workspace || !contextLabel || isTopLevel) return null;

  const viewSwitcherItems = tabs.map((tab) => ({
    label: tab.label,
    to: tab.path,
    active: isPortalNavItemActive(location.pathname, location.search, {
      id: tab.label,
      label: tab.label,
      path: tab.path,
      icon: workspace.items[0].icon,
      workspace: workspace.id,
      roles: [],
    }),
  }));

  if (location.pathname === "/portal/pipeline") {
    const isBuilder = new URLSearchParams(location.search).get("view") === "quote-builder";
    return (
      <div className="border-b border-border bg-background/95 py-4 backdrop-blur">
        <div className="portal-shell-container flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">Commercial</p>
            <h1 className="truncate text-xl font-semibold text-foreground sm:text-2xl">
              {isBuilder ? "Quote builder" : "Quotes & invoices"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isBuilder
                ? "Create or update a quote for a client."
                : "Review quotes, invoices, and saved estimates."}
            </p>
          </div>
          <PortalViewSwitcher
            items={viewSwitcherItems}
            ariaLabel="Quotes views"
            className="w-full sm:w-auto sm:min-w-[18rem]"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border bg-background/95 py-3 backdrop-blur">
      <div className="portal-shell-container flex min-w-0 flex-col gap-3">
        {backLink && (
          <Link
            to={backLink.path}
            className="w-fit rounded-sm text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            ← {backLink.label}
          </Link>
        )}
        <Breadcrumb className="min-w-0 overflow-hidden">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                asChild
                className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Link to={workspace.items[0]?.path ?? "/portal/dashboard"}>{workspace.label}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="min-w-0 max-w-[min(70vw,32rem)] truncate">
                {contextLabel}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {tabs.length > 0 && (
          <PortalViewSwitcher items={viewSwitcherItems} ariaLabel={`${contextLabel} views`} />
        )}
      </div>
    </div>
  );
};
