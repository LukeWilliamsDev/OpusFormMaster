import React from "react";
import { Link, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  FileText,
  HelpCircle,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  Paperclip,
  Shield,
  Sun,
  Users,
  X,
} from "lucide-react";
import { usePortal } from "../context/PortalContext";

const SITE = {
  id: "manchester-college",
  name: "Manchester College",
  location: "Openshaw Campus · M11 2WH",
  status: "Completed",
};

const STAFF = {
  name: "Aisha Rahman",
  role: "Concrete Finisher",
  email: "aisha.rahman@example.invalid",
};

const navItems = [
  { label: "Portal home", path: "/portal/third-party", icon: "▦" },
  { label: "Staff", path: "/portal/third-party/staff", icon: "♙" },
  { label: "Assigned sites", path: "/portal/third-party/sites", icon: "▥" },
];

export const ThirdPartyLayout: React.FC = () => {
  const { signOut, theme, setTheme } = usePortal();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => location.pathname === path;
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const logout = async () => {
    await signOut();
    navigate("/portal");
  };

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#18252a] dark:bg-background dark:text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[#ded8cd] bg-[#eee9df] px-4 py-6 dark:border-border dark:bg-card lg:flex">
        <Link to="/portal/third-party" className="px-3 text-sm font-black tracking-[0.22em]">
          OPUS <span className="text-[#985114]">·</span> FORM
        </Link>
        <div className="mt-8 flex items-center gap-3 border-y border-[#ded8cd] px-2 py-4 dark:border-border">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#dbcbb9] text-xs font-black text-[#74451f]">
            TP
          </span>
          <div className="min-w-0">
            <strong className="block truncate text-xs">Third Party Test Account</strong>
            <span className="mt-1 block text-[11px] font-bold text-[#1f755d]">
              Approved partner
            </span>
          </div>
        </div>
        <nav className="mt-5 grid gap-1.5" aria-label="Third-party portal">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`rounded-xl px-3 py-3 text-[11px] font-black uppercase tracking-[0.1em] transition ${isActive(item.path) ? "bg-[#985114] text-white shadow" : "text-[#4c5455] hover:bg-[#e4ddd2] dark:text-muted-foreground dark:hover:bg-muted"}`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto grid gap-1 border-t border-[#ded8cd] pt-4 dark:border-border">
          <Link
            to="/portal/help"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-[#555d5e] hover:bg-[#e4ddd2] dark:text-muted-foreground dark:hover:bg-muted"
          >
            <HelpCircle className="h-4 w-4" />
            Help &amp; guidance
          </Link>
          <Link
            to="/portal/contact"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-[#555d5e] hover:bg-[#e4ddd2] dark:text-muted-foreground dark:hover:bg-muted"
          >
            <MessageSquareText className="h-4 w-4" />
            Contact IT
          </Link>
          <Link
            to="/portal/legal"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-[#555d5e] hover:bg-[#e4ddd2] dark:text-muted-foreground dark:hover:bg-muted"
          >
            <Shield className="h-4 w-4" />
            Legal &amp; privacy
          </Link>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-[#555d5e] hover:bg-[#e4ddd2] dark:text-muted-foreground dark:hover:bg-muted"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}Light /
            dark
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-[#555d5e] hover:bg-[#e4ddd2] dark:text-muted-foreground dark:hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#ded8cd] bg-[#f7f4ee]/95 px-4 backdrop-blur dark:border-border dark:bg-background/95 lg:hidden">
        <Link to="/portal/third-party" className="text-sm font-black tracking-[0.2em]">
          OPUS <span className="text-[#985114]">·</span> FORM
        </Link>
        <button
          onClick={() => setMenuOpen((open) => !open)}
          className="grid min-h-[44px] min-w-[44px] place-items-center rounded-lg"
          aria-label="Open menu"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>
      {menuOpen && (
        <div className="fixed inset-x-0 top-16 z-20 border-b border-border bg-background p-4 shadow-lg lg:hidden">
          <nav className="grid gap-1">
            {navItems.map((item) => (
              <Link
                onClick={() => setMenuOpen(false)}
                key={item.path}
                to={item.path}
                className="rounded-lg px-3 py-3 text-xs font-black uppercase tracking-wider hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
            <Link
              onClick={() => setMenuOpen(false)}
              to="/portal/help"
              className="rounded-lg px-3 py-3 text-xs font-black uppercase tracking-wider hover:bg-muted"
            >
              Help &amp; guidance
            </Link>
            <Link
              onClick={() => setMenuOpen(false)}
              to="/portal/contact"
              className="rounded-lg px-3 py-3 text-xs font-black uppercase tracking-wider hover:bg-muted"
            >
              Contact IT
            </Link>
            <Link
              onClick={() => setMenuOpen(false)}
              to="/portal/legal"
              className="rounded-lg px-3 py-3 text-xs font-black uppercase tracking-wider hover:bg-muted"
            >
              Legal &amp; privacy
            </Link>
            <button
              onClick={toggleTheme}
              className="rounded-lg px-3 py-3 text-left text-xs font-black uppercase tracking-wider hover:bg-muted"
            >
              Light / dark
            </button>
            <button
              onClick={logout}
              className="rounded-lg px-3 py-3 text-left text-xs font-black uppercase tracking-wider hover:bg-muted"
            >
              Log out
            </button>
          </nav>
        </div>
      )}

      <main className="min-h-screen lg:ml-60">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid h-16 grid-cols-4 border-t border-[#ded8cd] bg-[#fffdf9] px-2 py-2 dark:border-border dark:bg-card lg:hidden">
        <Link
          to="/portal/third-party"
          className={`grid place-items-center text-[9px] font-black uppercase tracking-wider ${isActive("/portal/third-party") ? "text-[#985114]" : "text-muted-foreground"}`}
        >
          <span className="text-lg">⌂</span>Home
        </Link>
        <Link
          to="/portal/third-party/staff"
          className={`grid place-items-center text-[9px] font-black uppercase tracking-wider ${isActive("/portal/third-party/staff") ? "text-[#985114]" : "text-muted-foreground"}`}
        >
          <Users className="h-5 w-5" />
          Staff
        </Link>
        <Link
          to="/portal/third-party/sites"
          className={`grid place-items-center text-[9px] font-black uppercase tracking-wider ${isActive("/portal/third-party/sites") ? "text-[#985114]" : "text-muted-foreground"}`}
        >
          <span className="text-lg">▥</span>Sites
        </Link>
        <Link
          to="/portal/help"
          className="grid place-items-center text-[9px] font-black uppercase tracking-wider text-muted-foreground"
        >
          <HelpCircle className="h-5 w-5" />
          Help
        </Link>
      </nav>
    </div>
  );
};

const Page: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mx-auto max-w-6xl px-5 py-8 pb-24 sm:px-8 lg:px-12 lg:py-12">{children}</div>
);

export const ThirdPartyHomePage: React.FC = () => (
  <Page>
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#985114]">
          Third-party portal
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Good morning</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything your team needs for assigned work, approvals, and site updates.
        </p>
      </div>
      <Link
        to="/portal/third-party/staff"
        className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#985114] px-4 text-xs font-black uppercase tracking-wider text-white"
      >
        + Add staff member
      </Link>
    </header>
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      {[
        ["Your staff", "1", "approved and visible"],
        ["Assigned sites", "1", "current or upcoming"],
        ["Action needed", "0", "you are all caught up"],
      ].map(([label, value, note]) => (
        <div
          key={label}
          className="rounded-2xl border border-[#ded8cd] bg-[#fffdf9] p-5 shadow-sm dark:border-border dark:bg-card"
        >
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </div>
          <strong className="mt-4 block text-4xl font-black">{value}</strong>
          <span className="text-xs text-muted-foreground">{note}</span>
        </div>
      ))}
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      <section className="rounded-2xl border border-[#ded8cd] bg-[#fffdf9] p-5 dark:border-border dark:bg-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.14em]">Next up</h2>
          <span className="rounded-full bg-[#e3f1ea] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#1f755d]">
            ● On track
          </span>
        </div>
        <Link
          to="/portal/third-party/sites/manchester-college"
          className="flex items-center justify-between rounded-xl border border-[#ded8cd] p-4 hover:border-[#985114] dark:border-border"
        >
          <span>
            <strong className="block text-sm">{SITE.name}</strong>
            <span className="mt-1 block text-xs text-muted-foreground">{SITE.location}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {SITE.status} · 1 staff assigned
            </span>
          </span>
          <ArrowRight className="h-5 w-5 text-[#985114]" />
        </Link>
        <Link
          to="/portal/third-party/sites/manchester-college"
          className="mt-3 flex items-center justify-between rounded-xl border border-[#ded8cd] p-4 hover:border-[#985114] dark:border-border"
        >
          <span>
            <strong className="block text-sm">Recent conversation</strong>
            <span className="mt-1 block text-xs text-muted-foreground">
              Opus Form replied to your site note
            </span>
          </span>
          <ArrowRight className="h-5 w-5 text-[#985114]" />
        </Link>
      </section>
      <section className="rounded-2xl border border-[#ded8cd] bg-[#fffdf9] p-5 dark:border-border dark:bg-card">
        <h2 className="text-xs font-black uppercase tracking-[0.14em]">At a glance</h2>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#f2e5d7] p-4">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#985114] text-white">
            <Check className="h-5 w-5" />
          </span>
          <span>
            <strong className="block text-sm">Your access is active</strong>
            <span className="mt-1 block text-xs text-muted-foreground">
              Your assigned sites appear here automatically.
            </span>
          </span>
        </div>
        <div className="mt-4 flex gap-2">
          <Link
            to="/portal/third-party/staff"
            className="rounded-lg border border-[#ded8cd] px-3 py-2 text-xs font-bold dark:border-border"
          >
            View staff
          </Link>
          <Link
            to="/portal/third-party/sites"
            className="rounded-lg border border-[#ded8cd] px-3 py-2 text-xs font-bold dark:border-border"
          >
            View sites
          </Link>
        </div>
      </section>
    </div>
  </Page>
);

export const ThirdPartyStaffPage: React.FC = () => (
  <Page>
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#985114]">
          People and approvals
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Your staff</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage submissions, approvals, and compliance documents in one place.
        </p>
      </div>
      <button className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#985114] px-4 text-xs font-black uppercase tracking-wider text-white">
        + Add staff member
      </button>
    </header>
    <section className="mt-8 rounded-2xl border border-[#ded8cd] bg-[#fffdf9] p-5 shadow-sm dark:border-border dark:bg-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-[#dbcbb9] text-sm font-black text-[#74451f]">
          AR
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-black">{STAFF.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {STAFF.role} · {STAFF.email}
          </p>
        </div>
        <span className="rounded-full bg-[#e3f1ea] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#1f755d]">
          ● Approved
        </span>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#ded8cd] p-4 dark:border-border">
          <strong className="block text-xl">3</strong>
          <span className="text-xs text-muted-foreground">documents held</span>
        </div>
        <div className="rounded-xl border border-[#ded8cd] p-4 dark:border-border">
          <strong className="block text-xl">0</strong>
          <span className="text-xs text-muted-foreground">expiring soon</span>
        </div>
        <div className="rounded-xl border border-[#ded8cd] p-4 dark:border-border">
          <strong className="block text-xl">Active</strong>
          <span className="text-xs text-muted-foreground">approval status</span>
        </div>
      </div>
    </section>
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-[#ded8cd] bg-[#fffdf9] p-5 dark:border-border dark:bg-card">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.14em]">Certificate record</h2>
          <button className="rounded-lg border border-[#ded8cd] px-3 py-2 text-xs font-bold dark:border-border">
            Add certificate
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-[#ded8cd] p-4 dark:border-border">
            <span>
              <strong className="block text-sm">CSCS</strong>
              <span className="text-xs text-muted-foreground">Card and evidence uploaded</span>
            </span>
            <span className="text-[10px] font-black uppercase text-[#1f755d]">Current</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[#ded8cd] p-4 dark:border-border">
            <span>
              <strong className="block text-sm">Concrete Pump Operator</strong>
              <span className="text-xs text-muted-foreground">Last updated 18 September 2026</span>
            </span>
            <span className="text-[10px] font-black uppercase text-[#a76b18]">Review</span>
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-[#ded8cd] bg-[#fffdf9] p-5 dark:border-border dark:bg-card">
        <h2 className="text-xs font-black uppercase tracking-[0.14em]">Approval history</h2>
        <div className="mt-4 space-y-4 text-sm">
          <div className="flex gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-[#1f755d]" />
            <span>
              <strong className="block">Staff record approved</strong>
              <span className="text-xs text-muted-foreground">12 September 2026</span>
            </span>
          </div>
          <div className="flex gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-[#1f755d]" />
            <span>
              <strong className="block">Certificate added</strong>
              <span className="text-xs text-muted-foreground">18 September 2026</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  </Page>
);

export const ThirdPartySitesPage: React.FC = () => (
  <Page>
    <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#985114]">
      Work shared with your organisation
    </div>
    <h1 className="mt-2 text-3xl font-black tracking-tight">Assigned sites</h1>
    <p className="mt-2 text-sm text-muted-foreground">
      Open a site to view updates, photos, notes, and attachments.
    </p>
    <div className="mt-8 grid gap-4">
      <Link
        to="/portal/third-party/sites/manchester-college"
        className="flex items-center justify-between rounded-2xl border border-[#ded8cd] bg-[#fffdf9] p-5 shadow-sm hover:border-[#985114] dark:border-border dark:bg-card"
      >
        <span>
          <span className="mb-2 inline-flex rounded-full bg-[#e3f1ea] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#1f755d]">
            ● Completed
          </span>
          <strong className="block text-lg">{SITE.name}</strong>
          <span className="mt-1 block text-sm text-muted-foreground">{SITE.location}</span>
          <span className="mt-2 block text-xs text-muted-foreground">
            1 staff assigned · 3 photos · 2 notes
          </span>
        </span>
        <ChevronRight className="h-6 w-6 text-[#985114]" />
      </Link>
    </div>
  </Page>
);

export const ThirdPartySitePage: React.FC = () => {
  const { siteId } = useParams();
  return (
    <Page>
      <Link
        to="/portal/third-party/sites"
        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#985114]"
      >
        <ArrowLeft className="h-4 w-4" />
        Assigned sites
      </Link>
      <div className="mt-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#985114]">
            Assigned site
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            {siteId === SITE.id ? SITE.name : "Assigned site"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{SITE.location}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-lg border border-[#ded8cd] px-3 py-2 text-xs text-muted-foreground dark:border-border">
              {SITE.status}
            </span>
            <span className="rounded-lg border border-[#ded8cd] px-3 py-2 text-xs text-muted-foreground dark:border-border">
              1 staff assigned
            </span>
          </div>
        </div>
        <button className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#985114] px-4 text-xs font-black uppercase tracking-wider text-white">
          Add attachment
        </button>
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#ded8cd] bg-[#fffdf9] p-5 dark:border-border dark:bg-card">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-[0.14em]">Site photos</h2>
            <button className="rounded-lg border border-[#ded8cd] px-3 py-2 text-xs font-bold dark:border-border">
              View gallery
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="relative h-32 rounded-xl bg-gradient-to-br from-[#c9ad88] via-[#80664d] to-[#d7c09f] p-3 text-xs font-black uppercase text-white">
              Before<span className="absolute bottom-3 right-3 text-[10px] font-normal">View</span>
            </div>
            <div className="relative h-32 rounded-xl bg-gradient-to-br from-[#b89a76] via-[#5e5145] to-[#c8aa84] p-3 text-xs font-black uppercase text-white">
              Before<span className="absolute bottom-3 right-3 text-[10px] font-normal">View</span>
            </div>
            <div className="relative h-32 rounded-xl bg-gradient-to-br from-[#9e8060] via-[#463e37] to-[#d7c09f] p-3 text-xs font-black uppercase text-white">
              After<span className="absolute bottom-3 right-3 text-[10px] font-normal">View</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Photos supplied by Opus Form and available for your team to view.
          </p>
        </section>
        <section className="rounded-2xl border border-[#ded8cd] bg-[#fffdf9] p-5 dark:border-border dark:bg-card">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-[0.14em]">Latest notes</h2>
            <button className="rounded-lg border border-[#ded8cd] px-3 py-2 text-xs font-bold dark:border-border">
              View all
            </button>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-[#ded8cd] p-4 dark:border-border">
              <div className="flex justify-between text-xs">
                <strong>IT</strong>
                <span className="text-muted-foreground">23/09/2026</span>
              </div>
              <p className="mt-2 text-sm">Site update received and reviewed.</p>
            </div>
            <div className="rounded-xl border border-[#ded8cd] p-4 dark:border-border">
              <div className="flex justify-between text-xs">
                <strong>You</strong>
                <span className="text-muted-foreground">23/09/2026</span>
              </div>
              <p className="mt-2 text-sm">Third-party follow-up test.</p>
            </div>
          </div>
        </section>
      </div>
      <section className="mt-5 rounded-2xl border border-[#ded8cd] bg-[#fffdf9] p-5 dark:border-border dark:bg-card">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.14em]">Attachments</h2>
          <button className="rounded-lg border border-[#ded8cd] px-3 py-2 text-xs font-bold dark:border-border">
            <Paperclip className="mr-1 inline h-3.5 w-3.5" />
            Upload file
          </button>
        </div>
        <div className="mt-3 flex items-center gap-3 border-t border-[#ded8cd] pt-3 text-sm dark:border-border">
          <FileText className="h-4 w-4 text-[#985114]" />
          <span>site-update-test.pdf</span>
          <span className="ml-auto text-xs text-muted-foreground">Uploaded today</span>
        </div>
      </section>
    </Page>
  );
};
