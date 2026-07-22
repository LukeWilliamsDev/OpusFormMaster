// @ts-nocheck
import React, { useState } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  HardHat,
  Calendar,
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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { usePortal, ALL_ROLES, MANAGEMENT_ROLES } from "../context/PortalContext";
import { getAvatarPresetClass } from "../pages/Settings";
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
    {
      name: "Dashboard",
      path: "/portal/dashboard",
      icon: LayoutDashboard,
      roles: MANAGEMENT_ROLES,
    },
    { name: "Job Ledger", path: "/portal/ledger", icon: HardHat, roles: MANAGEMENT_ROLES },
    {
      name: "Calendar",
      path: "/portal/roster?view=calendar",
      icon: Calendar,
      roles: ALL_ROLES,
    },
    {
      name: "Staff",
      path: "/portal/roster?view=staff",
      icon: Users,
      roles: MANAGEMENT_ROLES,
    },
    {
      name: "Quotes",
      path: "/portal/pipeline?view=pipeline-registry",
      icon: FileText,
      roles: MANAGEMENT_ROLES,
    },
    { name: "Audit Trail", path: "/portal/audit", icon: History, roles: ["admin"] },
    { name: "Policies", path: "/portal/policies", icon: ShieldCheck, roles: ["admin"] },
  ];

  // Filter main nav items based on user's role and email constraints
  const navItems = allNav.filter((item) => {
    if (!role) return false;
    if (!item.roles.includes(role)) return false;
    if (user?.email === "admin@opusform.co.uk") {
      return item.path === "/portal/audit" || item.path === "/portal/policies";
    }
    if (
      (item.path === "/portal/audit" || item.path === "/portal/policies") &&
      user?.email !== "admin@opusform.co.uk"
    )
      return false;
    return true;
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
      // Both quote-builder and pipeline-registry count under Quotes active state
      return true;
    }

    return true; // For simple paths like /portal/dashboard or /portal/ledger
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 selection:text-white flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <SidebarNavigationSlim
        items={navItems.map((item) => ({ label: item.name, href: item.path, icon: item.icon }))}
        footerItems={[{ label: "Legal & Privacy", href: "/portal/legal", icon: Shield }]}
        isActive={(item) => checkIsActive(item.href!)}
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
      <header className="lg:hidden flex items-center justify-between h-16 bg-background border-b border-border px-4 sticky top-0 z-40">
        <Link to="/portal/dashboard" className="flex items-center">
          <img src={logoSrc} alt="Opus Form" className="h-8 w-auto" />
        </Link>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-muted-foreground hover:text-foreground cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle light/dark theme"
          >
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          {/* Audit Admin Logout for mobile */}
          {user?.email === "admin@opusform.co.uk" && (
            <button
              onClick={handleLogoutClick}
              className="p-2 text-muted-foreground hover:text-foreground cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
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
              className="fixed top-0 left-0 bottom-0 w-4/5 max-w-xs bg-card border-r border-border z-50 p-6 flex flex-col shadow-2xl lg:hidden"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
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
                className="mb-6 p-3 rounded-lg bg-muted/60 border border-border flex items-center space-x-3 group hover:bg-muted transition-all cursor-pointer"
              >
                <div
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarPresetClass(profile?.avatar_url)} flex items-center justify-center border border-border shrink-0`}
                >
                  {profile?.full_name ? (
                    <span className="text-[11px] font-black tracking-wider text-white">
                      {profile.full_name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </span>
                  ) : (
                    <UserIcon className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[13px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {profile?.full_name || user?.email || "User"}
                  </span>
                  <span className="text-[11px] text-success capitalize font-medium">
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
                  items={navItems.map((item) => ({
                    label: item.name,
                    href: item.path,
                    icon: item.icon,
                  }))}
                  isActive={(item) => checkIsActive(item.href!)}
                />
              </nav>

              <div className="mt-auto pt-4 border-t border-border space-y-2">
                <div className="flex items-center justify-between px-1 py-1.5">
                  <span className="text-[13px] font-semibold text-muted-foreground">
                    Light / Dark
                  </span>
                  <button
                    onClick={toggleTheme}
                    role="switch"
                    aria-checked={theme === "light"}
                    aria-label="Toggle light/dark theme"
                    className="relative w-11 h-6 shrink-0 rounded-full bg-secondary border border-border transition-colors cursor-pointer"
                  >
                    <Sun className="absolute left-1 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <Moon className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-primary shadow transition-transform duration-200 ${
                        theme === "light" ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </div>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogoutClick();
                  }}
                  className="flex items-center justify-center space-x-3 w-full py-3 bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 rounded-lg text-[13px] font-semibold text-foreground hover:text-white transition-all cursor-pointer min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
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
