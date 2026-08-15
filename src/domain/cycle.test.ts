import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
  initialCyclePosition,
  isBreakPhase,
  isWorkPhase,
  nextPhase,
  phaseDurationMinutes,
} from "./cycle.ts";
import type { CyclePosition } from "./cycle.ts";

function advance(position: CyclePosition): CyclePosition {
  return Effect.runSync(nextPhase(position));
}

describe("pomodoro cycle", () => {
  it("starts on a 25-minute work phase", () => {
    expect(initialCyclePosition.stepIndex).toBe(0);
    expect(initialCyclePosition.phase._tag).toBe("Work");
    expect(phaseDurationMinutes(initialCyclePosition.phase)).toBe(25);
    expect(isWorkPhase(initialCyclePosition.phase)).toBe(true);
    expect(isBreakPhase(initialCyclePosition.phase)).toBe(false);
  });

  it("follows work25 → short5 → work25 → long15 → work25", () => {
    const shortBreak = advance(initialCyclePosition);
    expect(shortBreak.phase._tag).toBe("ShortBreak");
    expect(phaseDurationMinutes(shortBreak.phase)).toBe(5);
    expect(isBreakPhase(shortBreak.phase)).toBe(true);
    expect(isWorkPhase(shortBreak.phase)).toBe(false);

    const secondWork = advance(shortBreak);
    expect(secondWork.phase._tag).toBe("Work");
    expect(phaseDurationMinutes(secondWork.phase)).toBe(25);
    expect(isWorkPhase(secondWork.phase)).toBe(true);

    const longBreak = advance(secondWork);
    expect(longBreak.phase._tag).toBe("LongBreak");
    expect(phaseDurationMinutes(longBreak.phase)).toBe(15);
    expect(isBreakPhase(longBreak.phase)).toBe(true);

    const nextCycleWork = advance(longBreak);
    expect(nextCycleWork.phase._tag).toBe("Work");
    expect(phaseDurationMinutes(nextCycleWork.phase)).toBe(25);
    expect(nextCycleWork.stepIndex).toBe(0);
  });
});
