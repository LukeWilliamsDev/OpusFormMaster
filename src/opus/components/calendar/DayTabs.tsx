import React from "react";
import { WeekDay } from "../../utils/week";

interface DayTabsProps {
  weekDays: WeekDay[];
  selectedDate: string;
  onSelect: (date: string) => void;
}

export const DayTabs: React.FC<DayTabsProps> = ({ weekDays, selectedDate, onSelect }) => (
  <div className="grid grid-cols-5 gap-1.5">
    {weekDays.map((day) => {
      const isActive = selectedDate === day.date;
      return (
        <button
          key={day.date}
          type="button"
          onClick={() => onSelect(day.date)}
          className={`py-2 text-center rounded-lg border transition-all cursor-pointer ${
            isActive
              ? "bg-primary border-primary text-white shadow-md"
              : "bg-card border-border text-gray-400 hover:text-foreground"
          }`}
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
