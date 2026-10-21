import { describe, expect, it } from "vitest";
import { PomodoroPhase } from "../domain/cycle.ts";
import { DEFAULT_TIMER_SETTINGS, parseTimerSettings } from "../domain/timerSettings.ts";
import { cycleStepLabel, phaseName, resetConfirmBody, startToggleLabel } from "./cycleCopy.ts";

describe("cycle copy", () => {
  it("names phases in one word", () => {
    expect(phaseName(PomodoroPhase.Work())).toBe("作業");
    expect(phaseName(PomodoroPhase.ShortBreak())).toBe("短い休憩");
    expect(phaseName(PomodoroPhase.LongBreak())).toBe("長い休憩");
  });

  it("describes where the cycle is", () => {
    expect(cycleStepLabel({ workNumber: 1, phase: PomodoroPhase.Work() })).toBe("1回目の作業");
    expect(cycleStepLabel({ workNumber: 1, phase: PomodoroPhase.ShortBreak() })).toBe("短い休憩");
    expect(cycleStepLabel({ workNumber: 2, phase: PomodoroPhase.Work() })).toBe("2回目の作業");
    expect(cycleStepLabel({ workNumber: 2, phase: PomodoroPhase.LongBreak() })).toBe("長い休憩");
  });

  it("toggles start and pause on the same control", () => {
    expect(startToggleLabel("idle")).toBe("開始");
    expect(startToggleLabel("paused")).toBe("開始");
    expect(startToggleLabel("running")).toBe("一時停止");
  });

  it("tells which work length a reset goes back to", () => {
    expect(resetConfirmBody(DEFAULT_TIMER_SETTINGS)).toBe(
      "進行中のサイクルは破棄され、1回目の作業（25分）に戻ります。",
    );
    expect(resetConfirmBody(parseTimerSettings({ workMinutes: 50 }))).toBe(
      "進行中のサイクルは破棄され、1回目の作業（50分）に戻ります。",
    );
  });
});
