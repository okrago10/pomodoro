import { localCalendar, parseDayKey, type Calendar } from "../timer/calendar.ts";
import { floorToMinuteMs } from "../timer/format.ts";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function weekdayLabel(dayKey: string, calendar: Calendar = localCalendar): string {
  return WEEKDAYS[calendar.weekdayIndex(dayKey)];
}

export function selectedDayLabel(
  dayKey: string,
  todayKey: string,
  calendar: Calendar = localCalendar,
): string {
  if (dayKey === todayKey) {
    return "今日";
  }
  if (dayKey === calendar.addDays(todayKey, -1)) {
    return "昨日";
  }
  const { month, day } = parseDayKey(dayKey);
  return `${month}/${day}`;
}

const MINUTE_MS = 60_000;
const EMPTY_BAR_PX = 4;
const MIN_FILLED_BAR_PX = 8;

export function barHeightPx(ms: number, maxMs: number, maxPx = 120): number {
  const shown = floorToMinuteMs(ms);
  const maxShown = floorToMinuteMs(maxMs);
  if (shown <= 0) {
    return EMPTY_BAR_PX;
  }
  return Math.max(MIN_FILLED_BAR_PX, Math.round((shown / Math.max(MINUTE_MS, maxShown)) * maxPx));
}
