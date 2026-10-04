import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  CalendarRange,
  CircleHelp,
  ClipboardCheck,
  FileClock,
  LayoutDashboard,
  Mail,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

export type PortalWorkspaceId = "operations" | "field" | "partners" | "administration";

export type PortalNavigationItem = {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  workspace: PortalWorkspaceId;
  roles: readonly string[];
  aliases?: readonly string[];
  description?: string;
};

export type PortalWorkspace = {
  id: PortalWorkspaceId;
  label: string;
  description: string;
  items: readonly PortalNavigationItem[];
};

export type PortalNavigationGroup = {
  id: string;
  label: string;
  items: readonly PortalNavigationItem[];
};

const MANAGEMENT_ROLES = [
  "admin",
  "director",
  "logistics_coordinator",
  "logistics_assistant",
] as const;
const MANAGEMENT_WRITE_ROLES = ["admin", "director", "logistics_coordinator"] as const;
const GOVERNANCE_ROLES = ["admin", "director"] as const;
const FOREMAN_ROLE = ["site_foreman"] as const;
const THIRD_PARTY_ROLE = ["third_party"] as const;
const SEARCH_ACCESS_ROLES = [...MANAGEMENT_ROLES, "site_foreman", "third_party"] as const;

const operationsItems: readonly PortalNavigationItem[] = [
  {
    id: "overview",
    label: "Overview",
    path: "/portal/dashboard",
    icon: LayoutDashboard,
    workspace: "operations",
    roles: MANAGEMENT_ROLES,
    aliases: ["dashboard", "today", "attention"],
  },
  {
    id: "work",
    label: "Jobs",
    path: "/portal/ledger",
    icon: BriefcaseBusiness,
    workspace: "operations",
    roles: MANAGEMENT_ROLES,
    aliases: ["work", "job ledger", "sites"],
  },
  {
    id: "planning",
    label: "Schedule",
    path: "/portal/roster?view=calendar",
    icon: CalendarRange,
    workspace: "operations",
    roles: MANAGEMENT_ROLES,
    aliases: ["planning", "calendar", "shifts", "roster"],
    description: "Plan shifts and assignments",
  },
  {
    id: "people",
    label: "Staff",
    path: "/portal/roster?view=staff",
    icon: Users,
    workspace: "operations",
    roles: MANAGEMENT_ROLES,
    aliases: ["people", "certificates", "assignments", "workers"],
    description: "Manage staff and credentials",
  },
  {
    id: "commercial",
    label: "Quotes & invoices",
    path: "/portal/pipeline?view=pipeline-registry",
    icon: BarChart3,
    workspace: "operations",
    roles: MANAGEMENT_ROLES,
    aliases: ["commercial", "pipeline", "invoices"],
    description: "Review estimates and billing",
  },
  {
    id: "certificate-checker",
    label: "Certificate checker",
    path: "/portal/certificate-checker",
    icon: BadgeCheck,
    workspace: "operations",
    roles: MANAGEMENT_ROLES,
    aliases: ["certificates", "compliance", "CSCS", "tickets"],
    description: "Review staff credentials",
  },
];

const fieldItems: readonly PortalNavigationItem[] = [
  {
    id: "today",
    label: "Today",
    path: "/portal/foreman",
    icon: LayoutDashboard,
    workspace: "field",
    roles: FOREMAN_ROLE,
    aliases: ["home", "updates", "blockers"],
  },
  {
    id: "field-sites",
    label: "Sites",
    path: "/portal/foreman/sites",
    icon: BriefcaseBusiness,
    workspace: "field",
    roles: FOREMAN_ROLE,
    aliases: ["jobs", "assigned sites"],
  },
  {
    id: "my-shifts",
    label: "My shifts",
    path: "/portal/my-shifts",
    icon: CalendarRange,
    workspace: "field",
    roles: FOREMAN_ROLE,
    aliases: ["schedule", "assignments"],
    description: "See your upcoming shifts",
  },
];

const partnerInternalItems: readonly PortalNavigationItem[] = [
  {
    id: "partner-submissions",
    label: "Partner approvals",
    path: "/portal/third-party-approvals",
    icon: ClipboardCheck,
    workspace: "partners",
    roles: MANAGEMENT_WRITE_ROLES,
    aliases: ["submissions", "pending staff", "third party"],
    description: "Review submitted staff",
  },
];

