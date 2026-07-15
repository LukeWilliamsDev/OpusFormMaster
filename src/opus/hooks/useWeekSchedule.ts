import { useMemo } from "react";
import { Job, Worker, ScheduledShift } from "../types/erp";
import { WeekDay } from "../utils/week";
import { computeDaySchedule, DaySchedule } from "./useDaySchedule";

/** Derives the schedule for every day in weekDays at once, keyed by ISO date. */
export const useWeekSchedule = (
  workers: Worker[],
  jobs: Job[],
  shifts: ScheduledShift[],
  weekDays: WeekDay[],
  searchQuery: string,
): Map<string, DaySchedule> =>
  useMemo(() => {
    const map = new Map<string, DaySchedule>();
    for (const day of weekDays) {
      map.set(day.date, computeDaySchedule(workers, jobs, shifts, day.date, searchQuery));
    }
    return map;
  }, [workers, jobs, shifts, weekDays, searchQuery]);
