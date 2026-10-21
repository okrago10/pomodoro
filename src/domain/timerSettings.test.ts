import { describe, expect, it } from "vitest";
import { DEFAULT_TIMER_SETTINGS, parseTimerSettings } from "./timerSettings.ts";

const DEFAULTS = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  worksBeforeLongBreak: 2,
};

describe("タイマー設定の読み取り", () => {
  it("初期値は作業 25 分・短い休憩 5 分・長い休憩 15 分・長い休憩まで作業 2 回", () => {
    expect(DEFAULT_TIMER_SETTINGS).toEqual(DEFAULTS);
    expect(parseTimerSettings({})).toEqual(DEFAULTS);
  });

  it("オブジェクトでない入力は fallback をそのまま返す", () => {
    for (const input of [undefined, null, "25", 25, [25, 5, 15, 2]]) {
      expect(parseTimerSettings(input)).toBe(DEFAULT_TIMER_SETTINGS);
    }
  });

  it("範囲の両端の整数を受け付ける", () => {
    const lowest = {
      workMinutes: 1,
      shortBreakMinutes: 1,
      longBreakMinutes: 1,
      worksBeforeLongBreak: 1,
    };
    const highest = {
      workMinutes: 90,
      shortBreakMinutes: 30,
      longBreakMinutes: 60,
      worksBeforeLongBreak: 8,
    };
    expect(parseTimerSettings(lowest)).toEqual(lowest);
    expect(parseTimerSettings(highest)).toEqual(highest);
  });

  it("範囲外・整数でない・数でない値は、その項目だけ fallback の値を残す", () => {
    expect(
      parseTimerSettings({
        workMinutes: 50,
        shortBreakMinutes: 31,
        longBreakMinutes: 2.5,
        worksBeforeLongBreak: "3",
      }),
    ).toEqual({ ...DEFAULTS, workMinutes: 50 });
    expect(
      parseTimerSettings({
        workMinutes: 0,
        shortBreakMinutes: Number.NaN,
        longBreakMinutes: 61,
        worksBeforeLongBreak: 9,
      }),
    ).toEqual(DEFAULTS);
  });

  it("渡した fallback の上に重ねる", () => {
    const fallback = parseTimerSettings({ workMinutes: 50, worksBeforeLongBreak: 4 });

    expect(parseTimerSettings({ shortBreakMinutes: 10 }, fallback)).toEqual({
      workMinutes: 50,
      shortBreakMinutes: 10,
      longBreakMinutes: 15,
      worksBeforeLongBreak: 4,
    });
    expect(fallback.shortBreakMinutes).toBe(5);
  });

  it("どの値も変わらなければ fallback と同じ参照を返し、変われば別の参照を返す", () => {
    const fallback = parseTimerSettings({ workMinutes: 50 });

    expect(parseTimerSettings({ ...fallback }, fallback)).toBe(fallback);
    expect(parseTimerSettings({ workMinutes: Number.NaN }, fallback)).toBe(fallback);
    expect(parseTimerSettings({ workMinutes: 51 }, fallback)).not.toBe(fallback);
  });
});
