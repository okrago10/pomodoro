import { describe, expect, it } from "vitest";
import { PomodoroPhase } from "../domain/cycle.ts";
import { cycleStepLabel, phaseName, startToggleLabel } from "./cycleCopy.ts";

describe("cycle copy", () => {
  it("names phases in one word", () => {
    expect(phaseName(PomodoroPhase.Work())).toBe("作業");
    expect(phaseName(PomodoroPhase.ShortBreak())).toBe("短い休憩");
    expect(phaseName(PomodoroPhase.LongBreak())).toBe("長い休憩");
  });

  it("describes where the cycle is", () => {
    expect(cycleStepLabel({ stepIndex: 0, phase: PomodoroPhase.Work() })).toBe("1回目の作業");
    expect(cycleStepLabel({ stepIndex: 1, phase: PomodoroPhase.ShortBreak() })).toBe("短い休憩");
    expect(cycleStepLabel({ stepIndex: 2, phase: PomodoroPhase.Work() })).toBe("2回目の作業");
    expect(cycleStepLabel({ stepIndex: 3, phase: PomodoroPhase.LongBreak() })).toBe("長い休憩");
  });

  it("toggles start and pause on the same control", () => {
    expect(startToggleLabel("idle")).toBe("開始");
    expect(startToggleLabel("paused")).toBe("開始");
    expect(startToggleLabel("running")).toBe("一時停止");
  });
});
