/** dayKey は `YYYY-MM-DD` 形式の文字列。生成・解釈・日送りはすべてこのモジュールが持つ。 */
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
  /** dayKey を days 日ずらした dayKey。days は負でもよい。 */
  addDays(dayKey: string, days: number): string;
  /** 0 = 日曜、6 = 土曜。 */
  weekdayIndex(dayKey: string): number;
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
 * 日送りは正午を基準に行う。0 時を基準にすると、夏時間の切り替え日に
 * 前後の日へずれることがあるため。
 */
const LOCAL_ANCHOR_HOUR = 12;

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
  addDays(dayKey, days) {
    const { year, month, day } = parseDayKey(dayKey);
    const shifted = new Date(year, month - 1, day + days, LOCAL_ANCHOR_HOUR, 0, 0, 0);
    return localCalendar.dayKey(shifted.getTime());
  },
  weekdayIndex(dayKey) {
    const { year, month, day } = parseDayKey(dayKey);
    return new Date(year, month - 1, day, LOCAL_ANCHOR_HOUR, 0, 0, 0).getDay();
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
  addDays(dayKey, days) {
    const { year, month, day } = parseDayKey(dayKey);
    return utcCalendar.dayKey(Date.UTC(year, month - 1, day + days));
  },
  weekdayIndex(dayKey) {
    const { year, month, day } = parseDayKey(dayKey);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
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
    keys.push(calendar.addDays(endKey, -i));
  }
  return keys;
}
