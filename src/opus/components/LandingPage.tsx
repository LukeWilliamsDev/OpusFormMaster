// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { usePortal } from "../context/PortalContext";

interface LandingPageProps {
  onNavigateToPortal: () => void;
}

// Logo loaded from public asset

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToPortal }) => {
  const { theme, setTheme } = usePortal();
  const [visible, setVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 100);
    const t2 = setTimeout(() => setFooterVisible(true), 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div
      id="opus-landing-root"
      className="min-h-screen flex flex-col justify-between relative overflow-hidden font-sans bg-background"
    >
      {/* Static blueprint-style grid overlay, with occasional accent points at intersections */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 80 0 L 0 0 L 0 80' fill='none' stroke='%23${
            theme === "light" ? "2B2F33" : "EDEBE6"
          }' stroke-width='0.5'/%3E%3Ccircle cx='0' cy='0' r='1.3' fill='%23B5651D'/%3E%3C/svg%3E")`,
          opacity: theme === "light" ? 0.18 : 0.1,
        }}
      />

      {/* Theme toggle + Portal access — discreet top-right */}
      <header className="w-full flex justify-end items-center gap-5 z-20 px-8 pt-7">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="transition-colors duration-300 text-muted-foreground hover:text-primary"
          aria-label="Toggle light/dark theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={onNavigateToPortal}
          className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-all duration-300"
          style={{ color: "var(--primary)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--primary)")}
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
            transform: visible ? "translateY(0)" : "translateY(16px)",
            maxWidth: "480px",
            width: "100%",
          }}
        >
          <img
            src={theme === "light" ? "/opus-form-primary-light.svg" : "/opus-form-primary-dark.svg"}
            alt="Opus Form"
            style={{ width: "100%", height: "auto" }}
            draggable={false}
            referrerPolicy="no-referrer"
          />
        </div>
      </main>

      {/* Footer */}
      <footer
        className="w-full z-20 px-8 pb-7 pt-5"
        style={{
          borderTop: "1px solid var(--border)",
          opacity: footerVisible ? 1 : 0,
          transition: "opacity 500ms ease-out",
        }}
      >
        {/* Legal links row */}
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-4">
          {[
            { label: "Privacy Notice", path: "#/privacy" },
            { label: "Cookies", path: "#/cookies" },
            { label: "Modern Slavery", path: "#/modern-slavery" },
          ].map((link) => (
            <a
              key={link.path}
              href={link.path}
              className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Company details + contact */}
        <div
          className="flex flex-col lg:flex-row justify-center items-center gap-x-2 gap-y-1.5 text-[9px] font-mono font-semibold uppercase text-muted-foreground/80 text-center max-w-xl lg:max-w-none mx-auto"
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
