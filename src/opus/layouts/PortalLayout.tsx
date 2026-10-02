import React, { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  HardHat,
  Calendar,
  CalendarDays,
  Users,
  FileText,
  History,
  LogOut,
  Menu,
  Moon,
  Sun,
  X,
  User as UserIcon,
  Shield,
  Truck,
  ClipboardList,
  Building2,
  UserCog,
  BadgeCheck,
  HelpCircle,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  usePortal,
  ASSIGNED_SHIFT_ROLES,
  MANAGEMENT_ROLES,
  MANAGEMENT_WRITE_ROLES,
  SCHEDULE_ROLES,
  formatAppRoleLabel,
} from "../context/PortalContext";
import { getAvatarPresetClass } from "../utils/avatar";
import { getAvatarInitials } from "../utils/workerValidation";
import { NavList } from "@/components/application/app-navigation/base-components/nav-list";
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";

type MobileNavRole = "management" | "site_foreman" | "third_party";
type MobileNavItem = { label: string; path: string; icon: LucideIcon };

const MOBILE_NAV_CONFIG: Record<MobileNavRole, { label: string; primary: MobileNavItem[] }> = {
  management: {
    label: "Management portal navigation",
    primary: [
      { label: "Overview", path: "/portal/dashboard", icon: LayoutDashboard },
      { label: "Jobs", path: "/portal/ledger", icon: ClipboardList },
      { label: "Schedule", path: "/portal/roster?view=calendar", icon: Calendar },
      { label: "Staff", path: "/portal/roster?view=staff", icon: Users },
    ],
  },
  site_foreman: {
    label: "Foreman portal navigation",
    primary: [
      { label: "Today", path: "/portal/foreman", icon: LayoutDashboard },
      { label: "Sites", path: "/portal/foreman/sites", icon: Building2 },
      { label: "Shifts", path: "/portal/my-shifts", icon: Calendar },
    ],
  },
  third_party: {
    label: "Third-party portal navigation",
    primary: [
      { label: "Home", path: "/portal/third-party", icon: LayoutDashboard },
      { label: "Staff", path: "/portal/third-party/staff", icon: Users },
      { label: "Sites", path: "/portal/third-party/sites", icon: Building2 },
      { label: "Help", path: "/portal/help", icon: HelpCircle },
    ],
  },
};

