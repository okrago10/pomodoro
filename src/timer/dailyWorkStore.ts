/**
 * 日別作業時間の保存先。どのアダプターも次を守るので、呼び出し側は防御を書かない。
 *
 * - 例外を投げない。保存先の読み書きに失敗してもタイマーを止めない。
 * - get は 0 以上の有限数を返す。記録の無い日と壊れた値は 0 として扱う。
 * - add は 0 以下や有限でない差分を無視する。保存に失敗した分は捨てる。
 */
export interface DailyWorkStore {
  get(dayKey: string): number;
  add(dayKey: string, deltaMs: number): void;
}

/**
 * 記録画面のように全日分がほしい側の読み口。1 回の読み込みで返す。
 * DailyWorkStore と同じく例外を投げず、値は 0 以上の有限数だけを含む。
 */
export interface DailyWorkTotals {
  readAll(): Readonly<Record<string, number>>;
}

export const DAILY_WORK_STORAGE_KEY = "pomodoro:daily-work-ms";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 0 以上の有限数の値だけを残す。どちらのアダプターも、外から受け取った値はここを通す。 */
function validTotals(input: unknown): Record<string, number> {
  if (!isRecord(input)) {
    return {};
  }
  const totals: Record<string, number> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      totals[key] = value;
    }
  }
  return totals;
}

/** 継承したプロパティ（toString など）を記録として読まない。 */
function totalOf(totals: Readonly<Record<string, number>>, dayKey: string): number {
  return Object.hasOwn(totals, dayKey) ? totals[dayKey] : 0;
}

function isRecordableDelta(deltaMs: number): boolean {
  return Number.isFinite(deltaMs) && deltaMs > 0;
}

export function createMemoryDailyWorkStore(
  initial: Readonly<Record<string, number>> = {},
): DailyWorkStore & DailyWorkTotals {
  const totals = validTotals(initial);
  return {
    get(dayKey) {
      return totalOf(totals, dayKey);
    },
    readAll() {
      return { ...totals };
    },
    add(dayKey, deltaMs) {
      if (!isRecordableDelta(deltaMs)) {
        return;
      }
      totals[dayKey] = totalOf(totals, dayKey) + deltaMs;
    },
  };
}

export function createLocalStorageDailyWorkStore(
  storage: Pick<Storage, "getItem" | "setItem">,
): DailyWorkStore & DailyWorkTotals {
  function read(): Record<string, number> {
    try {
      const raw = storage.getItem(DAILY_WORK_STORAGE_KEY);
      if (!raw) {
        return {};
      }
      return validTotals(JSON.parse(raw));
    } catch {
      return {};
    }
  }

  function write(totals: Record<string, number>): void {
    try {
      storage.setItem(DAILY_WORK_STORAGE_KEY, JSON.stringify(totals));
    } catch {
      // Persistence must never stop the timer.
    }
  }

  return {
    get(dayKey) {
      return totalOf(read(), dayKey);
    },
    readAll: read,
    add(dayKey, deltaMs) {
      if (!isRecordableDelta(deltaMs)) {
        return;
      }
      const totals = read();
      totals[dayKey] = totalOf(totals, dayKey) + deltaMs;
      write(totals);
    },
  };
}
