import { describe, expect, it } from "vitest";
import { PomodoroPhase } from "../domain/cycle.ts";
import { DEFAULT_TIMER_SETTINGS, parseTimerSettings } from "../domain/timerSettings.ts";
import { cyclePreview, settingsTimingNote } from "./settingsCopy.ts";

describe("settings copy", () => {
  it("初期値のサイクルを今の並びどおりに見せる", () => {
    expect(cyclePreview(DEFAULT_TIMER_SETTINGS)).toBe(
      "作業 25分 → 短い休憩 5分 → 作業 25分 → 長い休憩 15分",
    );
  });

  it("長い休憩までの回数と各フェーズの長さを並びに反映する", () => {
    expect(
      cyclePreview(parseTimerSettings({ worksBeforeLongBreak: 1, longBreakMinutes: 30 })),
    ).toBe("作業 25分 → 長い休憩 30分");
    expect(
      cyclePreview(
        parseTimerSettings({ workMinutes: 50, shortBreakMinutes: 10, worksBeforeLongBreak: 3 }),
      ),
    ).toBe("作業 50分 → 短い休憩 10分 → 作業 50分 → 短い休憩 10分 → 作業 50分 → 長い休憩 15分");
  });

  it("待機中は注記を出さず、動いている間は進行中のフェーズがそのまま続くと伝える", () => {
    expect(settingsTimingNote("idle", { workNumber: 1, phase: PomodoroPhase.Work() })).toBeNull();
    expect(settingsTimingNote("running", { workNumber: 1, phase: PomodoroPhase.Work() })).toBe(
      "進行中の1回目の作業は今の長さのまま続きます。変更は次のフェーズから反映されます。",
    );
    expect(settingsTimingNote("paused", { workNumber: 1, phase: PomodoroPhase.ShortBreak() })).toBe(
      "進行中の短い休憩は今の長さのまま続きます。変更は次のフェーズから反映されます。",
    );
  });
});
