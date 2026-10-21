import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
  initialCyclePosition,
  isBreakPhase,
  isWorkPhase,
  nextPhase,
  phaseDurationMs,
  PomodoroPhase,
} from "./cycle.ts";
import type { CyclePosition } from "./cycle.ts";
import { DEFAULT_TIMER_SETTINGS, parseTimerSettings, type TimerSettings } from "./timerSettings.ts";

const MINUTE = 60_000;

function advance(position: CyclePosition, settings = DEFAULT_TIMER_SETTINGS): CyclePosition {
  return Effect.runSync(nextPhase(position, settings));
}

/** from から steps 回進めた各位置を [フェーズ, workNumber] で返す。 */
function walk(from: CyclePosition, settings: TimerSettings, steps: number) {
  const visited: [string, number][] = [];
  let position = from;
  for (let i = 0; i < steps; i++) {
    position = advance(position, settings);
    visited.push([position.phase._tag, position.workNumber]);
  }
  return visited;
}

describe("pomodoro cycle", () => {
  it("starts on the first 25-minute work phase", () => {
    expect(initialCyclePosition.workNumber).toBe(1);
    expect(initialCyclePosition.phase._tag).toBe("Work");
    expect(phaseDurationMs(initialCyclePosition.phase, DEFAULT_TIMER_SETTINGS)).toBe(25 * MINUTE);
    expect(isWorkPhase(initialCyclePosition.phase)).toBe(true);
    expect(isBreakPhase(initialCyclePosition.phase)).toBe(false);
  });

  it("follows work25 → short5 → work25 → long15 → work25 with the default settings", () => {
    const shortBreak = advance(initialCyclePosition);
    expect(shortBreak.phase._tag).toBe("ShortBreak");
    expect(phaseDurationMs(shortBreak.phase, DEFAULT_TIMER_SETTINGS)).toBe(5 * MINUTE);
    expect(isBreakPhase(shortBreak.phase)).toBe(true);
    expect(isWorkPhase(shortBreak.phase)).toBe(false);

    const secondWork = advance(shortBreak);
    expect(secondWork.phase._tag).toBe("Work");
    expect(secondWork.workNumber).toBe(2);
    expect(phaseDurationMs(secondWork.phase, DEFAULT_TIMER_SETTINGS)).toBe(25 * MINUTE);

    const longBreak = advance(secondWork);
    expect(longBreak.phase._tag).toBe("LongBreak");
    expect(phaseDurationMs(longBreak.phase, DEFAULT_TIMER_SETTINGS)).toBe(15 * MINUTE);

    const nextCycleWork = advance(longBreak);
    expect(nextCycleWork).toEqual(initialCyclePosition);
  });

  it("takes each phase's length from the settings", () => {
    const settings = parseTimerSettings({
      workMinutes: 50,
      shortBreakMinutes: 10,
      longBreakMinutes: 30,
    });
    expect(phaseDurationMs(PomodoroPhase.Work(), settings)).toBe(50 * MINUTE);
    expect(phaseDurationMs(PomodoroPhase.ShortBreak(), settings)).toBe(10 * MINUTE);
    expect(phaseDurationMs(PomodoroPhase.LongBreak(), settings)).toBe(30 * MINUTE);
  });

  it("takes the long break after as many works as the settings say", () => {
    expect(walk(initialCyclePosition, parseTimerSettings({ worksBeforeLongBreak: 1 }), 2)).toEqual([
      ["LongBreak", 1],
      ["Work", 1],
    ]);
    expect(walk(initialCyclePosition, parseTimerSettings({ worksBeforeLongBreak: 4 }), 8)).toEqual([
      ["ShortBreak", 1],
      ["Work", 2],
      ["ShortBreak", 2],
      ["Work", 3],
      ["ShortBreak", 3],
      ["Work", 4],
      ["LongBreak", 4],
      ["Work", 1],
    ]);
  });

  it("goes to the long break after the current work when the cycle shrinks below it", () => {
    const thirdWork = { workNumber: 3, phase: PomodoroPhase.Work() };
    expect(walk(thirdWork, parseTimerSettings({ worksBeforeLongBreak: 2 }), 2)).toEqual([
      ["LongBreak", 3],
      ["Work", 1],
    ]);
  });

  it("does not count past the new length after a short break when the cycle shrinks", () => {
    const thirdShortBreak = { workNumber: 3, phase: PomodoroPhase.ShortBreak() };
    expect(walk(thirdShortBreak, parseTimerSettings({ worksBeforeLongBreak: 2 }), 2)).toEqual([
      ["Work", 2],
      ["LongBreak", 2],
    ]);
  });

  it("keeps a long break in progress and starts over when the cycle grows", () => {
    const longBreak = { workNumber: 2, phase: PomodoroPhase.LongBreak() };
    expect(walk(longBreak, parseTimerSettings({ worksBeforeLongBreak: 4 }), 1)).toEqual([
      ["Work", 1],
    ]);
  });
});
