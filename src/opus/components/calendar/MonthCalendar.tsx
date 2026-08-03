import React, { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { CalendarEvent, Job, Worker, ScheduledShift } from "../../types/erp";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  formatDayHeading,
  formatUKDate,
  parseLocalISODate,
  toLocalISODate,
} from "../../utils/week";
import { useDaySchedule } from "../../hooks/useDaySchedule";
import { useShiftActions } from "../../hooks/useShiftActions";
import { useCalendarEventActions } from "../../hooks/useCalendarEventActions";
import { AssignSheet, AssignTarget } from "./AssignSheet";
import { getJobColorClasses } from "./jobColors";

interface MonthCalendarProps {
  jobs: Job[];
  workers: Worker[];
  shifts: ScheduledShift[];
  setShifts: React.Dispatch<React.SetStateAction<ScheduledShift[]>>;
  calendarEvents: CalendarEvent[];
  setCalendarEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  month: string; // YYYY-MM-DD, any date within the displayed month
  onChangeMonth: (month: string) => void;
}

const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MAX_CHIPS_PER_CELL = 3;

const SITE_AMBER = "bg-amber-600 text-white shadow-amber-600/20";
const SITE_STONE = "bg-card text-muted-foreground hover:text-foreground hover:bg-background";
const SITE_BORDER = "border-border";
const SITE_EVENT = "bg-sky-600/10 text-sky-700 dark:text-sky-300 border-sky-600/40";

interface EventFormState {
  id?: string;
  title: string;
  description: string;
  date: string;
}

interface DayCell {
  date: string;
  dayNum: number;
  inMonth: boolean;
}

const buildMonthGrid = (anchorISO: string): DayCell[] => {
  const anchor = parseLocalISODate(anchorISO);
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const firstDow = firstOfMonth.getDay(); // 0=Sun..6=Sat
  const leading = firstDow === 0 ? 6 : firstDow - 1; // days from Monday
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - leading);

  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    cells.push({
      date: toLocalISODate(d),
      dayNum: d.getDate(),
      inMonth: d.getMonth() === anchor.getMonth(),
    });
  }
  return cells;
};

