import React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { WeekDay, formatWeekRange } from "../../utils/week";

interface WeekHeaderProps {
  weekDays: WeekDay[];
  onNavigate: (deltaWeeks: number) => void;
}

export const WeekHeader: React.FC<WeekHeaderProps> = ({ weekDays, onNavigate }) => {
  // Site office design constants
  const SITE_AMBER = "bg-amber-600 text-white shadow-amber-600/20 hover:bg-amber-700";
  const SITE_STONE =
    "bg-stone-100 dark:bg-slate-800 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-200 dark:hover:bg-slate-700";
  const SITE_BORDER = "border-stone-200 dark:border-slate-700";

  return (
    <div
      className={`flex items-center justify-between px-3 py-2 rounded-xl border-2 ${SITE_BORDER} bg-white dark:bg-slate-900`}
    >
      <button
        type="button"
        onClick={() => onNavigate(-1)}
        aria-label="Previous week"
        className={`min-w-[44px] min-h-[44px] 2xl:min-w-[32px] 2xl:min-h-[32px] flex items-center justify-center rounded-lg transition-all cursor-pointer ${SITE_STONE} ${SITE_BORDER}`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2">
        <CalendarIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <span className="text-[11px] font-black text-stone-900 dark:text-white uppercase tracking-widest whitespace-nowrap">
          {formatWeekRange(weekDays)}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onNavigate(1)}
        aria-label="Next week"
        className={`min-w-[44px] min-h-[44px] 2xl:min-w-[32px] 2xl:min-h-[32px] flex items-center justify-center rounded-lg transition-all cursor-pointer ${SITE_STONE} ${SITE_BORDER}`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
