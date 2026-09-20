/**
 * dayKey は `YYYY-MM-DD` 形式の文字列で、暦日そのものを表す。
 * 暦日どうしの計算はタイムゾーンに依らないので、Calendar のアダプターではなく
 * ここに 1 つだけ置く。Calendar が持つのは「ある瞬間がどの暦日か」だけ。
 */
export interface DayParts {
  readonly year: number;
  /** 1 始まり。 */
  readonly month: number;
  readonly day: number;
}

export interface Calendar {
  /** ミリ秒を dayKey にする。 */
  dayKey(ms: number): string;
  /** ms が属する日の、翌日 0 時のミリ秒。 */
  startOfNextDay(ms: number): number;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function parseDayKey(dayKey: string): DayParts {
  const [year, month, day] = dayKey.split("-").map(Number);
  return { year, month, day };
}

function formatDayKey({ year, month, day }: DayParts): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/**
 * 暦日の足し算。days は負でもよい。
 * UTC で組み立てるので、夏時間の切り替え日でもずれない。
 */
export function addDays(dayKey: string, days: number): string {
  const { year, month, day } = parseDayKey(dayKey);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return formatDayKey({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
}

/** 0 = 日曜、6 = 土曜。dayKey が壊れているときは NaN。 */
export function weekdayIndex(dayKey: string): number {
  const { year, month, day } = parseDayKey(dayKey);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export const localCalendar: Calendar = {
  dayKey(ms) {
    const d = new Date(ms);
    return formatDayKey({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() });
  },
  startOfNextDay(ms) {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d.getTime();
  },
};

export const utcCalendar: Calendar = {
  dayKey(ms) {
    const d = new Date(ms);
    return formatDayKey({
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
    });
  },
  startOfNextDay(ms) {
    const d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  },
};

/** endMs が属する日を最後に、古い順に n 日分の dayKey を返す。 */
export function lastNDayKeys(
  endMs: number,
  n: number,
  calendar: Calendar = localCalendar,
): string[] {
  const endKey = calendar.dayKey(endMs);
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(addDays(endKey, -i));
  }
  return keys;
}
