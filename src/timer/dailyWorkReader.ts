import { lastNDayKeys, localCalendar, type Calendar } from "./calendar.ts";
import type { Clock } from "./clock.ts";
import type { DailyWorkTotals } from "./dailyWorkStore.ts";
import { floorToMinuteMs } from "./format.ts";

/** 記録画面が並べる日数。 */
export const RECENT_DAYS = 7;

export interface DailyTotal {
  readonly dayKey: string;
  /** 画面に出す値。1 分未満は切り捨て済みで、そのぶんは 0 になる。 */
  readonly ms: number;
}

export interface RecentDailyWork {
  readonly todayKey: string;
  /** 古い順に並ぶ。最後が今日。 */
  readonly days: readonly DailyTotal[];
  /** days の中の最大値。棒の高さを正規化するのに使う。 */
  readonly maxMs: number;
}

/** 記録画面が使う読み口。書き込みは持たない。 */
export interface DailyWorkReader {
  recentWork(days: number): RecentDailyWork;
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

export function createDailyWorkReader(
  totals: DailyWorkTotals,
  clock: Clock,
  calendar: Calendar = localCalendar,
): DailyWorkReader {
  return {
    recentWork(days) {
      const now = clock.now();
      const stored = totals.readAll();
      const list = lastNDayKeys(now, days, calendar).map((dayKey) => ({
        dayKey,
        ms: floorToMinuteMs(stored[dayKey] ?? 0),
      }));

      return {
        todayKey: calendar.dayKey(now),
        days: list,
        maxMs: Math.max(0, ...list.map((day) => day.ms)),
      };
    },
  };
}
