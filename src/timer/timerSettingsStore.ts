import {
  DEFAULT_TIMER_SETTINGS,
  parseTimerSettings,
  type TimerSettings,
} from "../domain/timerSettings.ts";

/** engine が持つ設定の写し。書くのは TimerRuntime だけ。 */
export interface TimerSettingsStore {
  /**
   * このストアが前回読み書きしてから保存先が変わっていれば、その値を fallback に重ねて返す。
   * 変わっていない・読めないときは fallback をそのまま返す。例外は投げない。
   */
  load(fallback?: TimerSettings): TimerSettings;
  save(settings: TimerSettings): void;
}

export const TIMER_SETTINGS_STORAGE_KEY = "pomodoro:timer-settings";

export function createMemoryTimerSettingsStore(
  initial: TimerSettings = DEFAULT_TIMER_SETTINGS,
): TimerSettingsStore {
  let saved = initial;
  return {
    load: () => saved,
    save(settings) {
      saved = settings;
    },
  };
}

export function createLocalStorageTimerSettingsStore(
  storage: Pick<Storage, "getItem" | "setItem">,
): TimerSettingsStore {
  /** 最後に読めた、または書けた保存内容。保存に失敗したら古いまま残る。 */
  let lastSeen: string | null = null;
  return {
    load(fallback = DEFAULT_TIMER_SETTINGS) {
      try {
        const raw = storage.getItem(TIMER_SETTINGS_STORAGE_KEY);
        if (raw === null || raw === lastSeen) {
          return fallback;
        }
        lastSeen = raw;
        return parseTimerSettings(JSON.parse(raw), fallback);
      } catch {
        return fallback;
      }
    },
    save(settings) {
      try {
        const raw = JSON.stringify(settings);
        storage.setItem(TIMER_SETTINGS_STORAGE_KEY, raw);
        lastSeen = raw;
      } catch {
        // Persistence must never stop the timer.
      }
    },
  };
}
