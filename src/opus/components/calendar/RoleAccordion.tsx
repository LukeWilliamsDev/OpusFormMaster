import React from "react";
import { ChevronDown } from "lucide-react";
import { RoleCategory } from "./roleCategories";

interface RoleAccordionProps {
  category: RoleCategory;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

// Site office design constants
const SITE_ACCORDION_BG =
  "bg-stone-100 dark:bg-slate-800/50 border-2 border-stone-200 dark:border-slate-700 rounded-xl";
const SITE_ACCORDION_HEADER =
  "w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left cursor-pointer hover:bg-stone-200/50 dark:hover:bg-slate-700/50 transition-colors";
const SITE_ACCORDION_CONTENT = "px-3 pb-1 border-t border-stone-200 dark:border-slate-700";

export const RoleAccordion: React.FC<RoleAccordionProps> = ({
  category,
  count,
  isOpen,
  onToggle,
  children,
}) => {
  return (
    <div className={SITE_ACCORDION_BG}>
      <button
        type="button"
        onClick={onToggle}
        className={SITE_ACCORDION_HEADER}
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-black uppercase tracking-widest text-stone-900 dark:text-white truncate">
            {category}
          </span>
          <span className="text-[10px] font-black text-stone-500 dark:text-stone-400 shrink-0">
            ({count})
          </span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-stone-500 dark:text-stone-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && <div className={SITE_ACCORDION_CONTENT}>{children}</div>}
    </div>
  );
};
