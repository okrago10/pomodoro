import { addDays, parseDayKey, weekdayIndex } from "../timer/calendar.ts";
import type { DailyTotal, RecentDailyWork } from "../timer/dailyWorkReader.ts";
import { floorToMinuteMs } from "../timer/format.ts";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function weekdayLabel(dayKey: string): string {
  return WEEKDAYS[weekdayIndex(dayKey)] ?? "";
}

export function selectedDayLabel(dayKey: string, todayKey: string): string {
  if (dayKey === todayKey) {
    return "今日";
  }
  if (dayKey === addDays(todayKey, -1)) {
    return "昨日";
  }
  const { month, day } = parseDayKey(dayKey);
  return `${month}/${day}`;
}

/**
 * 選んでいる日を決める。まだ選んでいないとき、または日付が変わって
 * 選んだ日が枠から外れたときは今日を返す。
 */
export function selectedDay(work: RecentDailyWork, pickedKey: string | null): DailyTotal {
  return (
    work.days.find((day) => day.dayKey === pickedKey) ??
    work.days.find((day) => day.dayKey === work.todayKey) ?? { dayKey: work.todayKey, ms: 0 }
  );
}

const MINUTE_MS = 60_000;
const EMPTY_BAR_PX = 4;
const MIN_FILLED_BAR_PX = 8;

/** 1 分未満は積まない。読み出し側でも切り捨て済みだが、この規則はここでも守る。 */
export function barHeightPx(ms: number, maxMs: number, maxPx = 120): number {
  const shown = floorToMinuteMs(ms);
  const maxShown = floorToMinuteMs(maxMs);
  if (shown <= 0) {
    return EMPTY_BAR_PX;
  }
  return Math.max(MIN_FILLED_BAR_PX, Math.round((shown / Math.max(MINUTE_MS, maxShown)) * maxPx));
}