export const MonthCalendar: React.FC<MonthCalendarProps> = ({
  jobs,
  workers,
  shifts,
  setShifts,
  calendarEvents,
  setCalendarEvents,
  month,
  onChangeMonth,
}) => {
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [pickingJobFor, setPickingJobFor] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [eventForm, setEventForm] = useState<EventFormState | null>(null);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  const [shiftToRemove, setShiftToRemove] = useState<ScheduledShift | null>(null);

  const { assignWorker, confirmReallocate, removeShift } = useShiftActions(
    workers,
    jobs,
    shifts,
    setShifts,
  );
  const { addEvent, updateEvent, deleteEvent } = useCalendarEventActions(setCalendarEvents);
  const assignSheetDate = assignTarget?.date ?? detailDate ?? month;
  const assignSchedule = useDaySchedule(workers, jobs, shifts, assignSheetDate, "");

  const anchor = parseLocalISODate(month);
  const todayISO = toLocalISODate(new Date());
  const cells = useMemo(() => buildMonthGrid(month), [month]);

  const jobsById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);
  const workersById = useMemo(() => new Map(workers.map((w) => [w.id, w])), [workers]);

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, ScheduledShift[]>();
    for (const shift of shifts) {
      const list = map.get(shift.date);
      if (list) list.push(shift);
      else map.set(shift.date, [shift]);
    }
    return map;
  }, [shifts]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of calendarEvents) {
      const list = map.get(event.date);
      if (list) list.push(event);
      else map.set(event.date, [event]);
    }
    return map;
  }, [calendarEvents]);

  const jobsForDate = (date: string): Job[] => {
    const dayShifts = shiftsByDate.get(date) ?? [];
    const seen = new Set<string>();
    const result: Job[] = [];
    for (const shift of dayShifts) {
      if (seen.has(shift.jobId)) continue;
      seen.add(shift.jobId);
      const job = jobsById.get(shift.jobId);
      if (job) result.push(job);
    }
    return result;
  };

  const handleNavigateMonth = (delta: number) => {
    const next = new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1);
    onChangeMonth(toLocalISODate(next));
  };

  const detailShifts = detailDate ? (shiftsByDate.get(detailDate) ?? []) : [];
  const detailEvents = detailDate ? (eventsByDate.get(detailDate) ?? []) : [];
  const activeJobs = jobs.filter((j) => j.status !== "completed");

  const closeDetail = () => {
    setDetailDate(null);
    setPickingJobFor(null);
    setEventForm(null);
  };

  const openNewEventForm = () => {
    if (!detailDate) return;
    setEventForm({ title: "", description: "", date: detailDate });
  };

  const openEditEventForm = (event: CalendarEvent) => {
    setEventForm({
      id: event.id,
      title: event.title,
      description: event.description ?? "",
      date: event.date,
    });
  };

  const saveEventForm = () => {
    if (!eventForm || !eventForm.title.trim()) return;
    if (eventForm.id) {
      updateEvent(eventForm.id, {
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || undefined,
        date: eventForm.date,
      });
    } else {
      addEvent(eventForm.title.trim(), eventForm.date, eventForm.description.trim() || undefined);
    }
    setEventForm(null);
  };

  const handleAddStaffClick = () => {
    if (!detailDate) return;
    if (activeJobs.length === 1) {
      setAssignTarget({ mode: "pickWorker", job: activeJobs[0], date: detailDate });
      return;
    }
    setPickingJobFor(detailDate);
  };

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black uppercase tracking-widest text-foreground">
          {MONTH_LONG[anchor.getMonth()]} {anchor.getFullYear()}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleNavigateMonth(-1)}
            className={`p-2 rounded-xl border-2 ${SITE_BORDER} ${SITE_STONE} transition-colors cursor-pointer`}
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onChangeMonth(toLocalISODate(new Date()))}
            className={`px-3.5 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl border-2 ${SITE_BORDER} ${SITE_STONE} transition-colors cursor-pointer`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handleNavigateMonth(1)}
            className={`p-2 rounded-xl border-2 ${SITE_BORDER} ${SITE_STONE} transition-colors cursor-pointer`}
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-full">
        <div className={`w-full border-2 ${SITE_BORDER} rounded-xl overflow-hidden`}>
          <div className={`grid grid-cols-7 border-b-2 ${SITE_BORDER} bg-card`}>
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="px-1 sm:px-2 py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-muted-foreground text-center"
              >
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.slice(0, 1)}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((cell, idx) => {
              const cellJobs = jobsForDate(cell.date);
              const overflow = cellJobs.length - MAX_CHIPS_PER_CELL;
              const cellEvents = eventsByDate.get(cell.date) ?? [];
              const isToday = cell.date === todayISO;
              const hasActivity = cellJobs.length > 0 || cellEvents.length > 0;
              return (
                <div
                  key={cell.date}
                  onClick={() => setDetailDate(cell.date)}
                  className={`min-h-[70px] sm:min-h-[100px] p-1 sm:p-1.5 border-b-2 ${SITE_BORDER} ${
                    (idx + 1) % 7 !== 0 ? `border-r-2 ${SITE_BORDER}` : ""
                  } ${cell.inMonth ? "bg-background hover:bg-card/40" : "bg-card/50"} flex flex-col gap-1 cursor-pointer transition-colors`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[10px] sm:text-xs font-bold ${
                        isToday
                          ? SITE_AMBER
                          : cell.inMonth
                            ? "text-foreground"
                            : "text-muted-foreground/50"
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    {/* Mobile compact activity dot indicator */}
                    {hasActivity && (
                      <div className="flex md:hidden items-center gap-0.5">
                        {cellJobs.length > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        )}
                        {cellEvents.length > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="hidden md:flex flex-col gap-1">
                    {cellJobs.slice(0, MAX_CHIPS_PER_CELL).map((job) => {
                      const colors = getJobColorClasses(job.id);
                      return (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() => setDetailDate(cell.date)}
                          className={`truncate text-left text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${colors.bg} cursor-pointer`}
                          title={job.siteName}
                        >
                          {job.siteName}
                        </button>
                      );
                    })}
                    {overflow > 0 && (
                      <button
                        type="button"
                        onClick={() => setDetailDate(cell.date)}
                        className="text-left text-[10px] font-bold text-muted-foreground hover:text-foreground px-1.5 cursor-pointer"
                      >
                        +{overflow} more
                      </button>
                    )}
                    {cellEvents.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setDetailDate(cell.date)}
                        className={`flex items-center gap-1 truncate text-left text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${SITE_EVENT} cursor-pointer`}
                        title={cellEvents.map((e) => e.title).join(", ")}
                      >
                        <CalendarDays className="size-3 shrink-0" />
                        {cellEvents.length === 1
                          ? cellEvents[0].title
                          : `${cellEvents.length} events`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {detailDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeDetail}
        >
          <div
            className={`w-full max-w-md max-h-[80vh] overflow-y-auto rounded-xl border-2 ${SITE_BORDER} bg-background p-5 space-y-3`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
                {formatDayHeading(detailDate)}
              </h3>
              <button
                type="button"
                onClick={closeDetail}
                className="p-1 rounded-lg hover:bg-card cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailShifts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No shifts scheduled.</p>
            ) : (
              <ul className="space-y-2">
                {detailShifts.map((shift) => {
                  const job = jobsById.get(shift.jobId);
                  const worker = workersById.get(shift.workerId);
                  const colors = job ? getJobColorClasses(job.id) : null;
                  return (
                    <li
                      key={shift.id}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${SITE_BORDER}`}
                    >
                      <span className="text-xs font-semibold text-foreground">
                        {worker?.name ?? "Unknown"}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {job && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${colors?.bg}`}
                          >
                            {job.siteName}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setShiftToRemove(shift)}
                          className="p-1 rounded-md text-muted-foreground hover:text-red-500 cursor-pointer"
                          aria-label="Remove shift"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="space-y-2 pt-1 border-t border-border/60">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Events
                </p>
                {!eventForm && (
                  <button
                    type="button"
                    onClick={openNewEventForm}
                    className="flex items-center gap-1 text-[11px] font-black text-amber-500 hover:text-amber-400 uppercase tracking-wider cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Event
                  </button>
                )}
              </div>
              {detailEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">No events.</p>
              ) : (
                <ul className="space-y-2">
                  {detailEvents.map((event) => (
                    <li
                      key={event.id}
                      className={`flex items-start justify-between gap-2 px-3 py-2 rounded-lg border ${SITE_BORDER}`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {event.title}
                        </p>
                        {event.description && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditEventForm(event)}
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                          aria-label="Edit event"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEventToDelete(event)}
                          className="p-1 rounded-md text-muted-foreground hover:text-red-500 cursor-pointer"
                          aria-label="Delete event"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {eventForm && (
                <div className={`space-y-2 p-3 rounded-lg border ${SITE_BORDER}`}>
                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    placeholder="Event title"
                    className={`w-full text-xs px-2.5 py-1.5 rounded-lg border-2 ${SITE_BORDER} bg-background text-foreground`}
                  />
                  <textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    placeholder="Description (optional)"
                    rows={2}
                    className={`w-full text-xs px-2.5 py-1.5 rounded-lg border-2 ${SITE_BORDER} bg-background text-foreground resize-none`}
                  />
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className={`w-full text-xs px-2.5 py-1.5 rounded-lg border-2 ${SITE_BORDER} bg-background text-foreground`}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={saveEventForm}
                      disabled={!eventForm.title.trim()}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-amber-600 text-white text-[11px] font-black uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {eventForm.id ? "Save" : "Add"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventForm(null)}
                      className={`px-2.5 py-1.5 rounded-lg border-2 ${SITE_BORDER} ${SITE_STONE} text-[11px] font-black uppercase tracking-wider cursor-pointer`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AssignSheet
        target={assignTarget}
        jobs={jobs}
        schedule={assignSchedule}
        onAssign={(workerId, jobId) => assignWorker(workerId, jobId, assignSheetDate)}
        onConfirmReallocate={(workerId, jobId, existingShiftId) =>
          confirmReallocate(workerId, jobId, assignSheetDate, existingShiftId)
        }
        onClose={() => setAssignTarget(null)}
      />

      {/* --- CONFIRM EVENT DELETION --- */}
      <ConfirmDialog
        open={!!eventToDelete}
        onOpenChange={(open) => {
          if (!open) setEventToDelete(null);
        }}
        tone="destructive"
        tag="Delete Calendar Event"
        title="Remove Event?"
        message={`Are you sure you want to delete "${eventToDelete?.title}" on ${formatUKDate(eventToDelete?.date)}?`}
        confirmLabel="Delete Event"
        cancelLabel="Keep Event"
        onConfirm={() => {
          if (eventToDelete) {
            deleteEvent(eventToDelete.id);
            setEventToDelete(null);
          }
        }}
      />

      {/* --- CONFIRM SHIFT REMOVAL --- */}
      <ConfirmDialog
        open={!!shiftToRemove}
        onOpenChange={(open) => {
          if (!open) setShiftToRemove(null);
        }}
        tone="destructive"
        tag="Remove Shift Assignment"
        title="Remove Shift?"
        message={`Are you sure you want to remove this shift assignment for ${
          workersById.get(shiftToRemove?.workerId || "")?.name ?? "Operative"
        } on ${formatUKDate(shiftToRemove?.date)}?`}
        confirmLabel="Remove Shift"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (shiftToRemove) {
            removeShift(shiftToRemove.id);
            setShiftToRemove(null);
          }
        }}
      />
    </div>
  );
};
