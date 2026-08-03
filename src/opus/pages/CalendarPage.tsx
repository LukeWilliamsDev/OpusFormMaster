import React from "react";
import { useSearchParams } from "react-router-dom";
import { usePortal } from "../context/PortalContext";
import { MonthCalendar } from "../components/calendar/MonthCalendar";
import { isValidISODate, toLocalISODate } from "../utils/week";

export const CalendarPage: React.FC = () => {
  const { jobs, workers, shifts, setShifts, calendarEvents, setCalendarEvents } = usePortal();
  const [searchParams, setSearchParams] = useSearchParams();

  const dateParam = searchParams.get("date");
  const month = isValidISODate(dateParam) ? dateParam : toLocalISODate(new Date());

  const handleChangeMonth = (nextMonth: string) => {
    setSearchParams({ date: nextMonth }, { replace: true });
  };

  return (
    <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto animate-fade-in space-y-6">
      <MonthCalendar
        jobs={jobs}
        workers={workers}
        shifts={shifts}
        setShifts={setShifts}
        calendarEvents={calendarEvents}
        setCalendarEvents={setCalendarEvents}
        month={month}
        onChangeMonth={handleChangeMonth}
      />
    </div>
  );
};
