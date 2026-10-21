import type { Brand } from "effect";

/** 設定の一覧はここだけ。画面の並び順も兼ねる。 */
export const TIMER_SETTING_KEYS = [
  "workMinutes",
  "shortBreakMinutes",
  "longBreakMinutes",
  "worksBeforeLongBreak",
] as const;

export type TimerSettingKey = (typeof TIMER_SETTING_KEYS)[number];

type TimerSettingsFields = { readonly [K in TimerSettingKey]: number };

/**
 * parseTimerSettings を通った設定。各値は範囲内の整数なので、どのフェーズも 1 分以上ある。
 * engine の追いつきのループが必ず終わるのはこの保証による。
 */
export type TimerSettings = TimerSettingsFields & Brand.Brand<"TimerSettings">;

/** 画面からそのまま渡してよい。範囲外や NaN の値は無視される。 */
export type TimerSettingsPatch = Partial<TimerSettingsFields>;

export const TIMER_SETTING_BOUNDS = {
  workMinutes: { min: 1, max: 90 },
  shortBreakMinutes: { min: 1, max: 30 },
  longBreakMinutes: { min: 1, max: 60 },
  worksBeforeLongBreak: { min: 1, max: 8 },
} as const satisfies Record<TimerSettingKey, { readonly min: number; readonly max: number }>;

/** 作業 25 分 → 短い休憩 5 分 → 作業 25 分 → 長い休憩 15 分。 */
export const DEFAULT_TIMER_SETTINGS = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  worksBeforeLongBreak: 2,
} as TimerSettings;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 外から来た値を設定にする。キーごとに、範囲内の整数なら採り、そうでなければ fallback の値を残す。
 *
 * どの値も fallback と同じなら fallback そのものを返す。設定が変わったかを
 * 参照の比較で判定できるので、ほかのモジュールは項目を並べずに済む。
 */
export function parseTimerSettings(
  input: unknown,
  fallback: TimerSettings = DEFAULT_TIMER_SETTINGS,
): TimerSettings {
  if (!isRecord(input)) {
    return fallback;
  }
  const fields: Record<TimerSettingKey, number> = { ...fallback };
  let changed = false;
  for (const key of TIMER_SETTING_KEYS) {
    const value = input[key];
    const { min, max } = TIMER_SETTING_BOUNDS[key];
    if (typeof value === "number" && Number.isInteger(value) && value >= min && value <= max) {
      fields[key] = value;
      changed ||= value !== fallback[key];
    }
  }
  return changed ? (fields as TimerSettings) : fallback;
}
