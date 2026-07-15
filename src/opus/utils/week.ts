export interface WeekDay {
  date: string;
  dayName: string;
  shortName: string;
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SHORT_NAMES = ["MON", "TUE", "WED", "THU", "FRI"];
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
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

/** Local-timezone YYYY-MM-DD (avoids toISOString's UTC drift). */
export const toLocalISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Parse YYYY-MM-DD as a local-midnight Date. */
export const parseLocalISODate = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Monday of the week containing d (Sat/Sun map back to that week's Monday). */
export const getMonday = (d: Date): Date => {
  const result = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = result.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
};

/** Add n weeks to a YYYY-MM-DD date string. */
export const addWeeks = (isoDate: string, n: number): string => {
  const d = parseLocalISODate(isoDate);
  d.setDate(d.getDate() + n * 7);
  return toLocalISODate(d);
};

/** Mon–Fri days for the week whose Monday is anchorMonday (YYYY-MM-DD). */
export const getWeekDays = (anchorMonday: string): WeekDay[] => {
  const monday = getMonday(parseLocalISODate(anchorMonday));
  const days: WeekDay[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    days.push({
      date: toLocalISODate(d),
      dayName: DAY_NAMES[i],
      shortName: SHORT_NAMES[i],
    });
  }
  return days;
};

/** "06 Jul — 10 Jul 2026" */
export const formatWeekRange = (days: WeekDay[]): string => {
  if (days.length === 0) return "";
  const first = parseLocalISODate(days[0].date);
  const last = parseLocalISODate(days[days.length - 1].date);
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")} ${MONTH_SHORT[d.getMonth()]}`;
  return `${fmt(first)} — ${fmt(last)} ${last.getFullYear()}`;
};

/** "Monday, 06 July" */
export const formatDayHeading = (isoDate: string): string => {
  const d = parseLocalISODate(isoDate);
  const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    d.getDay()
  ];
  return `${dayName}, ${String(d.getDate()).padStart(2, "0")} ${MONTH_LONG[d.getMonth()]}`;
};

/** Today if Mon–Fri; on weekends, next Monday (the upcoming working week). */
export const defaultSelectedDay = (now: Date = new Date()): string => {
  const day = now.getDay();
  if (day >= 1 && day <= 5) return toLocalISODate(now);
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() + (day === 6 ? 2 : 1));
  return toLocalISODate(monday);
};

/** True if iso parses as a real YYYY-MM-DD calendar date. */
export const isValidISODate = (iso: string | null | undefined): iso is string => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = parseLocalISODate(iso);
  return toLocalISODate(d) === iso;
};
