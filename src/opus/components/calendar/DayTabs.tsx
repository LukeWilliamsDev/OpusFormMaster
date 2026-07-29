import React from "react";
import { WeekDay } from "../../utils/week";

interface DayTabsProps {
  weekDays: WeekDay[];
  selectedDate: string;
  onSelect: (date: string) => void;
}

// Site office design constants
const SITE_ACTIVE = "bg-amber-600 border-amber-600 text-white shadow-amber-600/20";
const SITE_INACTIVE = "bg-stone-100 dark:bg-slate-800 border-stone-200 dark:border-slate-700 text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-200 dark:hover:bg-slate-700";

export const DayTabs: React.FC<DayTabsProps> = ({ weekDays, selectedDate, onSelect }) => (
  <div className="grid grid-cols-5 gap-1.5">
    {weekDays.map((day) => {
      const isActive = selectedDate === day.date;
      return (
        <button
          key={day.date}
          type="button"
          onClick={() => onSelect(day.date)}
          className={`py-1.5 text-center rounded-lg border-2 transition-all cursor-pointer ${isActive ? SITE_ACTIVE : SITE_INACTIVE}`}
        >
          <div className="text-[11px] font-black uppercase tracking-wider leading-none">
            {day.shortName}
          </div>
          <div className="text-[11px] font-bold font-mono mt-1">{day.date.split("-")[2]}</div>
        </button>
      );
    })}
  </div>
);