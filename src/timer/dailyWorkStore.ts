export interface DailyWorkStore {
  get(dayKey: string): number;
  add(dayKey: string, deltaMs: number): void;
}

/** 記録画面のように全日分がほしい側の読み口。1 回の読み込みで返す。 */
export interface DailyWorkTotals {
  readAll(): Readonly<Record<string, number>>;
}

export const DAILY_WORK_STORAGE_KEY = "pomodoro:daily-work-ms";

export function createMemoryDailyWorkStore(
  initial: Readonly<Record<string, number>> = {},
): DailyWorkStore & DailyWorkTotals {
  const totals: Record<string, number> = { ...initial };
  return {
    get(dayKey) {
      return totals[dayKey] ?? 0;
    },
    readAll() {
      return { ...totals };
    },
    add(dayKey, deltaMs) {
      if (deltaMs <= 0) {
        return;
      }
      totals[dayKey] = (totals[dayKey] ?? 0) + deltaMs;
    },
  };
}

function isTotalsRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseTotals(raw: string): Record<string, number> {
  const parsed: unknown = JSON.parse(raw);
  if (!isTotalsRecord(parsed)) {
    return {};
  }
  const totals: Record<string, number> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      totals[key] = value;
    }
  }
  return totals;
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
      return parseTotals(raw);
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
      return read()[dayKey] ?? 0;
    },
    readAll: read,
    add(dayKey, deltaMs) {
      if (deltaMs <= 0) {
        return;
      }
      const totals = read();
      totals[dayKey] = (totals[dayKey] ?? 0) + deltaMs;
      write(totals);
    },
  };
}