const partnerExternalItems: readonly PortalNavigationItem[] = [
  {
    id: "partner-home",
    label: "Overview",
    path: "/portal/third-party",
    icon: LayoutDashboard,
    workspace: "partners",
    roles: THIRD_PARTY_ROLE,
    aliases: ["overview", "attention"],
  },
  {
    id: "partner-staff",
    label: "Staff",
    path: "/portal/third-party/staff",
    icon: Users,
    workspace: "partners",
    roles: THIRD_PARTY_ROLE,
    aliases: ["people", "certificates", "submissions"],
    description: "Manage your people",
  },
  {
    id: "partner-sites",
    label: "Sites",
    path: "/portal/third-party/sites",
    icon: BriefcaseBusiness,
    workspace: "partners",
    roles: THIRD_PARTY_ROLE,
    aliases: ["jobs", "assigned sites", "updates"],
    description: "Open assigned site records",
  },
];

const administrationItems: readonly PortalNavigationItem[] = [
  {
    id: "users",
    label: "Users",
    path: "/portal/users",
    icon: Users,
    workspace: "administration",
    roles: GOVERNANCE_ROLES,
    aliases: ["accounts", "access", "roles"],
    description: "Manage portal access",
  },
  {
    id: "audit",
    label: "Audit log",
    path: "/portal/audit",
    icon: FileClock,
    workspace: "administration",
    roles: GOVERNANCE_ROLES,
    aliases: ["history", "activity", "changes"],
    description: "Review recorded changes",
  },
  {
    id: "policies",
    label: "Policies & legal",
    path: "/portal/legal",
    icon: ShieldCheck,
    workspace: "administration",
    roles: GOVERNANCE_ROLES,
    aliases: ["policies", "privacy", "terms"],
    description: "Read company policies",
  },
];

const accountSearchItems: readonly PortalNavigationItem[] = [
  {
    id: "settings",
    label: "Settings",
    path: "/portal/settings",
    icon: Settings,
    workspace: "administration",
    roles: SEARCH_ACCESS_ROLES,
    aliases: ["account", "profile", "preferences"],
    description: "Manage your account preferences",
  },
  {
    id: "help",
    label: "Help",
    path: "/portal/help",
    icon: CircleHelp,
    workspace: "administration",
    roles: SEARCH_ACCESS_ROLES,
    aliases: ["support", "guidance"],
    description: "Get help using Opus Form",
  },
  {
    id: "contact",
    label: "Contact",
    path: "/portal/contact",
    icon: Mail,
    workspace: "administration",
    roles: SEARCH_ACCESS_ROLES,
    aliases: ["support", "message"],
    description: "Contact the Opus Form team",
  },
  {
    id: "policies",
    label: "Policies & legal",
    path: "/portal/legal",
    icon: ShieldCheck,
    workspace: "administration",
    roles: SEARCH_ACCESS_ROLES,
    aliases: ["legal", "policies", "privacy"],
    description: "Read company policies",
  },
  {
    id: "terms",
    label: "Terms",
    path: "/portal/terms",
    icon: ShieldCheck,
    workspace: "administration",
    roles: SEARCH_ACCESS_ROLES,
    aliases: ["legal", "terms and conditions"],
  },
  {
    id: "privacy",
    label: "Privacy policy",
    path: "/portal/privacy",
    icon: ShieldCheck,
    workspace: "administration",
    roles: SEARCH_ACCESS_ROLES,
    aliases: ["legal", "privacy"],
  },
  {
    id: "acceptable-use",
    label: "Acceptable use",
    path: "/portal/acceptable-use",
    icon: ShieldCheck,
    workspace: "administration",
    roles: SEARCH_ACCESS_ROLES,
    aliases: ["legal", "acceptable use"],
  },
  {
    id: "cookies",
    label: "Cookie policy",
    path: "/portal/cookies",
    icon: ShieldCheck,
    workspace: "administration",
    roles: SEARCH_ACCESS_ROLES,
    aliases: ["legal", "cookies"],
  },
  {
    id: "modern-slavery",
    label: "Modern slavery statement",
    path: "/portal/modern-slavery",
    icon: ShieldCheck,
    workspace: "administration",
    roles: SEARCH_ACCESS_ROLES,
    aliases: ["legal", "modern slavery"],
  },
  {
    id: "right-to-work",
    label: "Right to work",
    path: "/portal/right-to-work",
    icon: ShieldCheck,
    workspace: "administration",
    roles: SEARCH_ACCESS_ROLES,
    aliases: ["legal", "right to work"],
  },
];

