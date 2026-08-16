import { floorToMinuteMs } from "../timer/format.ts";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

function parts(dayKey: string): { year: number; month: number; day: number } {
  const [year, month, day] = dayKey.split("-").map(Number);
  return { year, month, day };
}

export function weekdayLabel(dayKey: string): string {
  const { year, month, day } = parts(dayKey);
  return WEEKDAYS[new Date(year, month - 1, day).getDay()];
}

export function selectedDayLabel(dayKey: string, todayKey: string): string {
  const yesterday = lastDayBefore(todayKey);
  if (dayKey === todayKey) {
    return "今日";
  }
  if (dayKey === yesterday) {
    return "昨日";
  }
  const { month, day } = parts(dayKey);
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

function lastDayBefore(dayKey: string): string {
  const { year, month, day } = parts(dayKey);
  const date = new Date(year, month - 1, day - 1, 12, 0, 0, 0);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
