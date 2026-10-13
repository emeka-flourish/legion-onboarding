import type { TimeWindow } from "@/domain/types";

export const CENTRAL = "America/Chicago";
export const MOUNTAIN = "America/Denver";
export const PROVIDER_TIME_ZONE = CENTRAL;

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = Sunday
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function localParts(date: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: WEEKDAYS[get("weekday")],
  };
}

/** The UTC instant for a wall-clock time in a time zone (handles daylight saving transitions). */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const p = localParts(new Date(guess), timeZone);
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    const diff = target - shown;
    if (diff === 0) break;
    guess += diff;
  }
  return new Date(guess);
}

/** Calendar date `days` after the local date of `from` in `timeZone`. */
export function addLocalDays(from: Date, days: number, timeZone: string) {
  const p = localParts(from, timeZone);
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), weekday: d.getUTCDay() };
}

/** Texas has two time zones: El Paso and Hudspeth counties use Mountain Time. */
export function timeZoneForTexasCity(city?: string): string {
  if (!city) return CENTRAL;
  return /el paso|hudspeth|sierra blanca|horizon city|socorro|anthony|canutillo/i.test(city) ? MOUNTAIN : CENTRAL;
}

/** Accept a browser time zone only if it is one of Texas's two zones. */
export function texasTimeZone(browserZone?: string): string {
  return browserZone === MOUNTAIN || browserZone === "America/Boise" ? MOUNTAIN : CENTRAL;
}

export function windowOf(iso: string, timeZone: string): TimeWindow {
  const p = localParts(new Date(iso), timeZone);
  if (p.weekday === 0 || p.weekday === 6) return "weekend";
  if (p.hour < 12) return "weekday_morning";
  if (p.hour < 17) return "weekday_afternoon";
  return "weekday_evening";
}

/** Always includes the zone abbreviation, e.g. "Tue, Oct 13, 6:30 PM CDT". */
export function formatSlot(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

/** "6:30 PM", for time buttons that sit under a label naming the zone. */
export function formatClock(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function formatDay(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" }).format(
    new Date(iso),
  );
}

/** "Tuesday, October 13 at 6:00 PM CDT", for the booking review and the visit card. */
export function formatSlotLong(iso: string, timeZone: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "long", day: "numeric" }).format(d);
  return `${day} at ${formatTime(iso, timeZone)}`;
}

/** "Central Time" or "Mountain Time", for the "times are shown in" line. */
export function zoneName(timeZone: string): string {
  return timeZone === MOUNTAIN ? "Mountain Time" : timeZone === CENTRAL ? "Central Time" : timeZone.replace(/_/g, " ");
}

export function zoneAbbreviation(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" }).formatToParts(new Date(iso));
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
}

export const WINDOW_LABEL: Record<TimeWindow, string> = {
  weekday_morning: "weekday mornings",
  weekday_afternoon: "weekday afternoons",
  weekday_evening: "weekday evenings",
  weekend: "weekends",
};

export const WINDOW_SHORT: Record<TimeWindow, string> = {
  weekday_morning: "morning",
  weekday_afternoon: "afternoon",
  weekday_evening: "evening",
  weekend: "weekend",
};
