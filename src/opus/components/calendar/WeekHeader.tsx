import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WeekDay, formatWeekRange } from "../../utils/week";

interface WeekHeaderProps {
  weekDays: WeekDay[];
  onNavigate: (deltaWeeks: number) => void;
}

export const WeekHeader: React.FC<WeekHeaderProps> = ({ weekDays, onNavigate }) => (
  <div className="flex items-center justify-between bg-[#1a1a1e] border border-[#2a2a30] rounded-xl px-2 py-1.5">
    <button
      type="button"
      onClick={() => onNavigate(-1)}
      aria-label="Previous week"
      className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-[#2a2a2a] text-[#888] hover:text-white rounded-lg transition-colors cursor-pointer"
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
      className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-[#2a2a2a] text-[#888] hover:text-white rounded-lg transition-colors cursor-pointer"
    >
      <ChevronRight className="w-4 h-4" />
    </button>
  </div>
);
