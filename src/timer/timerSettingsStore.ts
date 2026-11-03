import {
  applyTimerSettingsPatch,
  DEFAULT_TIMER_SETTINGS,
  parseTimerSettings,
  type TimerSettings,
  type TimerSettingsPatch,
} from "../domain/timerSettings.ts";

/** engine が持つ設定の元。書くのは TimerRuntime だけ。 */
export interface TimerSettingsStore {
  current(): TimerSettings;
  /**
   * 別の書き手が保存した値があれば取り込み、patch を重ねて保存し、結果を返す。
   * 範囲外や NaN の項目は今の値のまま残す。何も変わらなければ current() と同じオブジェクトを返す。
   * 保存に失敗しても手元の値は更新する。例外は投げない。
   */
  update(patch: TimerSettingsPatch): TimerSettings;
}

export const TIMER_SETTINGS_STORAGE_KEY = "pomodoro:timer-settings";

export function createMemoryTimerSettingsStore(
  initial: TimerSettings = DEFAULT_TIMER_SETTINGS,
): TimerSettingsStore {
  let settings = initial;
  return {
    current: () => settings,
    update(patch) {
      settings = applyTimerSettingsPatch(settings, patch);
      return settings;
    },
  };
}

export function createLocalStorageTimerSettingsStore(
  storage: Pick<Storage, "getItem" | "setItem">,
): TimerSettingsStore {
  /** 最後に読めた、または書けた保存内容。保存に失敗したら古いまま残る。 */
  let lastSeen: string | null = null;

  /** 前回読み書きしてから保存先が変わっていれば、その値を fallback に重ねて返す。 */
  function readChanged(fallback: TimerSettings): TimerSettings {
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
  }

  function write(next: TimerSettings): void {
    try {
      const raw = JSON.stringify(next);
      storage.setItem(TIMER_SETTINGS_STORAGE_KEY, raw);
      lastSeen = raw;
    } catch {
      // Persistence must never stop the timer.
    }
  }

  let settings = readChanged(DEFAULT_TIMER_SETTINGS);
  return {
    current: () => settings,
    update(patch) {
      settings = applyTimerSettingsPatch(settings, patch, readChanged(settings));
      write(settings);
      return settings;
    },
  };
}
