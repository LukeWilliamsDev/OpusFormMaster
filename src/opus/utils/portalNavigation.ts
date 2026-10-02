export type MobileNavIcon =
  "dashboard" | "ledger" | "schedule" | "staff" | "home" | "sites" | "help" | "more";

export type MobilePortalNavItem =
  | {
      label: string;
      path: string;
      icon: Exclude<MobileNavIcon, "more">;
      kind: "link";
    }
  | {
      label: string;
      icon: "more";
      kind: "more";
    };

export const INTERNAL_MOBILE_NAV_ITEMS: readonly MobilePortalNavItem[] = [
  { label: "Dashboard", path: "/portal/dashboard", icon: "dashboard", kind: "link" },
  { label: "Ledger", path: "/portal/ledger", icon: "ledger", kind: "link" },
  { label: "Schedule", path: "/portal/roster?view=calendar", icon: "schedule", kind: "link" },
  { label: "Staff", path: "/portal/roster?view=staff", icon: "staff", kind: "link" },
  { label: "More", icon: "more", kind: "more" },
];

export const THIRD_PARTY_MOBILE_NAV_ITEMS: readonly MobilePortalNavItem[] = [
  { label: "Home", path: "/portal/third-party", icon: "home", kind: "link" },
  { label: "Staff", path: "/portal/third-party/staff", icon: "staff", kind: "link" },
  { label: "Sites", path: "/portal/third-party/sites", icon: "sites", kind: "link" },
  { label: "Help", path: "/portal/help", icon: "help", kind: "link" },
  { label: "More", icon: "more", kind: "more" },
];

const THIRD_PARTY_SITE_PATHS = ["/portal/third-party/sites", "/portal/third-party/jobs"] as const;

const matchesPathOrChild = (pathname: string, basePath: string) =>
  pathname === basePath || pathname.startsWith(`${basePath}/`);

const matchesThirdPartySitePath = (pathname: string) =>
  THIRD_PARTY_SITE_PATHS.some((basePath) => matchesPathOrChild(pathname, basePath));

const matchesRoute = (pathname: string, itemPathname: string) => {
  if (itemPathname === "/portal/third-party/staff") {
    return matchesPathOrChild(pathname, itemPathname);
  }

  if (itemPathname === "/portal/third-party/sites") {
    return matchesThirdPartySitePath(pathname);
  }

  return pathname === itemPathname;
};

export const getMobilePortalNavItems = (
  role: string | null,
  managementRoles: readonly string[],
): readonly MobilePortalNavItem[] => {
  if (role === "third_party") return THIRD_PARTY_MOBILE_NAV_ITEMS;
  if (role && managementRoles.includes(role)) return INTERNAL_MOBILE_NAV_ITEMS;
  return [];
};

export const isPortalNavItemActive = (
  pathname: string,
  search: string,
  itemPath: string,
): boolean => {
  const [itemPathname, itemQuery] = itemPath.split("?");
  if (!itemPathname || !matchesRoute(pathname, itemPathname)) return false;

  if (itemPathname === "/portal/roster") {
    const currentView = new URLSearchParams(search).get("view") || "calendar";
    const itemView = new URLSearchParams(itemQuery || "").get("view") || "calendar";
    return currentView === itemView;
  }

  return true;
};
