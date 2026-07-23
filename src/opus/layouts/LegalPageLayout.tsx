import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { usePortal } from "../context/PortalContext";

const slugify = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/**
 * Walks the page's <Section> children to build a table of contents and
 * stamp each section with a scroll-target id, without every legal page
 * needing to manage anchors itself.
 */
const useTableOfContents = (children: React.ReactNode) => {
  return useMemo(() => {
    const toc: { id: string; title: string }[] = [];
    const stamped = React.Children.map(children, (child) => {
      if (!React.isValidElement(child) || !child.props?.title) return child;
      const id = slugify(child.props.title);
      toc.push({ id, title: child.props.title });
      return React.cloneElement(child, { id });
    });
    return { toc, stamped };
  }, [children]);
};

// The app uses HashRouter, which already owns the URL's `#` for routing —
// a plain `href="#id"` anchor would be intercepted as a route change
// instead of scrolling. Scroll manually and skip the hash entirely.
const scrollToSection = (e: React.MouseEvent, id: string) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

/**
 * Shared layout wrapper for all legal/compliance pages.
 * Conditionally adapts:
 * - Unauthenticated: standalone full-page layout with custom header/footer.
 * - Authenticated: clean nested layout fitting within the PortalLayout viewport.
 */
export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({
  title,
  lastUpdated,
  children,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = usePortal();

  const [visible, setVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    if (isAuthenticated) return;
    const t1 = setTimeout(() => setVisible(true), 150);
    const t2 = setTimeout(() => setFooterVisible(true), 700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isAuthenticated]);

  const getFooterLinks = () => {
    if (isAuthenticated) {
      return [
        { label: "Staff Privacy Notice", path: "/portal/privacy" },
        { label: "Usage Policy", path: "/portal/terms" },
        { label: "Acceptable Use", path: "/portal/acceptable-use" },
        { label: "Cookie Statement", path: "/portal/cookies" },
        { label: "Modern Slavery", path: "/portal/modern-slavery" },
      ];
    }
    return [
      { label: "Staff Privacy Notice", path: "/privacy" },
      { label: "Cookie Statement", path: "/cookies" },
      { label: "Modern Slavery", path: "/modern-slavery" },
    ];
  };

  const { toc, stamped } = useTableOfContents(children);

  if (isAuthenticated) {
    return (
      <div className="flex-1 min-h-0 bg-background text-foreground overflow-y-auto px-4 sm:px-6 py-6 pb-20">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb style back action */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.18em] transition-colors duration-200 mb-6"
            style={{ color: "var(--primary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--primary)")}
            aria-label="Go back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to previous page
          </button>

          {/* Title block */}
          <div className="mb-6">
            <h1 className="text-[20px] sm:text-[24px] font-bold tracking-tight text-foreground leading-tight">
              {title}
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] mt-1.5 text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          </div>

          <div className="h-px mb-6 bg-border" />

          <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
            {/* Section nav */}
            {toc.length > 0 && (
              <nav className="hidden lg:block sticky top-6 self-start">
                <span className="block text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                  On this page
                </span>
                <ul className="space-y-2">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        onClick={(e) => scrollToSection(e, item.id)}
                        className="block text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors duration-200 leading-snug"
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            {/* Legal content */}
            <div className="legal-content space-y-6 min-w-0 max-w-3xl">{stamped}</div>
          </div>

          {/* Inline footer links */}
          <div className="border-t border-border mt-12 pt-6 flex flex-wrap gap-x-6 gap-y-2 justify-center">
            {getFooterLinks().map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans relative overflow-hidden bg-background text-foreground">
      {/* Subtle concrete-texture grid overlay — matches landing page */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 0 0 L 60 0 L 60 60' fill='none' stroke='%23ffffff' stroke-width='0.4'/%3E%3C/svg%3E")`,
          opacity: 0.025,
        }}
      />

      {/* Header bar */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "color-mix(in srgb, var(--background) 92%, transparent)",
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.18em] transition-colors duration-200"
            style={{ color: "var(--primary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--primary)")}
            aria-label="Go back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <Link to="/" className="flex items-center gap-2" aria-label="Home">
            <img src="/opus-form-primary-dark.svg" alt="Opus Form" className="h-8 w-auto" />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-10 pb-20 relative z-10">
        {/* Title block */}
        <div
          className="mb-10 sm:mb-12 transition-all duration-700 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
          }}
        >
          <h1
            className="text-[22px] sm:text-[26px] font-bold tracking-tight leading-tight"
            style={{ color: "var(--foreground)" }}
          >
            {title}
          </h1>
          <p
            className="text-[11px] font-mono uppercase tracking-[0.15em] mt-2"
            style={{ color: "var(--muted-foreground)" }}
          >
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px mb-8" style={{ backgroundColor: "var(--border)" }} />

        <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
          {/* Section nav */}
          {toc.length > 0 && (
            <nav className="hidden lg:block sticky top-24 self-start">
              <span
                className="block text-[10px] font-mono font-bold uppercase tracking-[0.18em] mb-3"
                style={{ color: "var(--muted-foreground)" }}
              >
                On this page
              </span>
              <ul className="space-y-2">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      onClick={(e) => scrollToSection(e, item.id)}
                      className="block text-[11px] font-medium transition-colors duration-200 leading-snug"
                      style={{ color: "var(--muted-foreground)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "var(--muted-foreground)")
                      }
                    >
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Legal content */}
          <div
            className="legal-content space-y-8 min-w-0 max-w-3xl transition-all duration-700 ease-out"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(16px)",
            }}
          >
            {stamped}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="w-full z-20 px-8 pb-7 pt-5 relative"
        style={{
          borderTop: "1px solid var(--border)",
          opacity: footerVisible ? 1 : 0,
          transition: "opacity 500ms ease-out",
        }}
      >
        {/* Legal links row */}
        <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-x-5 gap-y-2 mb-4">
          {getFooterLinks().map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Company details + contact */}
        <div
          className="flex flex-col lg:flex-row justify-center items-center gap-x-2 gap-y-1.5 text-[9px] font-mono uppercase text-muted-foreground/80 text-center max-w-xl lg:max-w-none mx-auto"
          style={{ letterSpacing: "0.15em" }}
        >
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
            <span>Opus Form Ltd</span>
            <span>·</span>
            <span>Company No. 17228356</span>
            <span>·</span>
            <span className="text-center">128 City Road, London, EC1V 2NX</span>
          </div>
          <span className="hidden lg:inline">·</span>
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
            <a
              href="mailto:admin@opusform.co.uk"
              className="hover:text-primary transition-colors duration-200"
            >
              admin@opusform.co.uk
            </a>
            <span>·</span>
            <span>© {new Date().getFullYear()} All Rights Reserved</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

/* Reusable sub-components for consistent legal page formatting */

export const Section: React.FC<{ title: string; children: React.ReactNode; id?: string }> = ({
  title,
  children,
  id,
}) => (
  <section id={id} style={{ scrollMarginTop: "6rem" }}>
    <h2
      className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] mb-4"
      style={{ color: "var(--primary)" }}
    >
      {title}
    </h2>
    <div
      className="space-y-3 text-[13px] leading-relaxed"
      style={{ color: "var(--muted-foreground)" }}
    >
      {children}
    </div>
  </section>
);

export const DataTable: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
    <table className="w-full text-[12px]">
      <thead>
        <tr style={{ backgroundColor: "var(--card)" }}>
          {headers.map((h, i) => (
            <th
              key={i}
              className="text-left px-4 py-2.5 font-mono font-bold uppercase tracking-wider border-b"
              style={{ color: "var(--primary)", borderColor: "var(--border)", fontSize: "10px" }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr
            key={ri}
            style={{ borderColor: "var(--border)" }}
            className={ri < rows.length - 1 ? "border-b" : ""}
          >
            {row.map((cell, ci) => (
              <td key={ci} className="px-4 py-2.5" style={{ color: "var(--muted-foreground)" }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
