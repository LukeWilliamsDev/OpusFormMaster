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

export const RoleAccordion: React.FC<RoleAccordionProps> = ({
  category,
  count,
  isOpen,
  onToggle,
  children,
}) => {
  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left cursor-pointer hover:bg-secondary/30 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-black uppercase tracking-widest text-foreground truncate">
            {category}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground shrink-0">({count})</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && <div className="px-3 pb-1 border-t border-border">{children}</div>}
    </div>
  );
};
