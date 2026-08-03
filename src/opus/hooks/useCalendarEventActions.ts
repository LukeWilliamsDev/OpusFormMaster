import { useCallback } from "react";
import { CalendarEvent } from "../types/erp";

/**
 * Mutations against the calendar_events table. Writes go through
 * setCalendarEvents, so persistence flows through PortalContext's existing
 * sync effects (mirrors useShiftActions/setShifts).
 */
export const useCalendarEventActions = (
  setCalendarEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>,
) => {
  const addEvent = useCallback(
    (title: string, date: string, description?: string, jobId?: string) => {
      const event: CalendarEvent = {
        id: crypto.randomUUID(),
        title,
        date,
        description,
        jobId,
      };
      setCalendarEvents((prev) => [...prev, event]);
    },
    [setCalendarEvents],
  );

  const updateEvent = useCallback(
    (id: string, patch: Partial<Omit<CalendarEvent, "id">>) => {
      setCalendarEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    },
    [setCalendarEvents],
  );

  const deleteEvent = useCallback(
    (id: string) => {
      setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
    },
    [setCalendarEvents],
  );

  return { addEvent, updateEvent, deleteEvent };
};
