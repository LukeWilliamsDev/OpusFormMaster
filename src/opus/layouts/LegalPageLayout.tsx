// @ts-nocheck
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { usePortal } from '../context/PortalContext';

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
export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({ title, lastUpdated, children }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = usePortal();

  const getFooterLinks = () => {
    if (isAuthenticated) {
      return [
        { label: 'Staff Privacy Notice', path: '/portal/privacy' },
        { label: 'Usage Policy', path: '/portal/terms' },
        { label: 'Acceptable Use', path: '/portal/acceptable-use' },
        { label: 'Cookie Statement', path: '/portal/cookies' },
      ];
    }
    return [
      { label: 'Staff Privacy Notice', path: '/privacy' },
      { label: 'Usage Policy', path: '/portal/terms' },
      { label: 'Acceptable Use', path: '/portal/acceptable-use' },
      { label: 'Cookie Statement', path: '/cookies' },
    ];
  };

  if (isAuthenticated) {
    return (
      <div className="flex-1 min-h-0 bg-background text-foreground overflow-y-auto px-4 sm:px-6 py-6 pb-20">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb style back action */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.18em] transition-colors duration-200 mb-6"
            style={{ color: '#6C8295' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#F4F4F0')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6C8295')}
            aria-label="Go back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to previous page
          </button>

          {/* Title block */}
          <div className="mb-6">
            <div className="flex items-center gap-2.5 mb-2.5">
              <Shield className="w-4 h-4 text-[#6C8295]" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-[#6C8295]">
                Internal Legal & Compliance
              </span>
            </div>
            <h1 className="text-[20px] sm:text-[24px] font-bold tracking-tight text-foreground leading-tight">
              {title}
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] mt-1 text-[#555558]">
              Last updated: {lastUpdated}
            </p>
          </div>

          <div className="h-px mb-6 bg-border" />

          {/* Legal content */}
          <div className="legal-content space-y-6">
            {children}
          </div>

          {/* Inline footer links */}
          <div className="border-t border-border mt-12 pt-6 flex flex-wrap gap-x-6 gap-y-2 justify-center">
            {getFooterLinks().map(link => (
              <Link
                key={link.path}
                to={link.path}
                className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-[#888888] hover:text-[#6C8295] transition-colors duration-200"
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
    <div className="min-h-screen font-sans" style={{ backgroundColor: '#111114', color: '#d4d4d8' }}>
      {/* Header bar */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{ borderColor: '#2a2a30', backgroundColor: 'rgba(17,17,20,0.92)' }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.18em] transition-colors duration-200"
            style={{ color: '#6C8295' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#F4F4F0')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6C8295')}
            aria-label="Go back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <Link
            to="/"
            className="flex items-center gap-2"
            aria-label="Home"
          >
            <img src="/opus-form-primary.svg" alt="Opus Form" className="h-6 w-auto" />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-10 pb-20">
        {/* Title block */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-3">
            <Shield className="w-4 h-4" style={{ color: '#6C8295' }} />
            <span
              className="text-[10px] font-mono font-bold uppercase tracking-[0.22em]"
              style={{ color: '#6C8295' }}
            >
              Legal & Compliance
            </span>
          </div>
          <h1
            className="text-[22px] sm:text-[26px] font-bold tracking-tight leading-tight"
            style={{ color: '#F4F4F0' }}
          >
            {title}
          </h1>
          <p
            className="text-[11px] font-mono uppercase tracking-[0.15em] mt-2"
            style={{ color: '#5a5a62' }}
          >
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px mb-8" style={{ backgroundColor: '#2a2a30' }} />

        {/* Legal content */}
        <div className="legal-content space-y-8">
          {children}
        </div>
      </main>

      {/* Footer nav links */}
      <footer
        className="border-t py-6"
        style={{ borderColor: '#2a2a30', backgroundColor: '#0d0d10' }}
      >
        <div className="max-w-3xl mx-auto px-6 flex flex-wrap gap-x-6 gap-y-2 justify-center">
          {getFooterLinks().map(link => (
            <Link
              key={link.path}
              to={link.path}
              className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] transition-colors duration-200"
              style={{ color: '#3d3d44' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#6C8295')}
              onMouseLeave={e => (e.currentTarget.style.color = '#3d3d44')}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
};

/* Reusable sub-components for consistent legal page formatting */

export const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <h2
      className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] mb-4"
      style={{ color: '#6C8295' }}
    >
      {title}
    </h2>
    <div className="space-y-3 text-[13px] leading-relaxed" style={{ color: '#a1a1aa' }}>
      {children}
    </div>
  </section>
);

export const DataTable: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto rounded-lg border" style={{ borderColor: '#2a2a30' }}>
    <table className="w-full text-[12px]">
      <thead>
        <tr style={{ backgroundColor: '#1a1a1e' }}>
          {headers.map((h, i) => (
            <th
              key={i}
              className="text-left px-4 py-2.5 font-mono font-bold uppercase tracking-wider border-b"
              style={{ color: '#6C8295', borderColor: '#2a2a30', fontSize: '10px' }}
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
            style={{ borderColor: '#2a2a30' }}
            className={ri < rows.length - 1 ? 'border-b' : ''}
          >
            {row.map((cell, ci) => (
              <td key={ci} className="px-4 py-2.5" style={{ color: '#a1a1aa' }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
