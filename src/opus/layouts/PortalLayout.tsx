import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  CircleHelp,
  Mail,
  MoreHorizontal,
  Moon,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cx } from "@/lib/utils/cx";
import { supabase } from "@/integrations/supabase/client";
import {
  findActivePortalNavigation,
  getPortalNavigationGroups,
  getPortalSearchItems,
  getPortalWorkspaces,
  type PortalNavigationItem,
} from "../utils/portalNavigation";
import { PortalContextBar } from "../components/PortalContextBar";
import { usePortal } from "../context/PortalContext";

type SearchResult = {
  id: string;
  label: string;
  detail: string;
  path: string;
  kind: string;
};

type QuoteSearchRow = {
  id: string;
  reference: string;
  clientName: string;
  siteName: string;
};

const matchesSearch = (item: PortalNavigationItem, query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return false;
  return [item.label, item.path, ...(item.aliases ?? [])].some((value) =>
    value.toLowerCase().includes(normalized),
  );
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const PortalLayout: React.FC = () => {
  const { signOut, role, user, profile, theme, setTheme, jobs, workers } = usePortal();
  const location = useLocation();
  const navigate = useNavigate();
  const mainContentRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const searchReturnRef = useRef<HTMLElement | null>(null);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [quotes, setQuotes] = useState<QuoteSearchRow[]>([]);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const workspacePanelRef = useRef<HTMLDivElement>(null);
  const workspaceTriggerRef = useRef<HTMLButtonElement>(null);
  const navigationTriggerRef = useRef<HTMLElement | null>(null);
  const mobileNavigationRef = useRef<HTMLElement>(null);
  const skipLinkRef = useRef<HTMLAnchorElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const desktopNavigationRef = useRef<HTMLElement>(null);

  const focusNavigationTrigger = useCallback(() => {
    (navigationTriggerRef.current ?? workspaceTriggerRef.current)?.focus();
  }, []);

  const workspaces = useMemo(() => getPortalWorkspaces(role), [role]);
  const { workspace: activeWorkspace, item: activeItem } = findActivePortalNavigation(
    role,
    location.pathname,
    location.search,
  );
  const currentWorkspace = activeWorkspace ?? workspaces[0];
  const operationsWorkspace = workspaces.find((workspace) => workspace.id === "operations");
  const primaryWorkspace = operationsWorkspace ?? currentWorkspace;
  const isAccountRoute = ["/portal/settings", "/portal/help", "/portal/contact"].includes(
    location.pathname,
  );
  const isLegalRoute =
    [
      "/portal/legal",
      "/portal/terms",
      "/portal/acceptable-use",
      "/portal/privacy",
      "/portal/cookies",
      "/portal/modern-slavery",
      "/portal/right-to-work",
    ].includes(location.pathname) || location.pathname.startsWith("/portal/policies/");
  const workspaceLabel = isAccountRoute
    ? "Account"
    : isLegalRoute
      ? "Policies & legal"
      : (currentWorkspace?.label ?? "Portal");
  const mobilePrimaryItems = useMemo(() => {
    const primaryIds =
      role === "site_foreman"
        ? ["today", "field-sites", "my-shifts"]
        : role === "third_party"
          ? ["partner-home", "partner-staff", "partner-sites"]
          : ["overview", "work", "planning", "people"];
    return (primaryWorkspace?.items ?? [])
      .filter((item) => primaryIds.includes(item.id))
      .map((item) => ({ ...item, kind: "link" as const }));
  }, [primaryWorkspace, role]);
  const mobileNavigationItems = useMemo(
    () => [
      ...mobilePrimaryItems,
      { id: "more", label: "Navigation", icon: MoreHorizontal, kind: "more" as const },
    ],
    [mobilePrimaryItems],
  );
  const navigationGroups = useMemo(() => getPortalNavigationGroups(role), [role]);
  const hasPoliciesNavigation = navigationGroups.some((group) =>
    group.items.some((item) => item.id === "policies"),
  );

  useEffect(() => {
    if (!role || role === "third_party" || role === "site_foreman") return;
    let cancelled = false;
    void supabase
      .from("quotes")
      .select("id, reference, client_info, date")
      .order("date", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (cancelled) return;
        setQuotes(
          (data ?? []).map((quote) => ({
            id: quote.id,
            reference: quote.reference || "EST-DRAFT",
            clientName:
              (quote.client_info as { entity?: string } | null)?.entity || "Unknown client",
            siteName: (quote.client_info as { site?: string } | null)?.site || "",
          })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [role]);
  const searchResults = useMemo<SearchResult[]>(() => {
    const results: SearchResult[] = [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return results;

    getPortalSearchItems(role)
      .filter((item) => matchesSearch(item, query))
      .forEach((item) => {
        results.push({
          id: `page-${item.id}`,
          label: item.label,
          detail: `${item.workspaceLabel} page`,
          path: item.path,
          kind: "Page",
        });
      });

    if (role !== "third_party" && role !== "site_foreman") {
      jobs
        .filter((job) =>
          `${job.jobRef} ${job.siteName} ${job.mainContractor} ${job.postcode}`
            .toLowerCase()
            .includes(query),
        )
        .slice(0, 6)
        .forEach((job) => {
          results.push({
            id: `job-${job.id}`,
            label: job.siteName,
            detail: `${job.jobRef} · ${job.mainContractor}`,
            path: `/portal/ledger?jobId=${encodeURIComponent(job.id)}`,
            kind: "Job",
          });
        });
      workers
        .filter((worker) =>
          `${worker.name} ${worker.role} ${worker.email ?? ""}`.toLowerCase().includes(query),
        )
        .slice(0, 6)
        .forEach((worker) => {
          results.push({
            id: `worker-${worker.id}`,
            label: worker.name,
            detail: worker.role,
            path: `/portal/roster?view=staff&workerId=${encodeURIComponent(worker.id)}`,
            kind: "Person",
          });
        });
      quotes
        .filter((quote) =>
          `${quote.reference} ${quote.clientName} ${quote.siteName}`.toLowerCase().includes(query),
        )
        .slice(0, 6)
        .forEach((quote) => {
          results.push({
            id: `quote-${quote.id}`,
            label: quote.clientName,
            detail: quote.reference,
            path:
              role === "logistics_assistant"
                ? "/portal/pipeline?view=pipeline-registry"
                : `/portal/pipeline?view=quote-builder&quoteId=${encodeURIComponent(quote.id)}`,
            kind: "Quote",
          });
        });
    }

    return results.slice(0, 14);
  }, [jobs, quotes, role, searchQuery, workers]);
  const searchResultGroups = useMemo(
    () =>
      ["Page", "Job", "Person", "Quote"]
        .map((kind) => ({
          kind,
          label:
            kind === "Page"
              ? "Pages"
              : kind === "Job"
                ? "Jobs"
                : kind === "Person"
                  ? "People"
                  : "Quotes",
          results: searchResults.filter((result) => result.kind === kind),
        }))
        .filter((group) => group.results.length > 0),
    [searchResults],
  );

  const logoSrc =
    theme === "light" ? "/opus-form-primary-light.svg" : "/opus-form-primary-dark.svg";
  const logoIconSrc = theme === "light" ? "/opus-form-icon-light.svg" : "/opus-form-icon-dark.svg";
  const homePath =
    role === "third_party"
      ? "/portal/third-party"
      : role === "site_foreman"
        ? "/portal/foreman"
        : "/portal/dashboard";

  useEffect(() => {
    mainContentRef.current?.focus();
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!searchOpen) return;
    const timeout = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timeout);
  }, [searchOpen]);

  useEffect(() => {
    setSelectedSearchIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    setSelectedSearchIndex((index) => Math.min(index, Math.max(searchResults.length - 1, 0)));
  }, [searchResults.length]);

  useEffect(() => {
    if (!workspaceMenuOpen) return;
    const focusFirstControl = window.setTimeout(() => {
      workspacePanelRef.current
        ?.querySelector<HTMLElement>(
          "[data-navigation-close], a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1']), [contenteditable='true']",
        )
        ?.focus();
    }, 0);
    const closeWorkspaceMenu = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (
        !workspaceMenuRef.current?.contains(target) &&
        !workspacePanelRef.current?.contains(target) &&
        !target.closest("[data-workspace-menu-trigger]")
      ) {
        setWorkspaceMenuOpen(false);
        focusNavigationTrigger();
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setWorkspaceMenuOpen(false);
        focusNavigationTrigger();
        return;
      }
      if (event.key === "Tab") {
        const focusable = workspacePanelRef.current?.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1']), [contenteditable='true']",
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
      }
    };
    const keepFocusInside = (event: FocusEvent) => {
      if (!workspacePanelRef.current?.contains(event.target as Node)) {
        event.preventDefault();
        workspacePanelRef.current
          ?.querySelector<HTMLElement>(
            "[data-navigation-close], a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])",
          )
          ?.focus();
      }
    };
    document.addEventListener("pointerdown", closeWorkspaceMenu);
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("focusin", keepFocusInside);
    return () => {
      window.clearTimeout(focusFirstControl);
      document.removeEventListener("pointerdown", closeWorkspaceMenu);
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("focusin", keepFocusInside);
    };
  }, [focusNavigationTrigger, workspaceMenuOpen]);

  useEffect(() => {
    const protectedRegions = [
      skipLinkRef.current,
      headerRef.current,
      desktopNavigationRef.current,
      mainContentRef.current,
      mobileNavigationRef.current,
    ].filter((region): region is HTMLElement => Boolean(region));
    protectedRegions.forEach((region) => {
      if (workspaceMenuOpen) region.setAttribute("inert", "");
      else region.removeAttribute("inert");
    });
    return () => protectedRegions.forEach((region) => region.removeAttribute("inert"));
  }, [workspaceMenuOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchReturnRef.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleLogoutClick = async () => {
    await signOut();
    navigate("/portal");
  };

  const routeAnnouncement = activeItem?.label ?? workspaceLabel;
  const WorkspaceIcon =
    isAccountRoute || isLegalRoute ? undefined : currentWorkspace?.items[0]?.icon;
  const isAccountDestinationActive = (path: string) =>
    path === "/portal/legal" ? isLegalRoute : location.pathname === path;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/30 selection:text-white">
      <a
        ref={skipLinkRef}
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-background focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>

      <aside
        ref={desktopNavigationRef}
        aria-label="Portal navigation"
        aria-hidden={workspaceMenuOpen || undefined}
        className={cx(
          "fixed inset-y-0 left-0 z-50 hidden w-60 flex-col border-r border-border bg-card md:flex",
          workspaceMenuOpen && "pointer-events-none",
        )}
      >
        <div className="border-b border-border p-4">
          <Link to={homePath} className="flex items-center" aria-label="Opus Form home">
            <img src={logoSrc} alt="Opus Form" className="h-8 w-auto max-w-[9rem]" />
          </Link>
          <div className="mt-4 flex min-h-12 w-full items-center gap-2 rounded-lg border border-border bg-background px-2.5 text-left">
            {WorkspaceIcon && (
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <WorkspaceIcon className="size-4" aria-hidden="true" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Current area
              </span>
              <span className="block truncate text-sm font-semibold">{workspaceLabel}</span>
            </span>
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="All destinations">
          <div className="space-y-5">
            {navigationGroups.map((group) => (
              <section key={group.id} aria-labelledby={`rail-group-${group.id}`}>
                <h2
                  id={`rail-group-${group.id}`}
                  className="mb-1 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  {group.label}
                </h2>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = activeWorkspace?.id === group.id && activeItem?.id === item.id;
                    return (
                      <Link
                        key={item.id}
                        to={item.path}
                        aria-current={active ? "page" : undefined}
                        className={cx(
                          focusRing,
                          "flex min-h-11 items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                          active && "bg-primary/10 font-semibold text-primary",
                        )}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </nav>

        <div className="border-t border-border p-3">
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Account
          </p>
          <div className="grid gap-1">
            <Link
              to="/portal/settings"
              aria-current={isAccountDestinationActive("/portal/settings") ? "page" : undefined}
              className={cx(
                focusRing,
                "flex min-h-10 items-center gap-3 rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                isAccountDestinationActive("/portal/settings") &&
                  "bg-primary/10 font-semibold text-primary",
              )}
            >
              <Settings className="size-4" aria-hidden="true" />
              Settings
            </Link>
            <Link
              to="/portal/help"
              aria-current={isAccountDestinationActive("/portal/help") ? "page" : undefined}
              className={cx(
                focusRing,
                "flex min-h-10 items-center gap-3 rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                isAccountDestinationActive("/portal/help") &&
                  "bg-primary/10 font-semibold text-primary",
              )}
            >
              <CircleHelp className="size-4" aria-hidden="true" />
              Help
            </Link>
            <Link
              to="/portal/contact"
              aria-current={isAccountDestinationActive("/portal/contact") ? "page" : undefined}
              className={cx(
                focusRing,
                "flex min-h-10 items-center gap-3 rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                isAccountDestinationActive("/portal/contact") &&
                  "bg-primary/10 font-semibold text-primary",
              )}
            >
              <Mail className="size-4" aria-hidden="true" />
              Contact
            </Link>
            {!hasPoliciesNavigation && (
              <Link
                to="/portal/legal"
                aria-current={isAccountDestinationActive("/portal/legal") ? "page" : undefined}
                className={cx(
                  focusRing,
                  "flex min-h-10 items-center gap-3 rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                  isAccountDestinationActive("/portal/legal") &&
                    "bg-primary/10 font-semibold text-primary",
                )}
              >
                <ShieldCheck className="size-4" aria-hidden="true" />
                Policies &amp; legal
              </Link>
            )}
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={cx(
                focusRing,
                "flex min-h-10 items-center gap-3 rounded-lg px-2.5 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {theme === "dark" ? (
                <Sun className="size-4" aria-hidden="true" />
              ) : (
                <Moon className="size-4" aria-hidden="true" />
              )}
              {theme === "dark" ? "Light theme" : "Dark theme"}
            </button>
            <button
              type="button"
              onClick={() => void handleLogoutClick()}
              className={cx(
                focusRing,
                "flex min-h-10 items-center gap-3 rounded-lg px-2.5 text-left text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
              )}
            >
              <LogOut className="size-4" aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>
      </aside>

      <header
        ref={headerRef}
        aria-hidden={workspaceMenuOpen || undefined}
        className={cx(
          "sticky top-0 border-b border-border bg-background/95 backdrop-blur md:ml-60",
          workspaceMenuOpen ? "z-40 pointer-events-none" : "z-40",
        )}
      >
        <div className="portal-shell-container flex min-h-16 min-w-0 items-center gap-2 sm:gap-3">
          <Link
            to={homePath}
            className="flex shrink-0 items-center md:hidden"
            aria-label="Opus Form home"
          >
            <img src={logoSrc} alt="Opus Form" className="hidden h-8 w-auto min-[390px]:block" />
            <img
              src={logoIconSrc}
              alt=""
              aria-hidden="true"
              className="block size-8 min-[390px]:hidden"
            />
          </Link>

          <div ref={workspaceMenuRef} className="relative min-w-0 shrink-0">
            <button
              ref={workspaceTriggerRef}
              type="button"
              onClick={(event) => {
                navigationTriggerRef.current = event.currentTarget;
                setWorkspaceMenuOpen((open) => !open);
              }}
              aria-expanded={workspaceMenuOpen}
              aria-haspopup="dialog"
              aria-controls="workspace-menu"
              data-workspace-menu-trigger
              className={cx(
                focusRing,
                "flex min-h-11 min-w-0 max-w-none items-center gap-2 border px-2.5 text-left transition-colors sm:max-w-[15rem] sm:px-3 md:hidden",
                workspaceMenuOpen
                  ? "rounded-t-lg rounded-b-none border-border bg-card"
                  : "rounded-lg border-transparent hover:bg-muted",
              )}
            >
              {WorkspaceIcon && (
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  <WorkspaceIcon className="size-4" aria-hidden="true" />
                </span>
              )}
              <span className="min-w-0">
                <span className="hidden text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:block">
                  Current area
                </span>
                <span className="block whitespace-nowrap text-sm font-semibold">
                  {workspaceLabel}
                </span>
              </span>
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
            </button>
            {workspaceMenuOpen &&
              typeof document !== "undefined" &&
              createPortal(
                <>
                  <div
                    ref={workspacePanelRef}
                    role="dialog"
                    aria-labelledby="portal-navigation-title"
                    aria-describedby="portal-navigation-description"
                    aria-modal="true"
                    id="workspace-menu"
                    className="fixed left-0 right-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-y border-border bg-card shadow-xl md:hidden"
                  >
                    <div className="portal-shell-container py-5">
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                          <p
                            id="portal-navigation-title"
                            className="text-base font-semibold text-foreground"
                          >
                            Navigation
                          </p>
                          <p
                            id="portal-navigation-description"
                            className="mt-1 text-sm text-muted-foreground"
                          >
                            All destinations in your permitted workspaces.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setWorkspaceMenuOpen(false);
                            focusNavigationTrigger();
                          }}
                          className={cx(
                            focusRing,
                            "flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                          data-navigation-close
                          aria-label="Close navigation"
                        >
                          <X className="size-5" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {navigationGroups.map((group) => (
                          <section
                            key={group.id}
                            aria-labelledby={`navigation-group-${group.id}`}
                            className="rounded-xl border border-border bg-background/40 p-3"
                          >
                            <h2
                              id={`navigation-group-${group.id}`}
                              className="mb-2 text-sm font-semibold text-foreground"
                            >
                              {group.label}
                            </h2>
                            <div className="grid gap-1">
                              {group.items.map((item) => {
                                const Icon = item.icon;
                                const active =
                                  activeWorkspace?.id === item.workspace &&
                                  activeItem?.id === item.id;
                                return (
                                  <Link
                                    key={item.id}
                                    to={item.path}
                                    onClick={() => setWorkspaceMenuOpen(false)}
                                    aria-current={active ? "page" : undefined}
                                    className={cx(
                                      focusRing,
                                      "flex min-h-14 items-center gap-3 rounded-lg border border-transparent px-2.5 text-sm font-medium transition-colors hover:border-border hover:bg-muted",
                                      active && "border-primary/30 bg-primary/10 text-primary",
                                    )}
                                  >
                                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-primary">
                                      <Icon className="size-4" aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0">
                                      <span className="block truncate">{item.label}</span>
                                      {item.description && (
                                        <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                                          {item.description}
                                        </span>
                                      )}
                                    </span>
                                  </Link>
                                );
                              })}
                            </div>
                          </section>
                        ))}
                        {navigationGroups.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            Your main destinations are available in the navigation bar.
                          </p>
                        )}
                      </div>
                      <div className="mt-5 border-t border-border pt-4">
                        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          Account
                        </p>
                        <div className="grid gap-1 sm:grid-cols-2">
                          <Link
                            to="/portal/settings"
                            onClick={() => setWorkspaceMenuOpen(false)}
                            aria-current={
                              isAccountDestinationActive("/portal/settings") ? "page" : undefined
                            }
                            className={cx(
                              focusRing,
                              "flex min-h-11 items-center gap-3 rounded-lg border border-border bg-background/40 px-3 text-sm text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground",
                              isAccountDestinationActive("/portal/settings") &&
                                "border-primary/40 bg-primary/10 font-semibold text-primary",
                            )}
                          >
                            <Settings className="size-4" aria-hidden="true" />
                            Settings
                          </Link>
                          <Link
                            to="/portal/help"
                            onClick={() => setWorkspaceMenuOpen(false)}
                            aria-current={
                              isAccountDestinationActive("/portal/help") ? "page" : undefined
                            }
                            className={cx(
                              focusRing,
                              "flex min-h-11 items-center gap-3 rounded-lg border border-border bg-background/40 px-3 text-sm text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground",
                              isAccountDestinationActive("/portal/help") &&
                                "border-primary/40 bg-primary/10 font-semibold text-primary",
                            )}
                          >
                            <CircleHelp className="size-4" aria-hidden="true" />
                            Help
                          </Link>
                          <Link
                            to="/portal/contact"
                            onClick={() => setWorkspaceMenuOpen(false)}
                            aria-current={
                              isAccountDestinationActive("/portal/contact") ? "page" : undefined
                            }
                            className={cx(
                              focusRing,
                              "flex min-h-11 items-center gap-3 rounded-lg border border-border bg-background/40 px-3 text-sm text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground",
                              isAccountDestinationActive("/portal/contact") &&
                                "border-primary/40 bg-primary/10 font-semibold text-primary",
                            )}
                          >
                            <Mail className="size-4" aria-hidden="true" />
                            Contact
                          </Link>
                          <Link
                            to="/portal/legal"
                            onClick={() => setWorkspaceMenuOpen(false)}
                            aria-current={
                              isAccountDestinationActive("/portal/legal") ? "page" : undefined
                            }
                            className={cx(
                              focusRing,
                              "flex min-h-11 items-center gap-3 rounded-lg border border-border bg-background/40 px-3 text-sm text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground",
                              isAccountDestinationActive("/portal/legal") &&
                                "border-primary/40 bg-primary/10 font-semibold text-primary",
                            )}
                          >
                            <ShieldCheck className="size-4" aria-hidden="true" />
                            Policies &amp; legal
                          </Link>
                          <button
                            type="button"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className={cx(
                              focusRing,
                              "flex min-h-11 items-center gap-3 rounded-lg border border-border bg-background/40 px-3 text-left text-sm text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground",
                            )}
                          >
                            {theme === "dark" ? (
                              <Sun className="size-4" aria-hidden="true" />
                            ) : (
                              <Moon className="size-4" aria-hidden="true" />
                            )}
                            {theme === "dark" ? "Light theme" : "Dark theme"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setWorkspaceMenuOpen(false);
                              void handleLogoutClick();
                            }}
                            className={cx(
                              focusRing,
                              "flex min-h-11 items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 text-left text-sm text-destructive hover:border-destructive/40 hover:bg-destructive/10",
                            )}
                          >
                            <LogOut className="size-4" aria-hidden="true" />
                            Log out
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>,
                document.body,
              )}
          </div>

          <div className="hidden min-w-0 items-center gap-2 text-sm md:flex">
            <span className="font-semibold text-foreground">{workspaceLabel}</span>
            {activeItem && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="truncate text-muted-foreground">{activeItem.label}</span>
              </>
            )}
          </div>

          <div className="ml-auto flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1">
            <button
              ref={searchTriggerRef}
              type="button"
              onClick={(event) => {
                searchReturnRef.current = event.currentTarget;
                setSearchOpen(true);
              }}
              className={cx(
                focusRing,
                "flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:justify-start sm:px-3 md:min-w-48 lg:min-w-64",
              )}
              aria-label="Search portal"
            >
              <Search className="size-4" aria-hidden="true" />
              <span className="hidden min-w-0 truncate text-sm sm:inline">
                Search jobs, people, quotes…
              </span>
              <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] md:inline">
                ⌘K
              </kbd>
            </button>
            <Link
              to="/portal/settings"
              aria-current={isAccountDestinationActive("/portal/settings") ? "page" : undefined}
              className={cx(
                focusRing,
                "hidden min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors hover:bg-muted md:flex",
              )}
            >
              <span className="grid size-7 place-items-center rounded-full bg-muted text-xs font-bold">
                {(profile?.full_name || user?.email || "U").slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden max-w-28 truncate lg:inline">
                {profile?.full_name || user?.email || "Account"}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {workspaceMenuOpen && (
        <div
          role="presentation"
          aria-hidden="true"
          onClick={() => {
            setWorkspaceMenuOpen(false);
            focusNavigationTrigger();
          }}
          className="fixed inset-x-0 bottom-0 top-16 z-50 cursor-default bg-black/45 backdrop-blur-md dark:bg-black/60 md:hidden"
        />
      )}

      <div className="md:ml-60">
        <PortalContextBar role={role} />
      </div>

      <main
        id="main-content"
        ref={mainContentRef}
        tabIndex={-1}
        className="portal-main-content min-h-0 flex-1 bg-background outline-none md:ml-60"
      >
        <div className="sr-only" aria-live="polite">
          {routeAnnouncement}
        </div>
        <Outlet />
      </main>

      <nav
        ref={mobileNavigationRef}
        aria-label="Primary mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-40 grid border-t border-border bg-background/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] backdrop-blur md:hidden"
        style={{
          gridTemplateColumns: `repeat(${mobileNavigationItems.length}, minmax(0, 1fr))`,
        }}
      >
        {mobileNavigationItems.map((navItem) => {
          const Icon = navItem.icon;
          const active =
            (navItem.kind === "link" &&
              activeWorkspace?.id === primaryWorkspace?.id &&
              activeItem?.id === navItem.id) ||
            (navItem.kind === "more" &&
              (isAccountRoute ||
                isLegalRoute ||
                (Boolean(activeItem) &&
                  !mobilePrimaryItems.some((item) => item.id === activeItem?.id))));
          const classes = cx(
            focusRing,
            "flex min-h-14 flex-col items-center justify-center rounded-xl px-0 text-center text-[11px] font-medium",
            active
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          );

          if (navItem.kind === "more") {
            return (
              <button
                key={navItem.id}
                type="button"
                onClick={(event) => {
                  navigationTriggerRef.current = event.currentTarget;
                  setWorkspaceMenuOpen(true);
                }}
                aria-expanded={workspaceMenuOpen}
                aria-controls="workspace-menu"
                aria-label="Open full navigation"
                className={classes}
              >
                <Icon className="mb-1 size-4" aria-hidden="true" />
                {navItem.label}
              </button>
            );
          }

          return (
            <Link
              key={navItem.id}
              to={navItem.path}
              aria-current={active ? "page" : undefined}
              className={classes}
            >
              <Icon className="mb-1 size-4" aria-hidden="true" />
              {navItem.label}
            </Link>
          );
        })}
      </nav>

      <Dialog
        open={searchOpen}
        onOpenChange={(open) => {
          setSearchOpen(open);
          if (!open) {
            setSearchQuery("");
            window.setTimeout(() => {
              (searchReturnRef.current ?? searchTriggerRef.current)?.focus();
            }, 0);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Search portal</DialogTitle>
            <DialogDescription>Search permitted pages, jobs, people, and quotes.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setSelectedSearchIndex((index) =>
                    Math.max(0, Math.min(index + 1, searchResults.length - 1)),
                  );
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setSelectedSearchIndex((index) => Math.max(index - 1, 0));
                } else if (event.key === "Enter" && searchResults[selectedSearchIndex]) {
                  event.preventDefault();
                  navigate(searchResults[selectedSearchIndex].path);
                  setSearchOpen(false);
                  setSearchQuery("");
                }
              }}
              placeholder="Search jobs, people, quotes, or pages…"
              className={cx(
                focusRing,
                "min-h-12 w-full rounded-lg border border-border bg-muted/30 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
              )}
              aria-label="Search jobs, people, quotes, or pages"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={Boolean(searchQuery && searchResults.length > 0)}
              aria-controls={
                searchQuery && searchResults.length > 0 ? "portal-search-results" : undefined
              }
              aria-activedescendant={
                searchResults[selectedSearchIndex]
                  ? `portal-search-option-${searchResults[selectedSearchIndex].id}`
                  : undefined
              }
            />
          </div>
          {searchQuery && searchResults.length > 0 && (
            <p className="mb-3 text-sm text-muted-foreground" role="status" aria-live="polite">
              {searchResults.length} {searchResults.length === 1 ? "result" : "results"}. Use the
              arrow keys to choose one.
            </p>
          )}
          {searchQuery && searchResults.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground" role="status">
              No results found.
            </p>
          )}
          {searchQuery && searchResults.length > 0 && (
            <div id="portal-search-results" role="listbox" className="max-h-[50vh] overflow-y-auto">
              <div className="grid gap-1">
                {searchResultGroups.map((group) => (
                  <div key={group.kind} role="group" aria-label={group.label}>
                    <p className="px-3 pb-1 pt-3 text-sm font-semibold text-foreground">
                      {group.label}
                    </p>
                    {group.results.map((result) => {
                      const resultIndex = searchResults.findIndex(
                        (candidate) => candidate.id === result.id,
                      );
                      return (
                        <Link
                          key={result.id}
                          to={result.path}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery("");
                          }}
                          id={`portal-search-option-${result.id}`}
                          role="option"
                          aria-selected={selectedSearchIndex === resultIndex}
                          className={cx(
                            focusRing,
                            "rounded-lg px-3 py-3 transition-colors hover:bg-muted",
                            selectedSearchIndex === resultIndex && "bg-muted",
                          )}
                        >
                          <span className="block text-sm font-semibold">{result.label}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {result.detail}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
