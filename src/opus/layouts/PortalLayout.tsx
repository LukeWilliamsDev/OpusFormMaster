import React, { useState, useEffect } from "react";
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
  ShieldCheck,
  Truck,
  ClipboardList,
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { usePortal, ALL_ROLES, MANAGEMENT_ROLES } from "../context/PortalContext";
import { getAvatarPresetClass } from "../pages/Settings";
import { getAvatarInitials } from "../utils/workerValidation";
import { NavList } from "@/components/application/app-navigation/base-components/nav-list";
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";

export const PortalLayout: React.FC = () => {
  const { signOut, role, user, profile, theme, setTheme } = usePortal();
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const logoSrc =
    theme === "light" ? "/opus-form-primary-light.svg" : "/opus-form-primary-dark.svg";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
      roles: ALL_ROLES,
    },
    {
      name: "CALENDAR",
      path: "/portal/calendar",
      icon: CalendarDays,
      roles: ALL_ROLES,
    },
    { section: "STAFF & QUOTES" },
    {
      name: "STAFF",
      path: "/portal/roster?view=staff",
      icon: Users,
      roles: MANAGEMENT_ROLES,
    },
    {
      name: "QUOTES",
      path: "/portal/pipeline?view=pipeline-registry",
      icon: Truck,
      roles: MANAGEMENT_ROLES,
    },
    { section: "ADMIN" },
    { name: "SITE RECORDS", path: "/portal/audit", icon: History, roles: ["admin"] },
    { name: "POLICIES", path: "/portal/policies", icon: ShieldCheck, roles: ["admin"] },
    { name: "USERS", path: "/portal/users", icon: Users, roles: ["admin"] },
  ];

  // SITE RECORDS/POLICIES (full audit trail) are restricted to the one
  // designated compliance account, not every admin — job-level history is
  // reached via the job's own History tab instead.
  const isAuditAdmin = user?.email === "admin@opusform.co.uk";
  const visibleNav = allNav.filter((item) => {
    if ("section" in item) return true;
    if (!role || !item.roles.includes(role)) return false;
    if (
      item.path === "/portal/audit" ||
      item.path === "/portal/policies" ||
      item.path === "/portal/users"
    )
      return isAuditAdmin;
    return true;
  });
  // Drop a section header if every item under it got filtered out (e.g. ADMIN for non-admins).
  const navItems = visibleNav.filter((item, i) => {
    if (!("section" in item)) return true;
    const next = visibleNav[i + 1];
    return !!next && !("section" in next);
  });

  const checkIsActive = (path: string) => {
    const [itemPath, itemQuery] = path.split("?");
    if (location.pathname !== itemPath) return false;

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

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 selection:text-white flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <SidebarNavigationSlim
        items={toNavListItems()}
        footerItems={[{ label: "Legal & Privacy", href: "/portal/legal", icon: Shield }]}
        isActive={(item) => (item.href ? checkIsActive(item.href) : false)}
        collapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        logoSrc={logoSrc}
        logoHref="/portal/dashboard"
        profile={{
          name: profile?.full_name || user?.email || "User",
          role: role || "labourer",
          avatarClass: getAvatarPresetClass(profile?.avatar_url),
          href: "/portal/settings",
        }}
        onLogout={handleLogoutClick}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Mobile Sticky Header */}
      <header className="lg:hidden flex items-center justify-between h-16 bg-background border-b-2 border-border px-4 sticky top-0 z-40">
        <Link to="/portal/dashboard" className="flex items-center">
          <img src={logoSrc} alt="Opus Form" className="h-8 w-auto" />
        </Link>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center group transition-colors"
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
            className="p-2 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

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
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed top-0 left-0 bottom-0 w-4/5 max-w-xs bg-background border-r-2 border-border z-50 p-6 flex flex-col shadow-2xl lg:hidden"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-border">
                <Link
                  to="/portal/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center"
                >
                  <img src={logoSrc} alt="Opus Form" className="h-8 w-auto" />
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-muted-foreground cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
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
                  <span className="text-[13px] font-semibold text-foreground truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {profile?.full_name || user?.email || "User"}
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 capitalize font-medium">
                    {(role || "labourer").replace(/_/g, " ")}
                  </span>
                </div>
              </Link>

              {/* Mobile Drawer Menu Links */}
              <nav
                className="space-y-1.5 flex-1 overflow-y-auto"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <NavList
                  items={toNavListItems()}
                  isActive={(item) => (item.href ? checkIsActive(item.href) : false)}
                />
              </nav>

              <div className="mt-auto pt-4 border-t-2 border-border space-y-1">
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
                      <Sun className="w-4 h-4 shrink-0" />
                    ) : (
                      <Moon className="w-4 h-4 shrink-0" />
                    )}
                    <span className="text-[11px] font-semibold uppercase tracking-wider">
                      Light / Dark
                    </span>
                  </div>
                  <button
                    onClick={toggleTheme}
                    role="switch"
                    aria-checked={theme === "light"}
                    aria-label="Toggle light/dark theme"
                    className="relative w-9 h-5 shrink-0 rounded-full bg-secondary border border-border transition-colors cursor-pointer"
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-primary shadow transition-transform duration-200 ${theme === "light" ? "translate-x-4" : ""}`}
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
                  <span>Log Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 bg-background">
        <div className="flex-1 w-full relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
