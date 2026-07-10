// @ts-nocheck
import React, { useEffect, useState } from 'react';

interface LandingPageProps {
  onNavigateToPortal: () => void;
}

// Logo loaded from public asset

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToPortal }) => {
  const [visible, setVisible] = useState(false);
  const [lineVisible, setLineVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 150);
    const t2 = setTimeout(() => setLineVisible(true), 700);
    const t3 = setTimeout(() => setSubtitleVisible(true), 1050);
    const t4 = setTimeout(() => setFooterVisible(true), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <div
      id="opus-landing-root"
      className="min-h-screen flex flex-col justify-between relative overflow-hidden font-sans"
      style={{ backgroundColor: "#1A1B1E" }}
    >
      {/* Subtle concrete-texture grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 0 0 L 60 0 L 60 60' fill='none' stroke='%23ffffff' stroke-width='0.4'/%3E%3C/svg%3E")`,
          opacity: 0.025,
        }}
      />

      {/* Portal access — discreet top-right */}
      <header className="w-full flex justify-end items-center z-20 px-8 pt-7">
        <button
          onClick={onNavigateToPortal}
          className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-all duration-300"
          style={{ color: '#526E8C' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#F4F4F0')}
          onMouseLeave={e => (e.currentTarget.style.color = '#526E8C')}
          aria-label="Portal Access"
        >
          Portal Access
        </button>
      </header>

      {/* Main centred content */}
      <main className="flex-grow flex flex-col items-center justify-center z-10 px-6">

        {/* Logo image — fades and rises in */}
        <div
          className="transition-all duration-700 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            maxWidth: '480px',
            width: '100%',
          }}
        >
          <img
            src="/opus-form-primary.svg"
            alt="Opus Form"
            style={{ width: '100%', height: 'auto', display: 'block' }}
            draggable={false}
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Subtitle — fades up */}
        <p
          className="mt-4 text-center font-mono font-bold uppercase text-[11px]"
          style={{
            color: '#526E8C',
            letterSpacing: '0.3em',
            opacity: subtitleVisible ? 1 : 0,
            transform: subtitleVisible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 500ms ease-out, transform 500ms ease-out',
          }}
        >
          Coming Soon
        </p>

      </main>

      {/* Footer */}
      <footer
        className="w-full flex flex-col sm:flex-row justify-center items-center gap-3 z-20 px-8 pb-7 pt-4 text-[9px] font-mono font-bold uppercase"
        style={{
          borderTop: '1px solid #2e2e33',
          color: '#3d3d44',
          letterSpacing: '0.18em',
          opacity: footerVisible ? 1 : 0,
          transition: 'opacity 500ms ease-out',
        }}
      >
        <a
          href="mailto:admin@opusform.co.uk"
          style={{ color: '#3d3d44', transition: 'color 200ms' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#526E8C')}
          onMouseLeave={e => (e.currentTarget.style.color = '#3d3d44')}
        >
          admin@opusform.co.uk
        </a>
      </footer>
    </div>
  );
};
