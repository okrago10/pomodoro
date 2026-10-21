import {
  DEFAULT_TIMER_SETTINGS,
  parseTimerSettings,
  type TimerSettings,
} from "../domain/timerSettings.ts";

/** engine が持つ設定の写し。書くのは TimerRuntime だけ。 */
export interface TimerSettingsStore {
  /** 読めない項目や壊れた項目は初期値になる。例外は投げない。 */
  load(): TimerSettings;
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
  return {
    load() {
      try {
        const raw = storage.getItem(TIMER_SETTINGS_STORAGE_KEY);
        return raw === null ? DEFAULT_TIMER_SETTINGS : parseTimerSettings(JSON.parse(raw));
      } catch {
        return DEFAULT_TIMER_SETTINGS;
      }
    },
    save(settings) {
      try {
        storage.setItem(TIMER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // Persistence must never stop the timer.
      }
    },
  };
}