export const getPortalWorkspaces = (role: string | null): readonly PortalWorkspace[] => {
  if (role === "third_party") {
    return [
      {
        id: "partners",
        label: "Partners",
        description: "Your people and assigned sites",
        items: partnerExternalItems,
      },
    ];
  }

  if (role === "site_foreman") {
    return [
      {
        id: "field",
        label: "Field",
        description: "Today, sites, and shifts",
        items: fieldItems,
      },
    ];
  }

  if (role && MANAGEMENT_ROLES.includes(role as (typeof MANAGEMENT_ROLES)[number])) {
    const workspaces: PortalWorkspace[] = [
      {
        id: "operations",
        label: "Operations",
        description: "Work, planning, people, and commercial",
        items: operationsItems,
      },
      {
        id: "partners",
        label: "Partners",
        description: "Submissions and approvals",
        items: partnerInternalItems.filter((item) => item.roles.includes(role)),
      },
    ];
    if (workspaces[1].items.length === 0) workspaces.splice(1, 1);
    if (GOVERNANCE_ROLES.includes(role as (typeof GOVERNANCE_ROLES)[number])) {
      workspaces.push({
        id: "administration",
        label: "Administration",
        description: "Users, audit, and policies",
        items: administrationItems.filter((item) => item.roles.includes(role)),
      });
    }
    return workspaces;
  }

  return [];
};

export const getPortalNavigationGroups = (role: string | null): readonly PortalNavigationGroup[] =>
  getPortalWorkspaces(role).map((workspace) => ({
    id: workspace.id,
    label: workspace.label,
    items: workspace.items,
  }));

/** @deprecated Use getPortalNavigationGroups; normal destinations are not overflow-only. */
export const getPortalSecondaryNavigation = (role: string | null) =>
  getPortalNavigationGroups(role);

const matchesPath = (pathname: string, basePath: string) =>
  pathname === basePath || pathname.startsWith(`${basePath}/`);

export const isPortalNavItemActive = (
  pathname: string,
  search: string,
  item: PortalNavigationItem,
): boolean => {
  const [itemPath, itemQuery] = item.path.split("?");
  if (!itemPath) return false;

  if (item.id === "planning" && pathname === "/portal/calendar") return true;

  if (
    item.id === "policies" &&
    (pathname === "/portal/legal" ||
      pathname.startsWith("/portal/policies/") ||
      [
        "/portal/terms",
        "/portal/acceptable-use",
        "/portal/privacy",
        "/portal/cookies",
        "/portal/modern-slavery",
        "/portal/right-to-work",
      ].includes(pathname))
  ) {
    return true;
  }

  const nested = [
    "/portal/ledger",
    "/portal/foreman/sites",
    "/portal/third-party/staff",
    "/portal/third-party/sites",
  ].includes(itemPath);
  const legacyPartnerSite =
    itemPath === "/portal/third-party/sites" && pathname.startsWith("/portal/third-party/jobs/");
  if (!(
    pathname === itemPath ||
    (nested && matchesPath(pathname, itemPath)) ||
    legacyPartnerSite
  )) {
    return false;
  }

  if (itemPath === "/portal/roster") {
    const currentView = new URLSearchParams(search).get("view") || "calendar";
    const itemView = new URLSearchParams(itemQuery || "").get("view") || "calendar";
    return currentView === itemView;
  }

  if (itemPath === "/portal/pipeline") {
    const currentView = new URLSearchParams(search).get("view") || "pipeline-registry";
    const itemView = new URLSearchParams(itemQuery || "").get("view") || "pipeline-registry";
    if (item.id === "commercial" && currentView === "quote-builder") return true;
    return currentView === itemView;
  }

  return true;
};

export const findActivePortalNavigation = (
  role: string | null,
  pathname: string,
  search: string,
) => {
  for (const workspace of getPortalWorkspaces(role)) {
    const item = workspace.items.find((candidate) =>
      isPortalNavItemActive(pathname, search, candidate),
    );
    if (item) return { workspace, item };
  }
  return { workspace: undefined, item: undefined };
};

export const getPortalSearchItems = (role: string | null) => [
  ...getPortalWorkspaces(role).flatMap((workspace) =>
    workspace.items.map((item) => ({ ...item, workspaceLabel: workspace.label })),
  ),
  ...(role && SEARCH_ACCESS_ROLES.includes(role as (typeof SEARCH_ACCESS_ROLES)[number])
    ? accountSearchItems
        .filter(
          (item) =>
            !getPortalWorkspaces(role).some((workspace) =>
              workspace.items.some((candidate) => candidate.id === item.id),
            ),
        )
        .map((item) => ({ ...item, workspaceLabel: "Account & legal" }))
    : []),
];
