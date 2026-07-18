import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WeekDay, formatWeekRange } from "../../utils/week";

interface WeekHeaderProps {
  weekDays: WeekDay[];
  onNavigate: (deltaWeeks: number) => void;
}

export const WeekHeader: React.FC<WeekHeaderProps> = ({ weekDays, onNavigate }) => (
  <div className="flex items-center justify-between bg-card border border-border rounded-xl px-2 py-1.5 2xl:py-1">
    <button
      type="button"
      onClick={() => onNavigate(-1)}
      aria-label="Previous week"
      className="min-w-[44px] min-h-[44px] 2xl:min-w-[32px] 2xl:min-h-[32px] flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
    >
      <ChevronLeft className="w-4 h-4" />
    </button>
    <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest whitespace-nowrap">
      {formatWeekRange(weekDays)}
    </span>
    <button
      type="button"
      onClick={() => onNavigate(1)}
      aria-label="Next week"
      className="min-w-[44px] min-h-[44px] 2xl:min-w-[32px] 2xl:min-h-[32px] flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
    >
      <ChevronRight className="w-4 h-4" />
    </button>
  </div>
);
