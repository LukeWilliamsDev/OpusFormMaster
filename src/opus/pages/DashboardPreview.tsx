import React, { useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Search,
  Users,
  X,
} from "lucide-react";

const attentionItems = [
  {
    title: "3 staff certificates need review",
    detail: "2 expire within 30 days · 1 has expired",
    label: "Review",
    action: "Open staff →",
  },
  {
    title: "Weather risk at Riverside Phase 2",
    detail: "Heavy rain forecast for Tuesday, 06/10/2026",
    label: "Weather",
    action: "View site →",
  },
  {
    title: "2 shift responses need a decision",
    detail: "Confirm cover before the next scheduled pour",
    label: "Action needed",
    action: "Review shifts →",
  },
];

const sites = [
  { name: "Riverside Phase 2", detail: "SW1A 1AA · Next shift today", status: "In progress" },
  { name: "Central Square", detail: "B1 1BB · Next shift 07/10/2026", status: "In progress" },
  { name: "Oakwood Grounds", detail: "M1 1AE · Next shift 09/10/2026", status: "Upcoming" },
];

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Jobs", icon: ClipboardList },
  { label: "Schedule", icon: Calendar },
  { label: "Staff", icon: Users },
];

export const DashboardPreviewPage: React.FC = () => {
  const [activeNav, setActiveNav] = useState("Overview");
  const [query, setQuery] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredSites = useMemo(
    () =>
      sites.filter((site) => `${site.name} ${site.detail}`.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery],
  );

  const selectNav = (label: string) => {
    setActiveNav(label);
    setMoreOpen(false);
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="border-b border-primary/30 bg-primary/10 px-4 py-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-primary">
        Local mock-data preview · changes are not connected to live data
      </div>

      <div className="flex min-h-[calc(100vh-33px)]">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-card px-5 py-7 lg:block">
          <div className="px-2 text-xl font-black tracking-tight">
            opus<span className="text-primary">form</span>
          </div>
          <p className="mt-10 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            Operations
          </p>
          <nav className="mt-3 space-y-1" aria-label="Preview navigation">
            {navItems.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => selectNav(label)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-xs font-bold transition-colors ${activeNav === label ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>
          <p className="mt-8 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            People &amp; quotes
          </p>
          <div className="mt-3 space-y-1 text-xs font-bold text-muted-foreground">
            <div className="rounded-lg px-3 py-3">Staff</div>
            <div className="rounded-lg px-3 py-3">Certificate checker</div>
            <div className="rounded-lg px-3 py-3">Quotes</div>
          </div>
          <div className="mt-auto hidden border-t border-border pt-5 text-xs lg:block">
            <p className="font-black">Luke Williams</p>
            <p className="mt-1 text-muted-foreground">Admin</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-7 pb-28 sm:px-8 lg:px-12 lg:py-12 lg:pb-12">
          <header className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                Operations overview
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight lg:text-4xl">Good morning</h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                See what needs attention and what is happening across your sites.
              </p>
              <p className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
                Updated just now
              </p>
            </div>
            <label className="relative w-full sm:max-w-xs">
              <span className="sr-only">Search preview sites</span>
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search sites, staff, or quotes…"
                className="min-h-12 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              />
            </label>
          </header>

          <div className="mx-auto mt-8 max-w-6xl space-y-7">
            <section aria-labelledby="preview-attention-heading">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="preview-attention-heading" className="text-lg font-black tracking-tight">
                  Needs attention
                </h2>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  3 items
                </span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-warning/40 bg-card">
                {attentionItems.map((item) => (
                  <div
                    key={item.title}
                    className="flex flex-col gap-2 border-b border-border px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-widest text-warning">
                        {item.label}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          selectNav(
                            item.label === "Review"
                              ? "Staff"
                              : item.label === "Weather"
                                ? "Jobs"
                                : "Schedule",
                          )
                        }
                        className="text-[10px] font-black uppercase tracking-widest text-primary"
                      >
                        {item.action}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="preview-operations-heading">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="preview-operations-heading" className="text-lg font-black tracking-tight">
                  Current operations
                </h2>
                <button
                  type="button"
                  onClick={() => selectNav("Jobs")}
                  className="text-[10px] font-black uppercase tracking-widest text-primary"
                >
                  Open job ledger →
                </button>
              </div>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="border-b border-border px-5 py-4">
                    <h3 className="text-base font-black">Active sites</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Current and next scheduled work
                    </p>
                  </div>
                  {filteredSites.length ? (
                    filteredSites.map((site) => (
                      <div
                        key={site.name}
                        className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{site.name}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {site.detail}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-black uppercase tracking-widest ${site.status === "Upcoming" ? "bg-secondary text-muted-foreground" : "bg-success/10 text-success"}`}
                        >
                          {site.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-2 px-5 py-8 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      No matching preview sites.
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="text-base font-black">Next on the schedule</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    One concise view of the next decision, without repeating the full calendar.
                  </p>
                  <div className="mt-5 divide-y divide-border border-y border-border">
                    <div className="flex justify-between gap-3 py-3 text-xs">
                      <span>Riverside Phase 2</span>
                      <b className="text-primary">Today</b>
                    </div>
                    <div className="flex justify-between gap-3 py-3 text-xs">
                      <span>Crew scheduled</span>
                      <b className="text-primary">6 people</b>
                    </div>
                    <div className="flex justify-between gap-3 py-3 text-xs">
                      <span>Open shifts</span>
                      <button
                        type="button"
                        onClick={() => selectNav("Schedule")}
                        className="font-black text-primary"
                      >
                        View schedule
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
        aria-label="Preview navigation"
      >
        {navItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => selectNav(label)}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${activeNav === label ? "text-primary" : "text-muted-foreground"}`}
            aria-current={activeNav === label ? "page" : undefined}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-muted-foreground"
          aria-label="Open preview menu"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
          More
        </button>
      </nav>

      {moreOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 lg:hidden"
          role="presentation"
          onClick={() => setMoreOpen(false)}
        >
          <aside
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-border bg-card p-5"
            role="dialog"
            aria-modal="true"
            aria-label="Preview menu"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-black">More</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close preview menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-left text-sm font-bold text-muted-foreground">
              <button
                type="button"
                className="rounded-lg border border-border p-3 text-left"
                onClick={() => selectNav("Help")}
              >
                Help &amp; guidance
              </button>
              <button
                type="button"
                className="rounded-lg border border-border p-3 text-left"
                onClick={() => setMoreOpen(false)}
              >
                Settings
              </button>
              <button
                type="button"
                className="rounded-lg border border-border p-3 text-left"
                onClick={() => setMoreOpen(false)}
              >
                Legal &amp; privacy
              </button>
              <button
                type="button"
                className="rounded-lg border border-border p-3 text-left"
                onClick={() => setMoreOpen(false)}
              >
                Log out
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