export const PortalLayout: React.FC = () => {
  const { signOut, role, user, profile, theme, setTheme } = usePortal();
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const logoSrc =
    theme === "light" ? "/opus-form-primary-light.svg" : "/opus-form-primary-dark.svg";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuReturnRef = useRef<HTMLElement | null>(null);
  const mobileMenuCloseRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const wasMobileMenuOpenRef = useRef(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem("portal-sidebar-collapsed") === "true",
  );

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      localStorage.setItem("portal-sidebar-collapsed", String(!prev));
      return !prev;
    });
  };
  const navigate = useNavigate();
  const location = useLocation();
  const homePath =
    role === "third_party"
      ? "/portal/third-party"
      : role === "site_foreman"
        ? "/portal/foreman"
        : "/portal/dashboard";
  const isNoAccessRole = role === "labourer";
  const showThirdPartyBottomNav = role === "third_party";
  const showForemanBottomNav = role === "site_foreman";
  const showManagementBottomNav = role ? MANAGEMENT_ROLES.includes(role) : false;
  const showMobileBottomNav =
    showThirdPartyBottomNav || showForemanBottomNav || showManagementBottomNav;

  useEffect(() => {
    if (isMobileMenuOpen) {
      mobileMenuCloseRef.current?.focus();
    } else if (wasMobileMenuOpenRef.current) {
      mobileMenuReturnRef.current?.focus();
    }
    wasMobileMenuOpenRef.current = isMobileMenuOpen;
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsMobileMenuOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = mobileMenuRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isMobileMenuOpen]);

  const routeAnnouncement = location.pathname.includes("/staff/new")
    ? "Add staff member"
    : location.pathname.includes("/staff/")
      ? "Staff profile"
      : location.pathname.endsWith("/staff")
        ? "Staff"
        : location.pathname.includes("/sites/") || location.pathname.includes("/jobs/")
          ? "Assigned site"
          : location.pathname.endsWith("/sites") || location.pathname.endsWith("/jobs")
            ? "Assigned sites"
            : role === "third_party"
              ? "Portal home"
              : "Portal page";

  useEffect(() => {
    mainContentRef.current?.focus();
  }, [location.pathname]);

  const handleLogoutClick = async () => {
    await signOut();
    navigate("/portal");
  };

  const allNav = [
    { section: "OPERATIONS" },
    {
      name: "DASHBOARD",
      path: "/portal/dashboard",
      icon: LayoutDashboard,
      roles: MANAGEMENT_ROLES,
    },
    { name: "JOB LEDGER", path: "/portal/ledger", icon: ClipboardList, roles: MANAGEMENT_ROLES },
    {
      name: "SITE SCHEDULE",
      path: "/portal/roster?view=calendar",
      icon: Calendar,
      roles: SCHEDULE_ROLES,
    },
    {
      name: "CALENDAR",
      path: "/portal/calendar",
      icon: CalendarDays,
      roles: SCHEDULE_ROLES,
    },
    {
      name: "TODAY",
      path: "/portal/foreman",
      icon: HardHat,
      roles: ["site_foreman"],
    },
    {
      name: "SITES",
      path: "/portal/foreman/sites",
      icon: Building2,
      roles: ["site_foreman"],
    },
    {
      name: "SHIFTS",
      path: "/portal/my-shifts",
      icon: Calendar,
      roles: ASSIGNED_SHIFT_ROLES,
    },
    { section: "STAFF & QUOTES" },
    {
      name: "STAFF",
      path: "/portal/roster?view=staff",
      icon: Users,
      roles: MANAGEMENT_ROLES,
    },
    {
      name: "STAFF APPROVALS",
      path: "/portal/third-party-approvals",
      icon: UserCog,
      roles: MANAGEMENT_WRITE_ROLES,
    },
    {
      name: "CERTIFICATE CHECKER",
      path: "/portal/certificate-checker",
      icon: BadgeCheck,
      roles: MANAGEMENT_ROLES,
    },
    {
      name: "QUOTES",
      path: "/portal/pipeline?view=pipeline-registry",
      icon: Truck,
      roles: MANAGEMENT_ROLES,
    },
    { section: "ADMIN" },
    { name: "AUDIT LOG", path: "/portal/audit", icon: History, roles: ["admin", "director"] },
    { name: "USERS", path: "/portal/users", icon: UserCog, roles: ["admin", "director"] },
    {
      name: "PORTAL HOME",
      path: "/portal/third-party",
      icon: LayoutDashboard,
      roles: ["third_party"],
    },
    {
      name: "STAFF",
      path: "/portal/third-party/staff",
      icon: Users,
      roles: ["third_party"],
    },
    {
      name: "ASSIGNED SITES",
      path: "/portal/third-party/sites",
      icon: Building2,
      roles: ["third_party"],
    },
  ];

  // Job-level history remains available through the job's own History tab for
  // the appropriate ops roles. Company policies live under Legal & Privacy.
  const visibleNav = allNav.filter((item) => {
    if ("section" in item) return true;
    if (!role || !item.roles.includes(role)) return false;
    return true;
  });
  // Drop a section header if every item under it got filtered out (e.g. ADMIN for non-admins).
  const navItems =
    role === "third_party"
      ? visibleNav.filter((item) => !("section" in item))
      : visibleNav.filter((item, i) => {
          if (!("section" in item)) return true;
          const next = visibleNav[i + 1];
          return !!next && !("section" in next);
        });

  const checkIsActive = (path: string) => {
    const [itemPath, itemQuery] = path.split("?");
    const supportsNestedPath = [
      "/portal/foreman/sites",
      "/portal/third-party/staff",
      "/portal/third-party/sites",
    ].includes(itemPath);
    const pathMatches =
      location.pathname === itemPath ||
      (supportsNestedPath && location.pathname.startsWith(`${itemPath}/`));
    if (!pathMatches) return false;

    const params = new URLSearchParams(location.search);
    const itemParams = new URLSearchParams(itemQuery || "");

    if (itemPath === "/portal/roster") {
      const currentView = params.get("view") || "calendar";
      const itemView = itemParams.get("view") || "calendar";
      return currentView === itemView;
    }

    if (itemPath === "/portal/pipeline") {
      return true;
    }

    return true;
  };

  const toNavListItems = () =>
    navItems.map((item) =>
      "section" in item
        ? { divider: true as const, label: item.section }
        : { label: item.name, href: item.path, icon: item.icon },
    );
  const mobileNavRole: MobileNavRole =
    role === "site_foreman"
      ? "site_foreman"
      : role === "third_party"
        ? "third_party"
        : "management";
  const mobileBottomItems = MOBILE_NAV_CONFIG[mobileNavRole].primary;
  const mobilePrimaryPaths = new Set(mobileBottomItems.map((item) => item.path));
  const mobileDrawerItems = navItems.filter(
    (item) => "section" in item || !mobilePrimaryPaths.has(item.path),
  );
  const compactMobileDrawerItems = mobileDrawerItems.filter((item, index, items) => {
    if (!("section" in item)) return true;
    const next = items[index + 1];
    return !!next && !("section" in next);
  });
  const toMobileDrawerItems = () =>
    compactMobileDrawerItems.map((item) =>
      "section" in item
        ? { divider: true as const, label: item.section }
        : { label: item.name, href: item.path, icon: item.icon },
    );
  const mobileNavLabel = MOBILE_NAV_CONFIG[mobileNavRole].label;

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-background text-foreground font-sans selection:bg-primary/30 selection:text-white flex flex-col lg:flex-row">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-background focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>
      {/* Desktop Sidebar */}
      {!isNoAccessRole && (
        <SidebarNavigationSlim
          items={toNavListItems()}
          footerItems={[
            {
              label: role === "site_foreman" ? "Help" : "Help & Guidance",
              href: "/portal/help",
              icon: HelpCircle,
            },
            {
              label: "Contact IT",
              href: "/portal/contact",
              icon: Mail,
            },
            { label: "Legal & Privacy", href: "/portal/legal", icon: Shield },
          ]}
          isActive={(item) => (item.href ? checkIsActive(item.href) : false)}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          logoSrc={logoSrc}
          logoHref={homePath}
          profile={{
            name: profile?.full_name || user?.email || "User",
            role: formatAppRoleLabel(role || "labourer"),
            avatarClass: getAvatarPresetClass(profile?.avatar_url),
            href: "/portal/settings",
          }}
          onLogout={handleLogoutClick}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      {/* Mobile Sticky Header */}
      {!isNoAccessRole && (
        <>
          <header className="lg:hidden flex items-center justify-between h-16 bg-background border-b-2 border-border px-4 sticky top-0 z-40">
            <Link to={homePath} className="flex items-center">
              <img src={logoSrc} alt="Opus Form" className="h-8 w-auto" />
            </Link>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleTheme}
                className="p-2 text-muted-foreground hover:text-primary cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center group transition-colors"
                aria-label="Toggle light/dark theme"
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                {theme === "light" ? (
                  <Moon className="w-5 h-5 group-hover:-rotate-12 transition-transform" />
                ) : (
                  <Sun className="w-5 h-5 group-hover:rotate-45 transition-transform" />
                )}
              </button>
              <button
                onClick={handleLogoutClick}
                className="p-2 text-muted-foreground hover:text-destructive cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <button
                ref={mobileMenuButtonRef}
                onClick={(event) => {
                  mobileMenuReturnRef.current = event.currentTarget;
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                }}
                className={`p-2 text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[44px] items-center justify-center ${showMobileBottomNav ? "hidden" : "flex"}`}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-portal-menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </header>

          {showMobileBottomNav && (
            <nav
              aria-label={mobileNavLabel}
              className="fixed bottom-0 left-0 right-0 z-40 grid border-t-2 border-border bg-background/95 px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
              style={{
                gridTemplateColumns: `repeat(${mobileBottomItems.length + 1}, minmax(0, 1fr))`,
              }}
            >
              {mobileBottomItems.map(({ label, path, icon: Icon }) => {
                const isActive = checkIsActive(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${isActive ? "text-primary" : "text-muted-foreground"}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={(event) => {
                  mobileMenuReturnRef.current = event.currentTarget;
                  setIsMobileMenuOpen(true);
                }}
                className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-muted-foreground"
                aria-label="Open portal menu"
                aria-haspopup="dialog"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-portal-menu"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
                More
              </button>
            </nav>
          )}

          {/* Mobile Slide-out Drawer */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 lg:hidden"
                />
                <motion.div
                  ref={mobileMenuRef}
                  id="mobile-portal-menu"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="mobile-portal-menu-title"
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 220 }}
                  className="fixed top-0 left-0 bottom-0 w-4/5 max-w-xs bg-background border-r-2 border-border z-50 p-6 flex flex-col shadow-2xl lg:hidden"
                >
                  <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-border">
                    <Link
                      to={homePath}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center"
                    >
                      <img src={logoSrc} alt="Opus Form" className="h-8 w-auto" />
                    </Link>
                    <span id="mobile-portal-menu-title" className="sr-only">
                      Portal menu
                    </span>
                    <button
                      ref={mobileMenuCloseRef}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2 text-muted-foreground cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Close portal menu"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Mobile Drawer Profile (Interactive) */}
                  <Link
                    to="/portal/settings"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="mb-6 p-3 rounded-lg bg-muted border-2 border-border flex items-center space-x-3 group hover:bg-muted transition-all cursor-pointer"
                  >
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarPresetClass(profile?.avatar_url)} flex items-center justify-center border-2 border-border shrink-0`}
                    >
                      {profile?.full_name ? (
                        <span className="text-[11px] font-black tracking-wider text-white">
                          {getAvatarInitials(profile.full_name)}
                        </span>
                      ) : (
                        <UserIcon className="w-4 h-4 text-stone-400 group-hover:text-white transition-colors" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[13px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {profile?.full_name || user?.email || "User"}
                      </span>
                      <span className="text-[11px] text-status-success capitalize font-medium">
                        {formatAppRoleLabel(role || "labourer")}
                      </span>
                    </div>
                  </Link>

                  {/* Mobile Drawer Menu Links */}
                  <nav
                    aria-label="Mobile portal navigation"
                    className="space-y-1.5 flex-1 overflow-y-auto"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <NavList
                      items={toMobileDrawerItems()}
                      isActive={(item) => (item.href ? checkIsActive(item.href) : false)}
                    />
                  </nav>

                  <div className="mt-auto pt-4 border-t-2 border-border space-y-1">
                    {role !== "third_party" && (
                      <Link
                        to="/portal/help"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center space-x-3 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all cursor-pointer min-h-[44px]"
                      >
                        <HelpCircle className="w-4 h-4 shrink-0" />
                        <span>{role === "site_foreman" ? "Help" : "Help & Guidance"}</span>
                      </Link>
                    )}
                    <Link
                      to="/portal/contact"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center space-x-3 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all cursor-pointer min-h-[44px]"
                    >
                      <Mail className="w-4 h-4 shrink-0" />
                      <span>Contact IT</span>
                    </Link>
                    <Link
                      to="/portal/legal"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center space-x-3 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all cursor-pointer min-h-[44px]"
                    >
                      <Shield className="w-4 h-4 shrink-0" />
                      <span>Legal & Privacy</span>
                    </Link>
                    <div className="flex items-center justify-between rounded-lg py-2.5 px-3">
                      <div className="flex items-center space-x-3 text-muted-foreground">
                        {theme === "light" ? (
                          <Moon className="w-4 h-4 shrink-0" />
                        ) : (
                          <Sun className="w-4 h-4 shrink-0" />
                        )}
                        <span className="text-[11px] font-semibold uppercase tracking-wider">
                          Light / Dark
                        </span>
                      </div>
                      <button
                        onClick={toggleTheme}
                        role="switch"
                        aria-checked={theme === "dark"}
                        aria-label="Toggle light/dark theme"
                        className="relative w-9 h-5 shrink-0 rounded-full bg-secondary border border-border transition-colors cursor-pointer"
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-primary shadow transition-transform duration-200 ${theme === "dark" ? "translate-x-4" : ""}`}
                        />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogoutClick();
                      }}
                      className="flex items-center w-full space-x-3 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all cursor-pointer min-h-[44px]"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>Log out</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Main Content Area */}
      <main
        id="main-content"
        ref={mainContentRef}
        tabIndex={-1}
        aria-labelledby="portal-page-announcement"
        className={`flex-1 flex flex-col min-h-0 bg-background ${showMobileBottomNav ? "pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0" : ""}`}
      >
        <div id="portal-page-announcement" className="sr-only" aria-live="polite">
          {routeAnnouncement}
        </div>
        <div
          className="flex-1 w-full relative lg:min-h-0 lg:overflow-y-auto"
          style={{ scrollPaddingBottom: showMobileBottomNav ? "6.5rem" : undefined }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
};
