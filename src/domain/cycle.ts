import { Data, Effect } from "effect";
import type { TimerSettings } from "./timerSettings.ts";

export type PomodoroPhase = Data.TaggedEnum<{
  Work: {};
  ShortBreak: {};
  LongBreak: {};
}>;

export const PomodoroPhase = Data.taggedEnum<PomodoroPhase>();

/**
 * workNumber は 1 始まり。作業中はその作業が何回目か、休憩中は直前の作業の回数。
 * フェーズは設定から導かずに持つので、設定を変えても進行中のフェーズの種類は変わらない。
 */
export interface CyclePosition {
  readonly workNumber: number;
  readonly phase: PomodoroPhase;
}

export const initialCyclePosition: CyclePosition = {
  workNumber: 1,
  phase: PomodoroPhase.Work(),
};

export function phaseDurationMinutes(phase: PomodoroPhase, settings: TimerSettings): number {
  switch (phase._tag) {
    case "Work":
      return settings.workMinutes;
    case "ShortBreak":
      return settings.shortBreakMinutes;
    case "LongBreak":
      return settings.longBreakMinutes;
  }
}

export function phaseDurationMs(phase: PomodoroPhase, settings: TimerSettings): number {
  return phaseDurationMinutes(phase, settings) * 60_000;
}

export function isWorkPhase(phase: PomodoroPhase): boolean {
  return phase._tag === "Work";
}

export function isBreakPhase(phase: PomodoroPhase): boolean {
  return phase._tag !== "Work";
}

/**
 * 遷移のたびに、その時点の設定で次を決める。途中で長い休憩までの回数を減らしたら、
 * その回数に達している作業のあとは長い休憩へ進む。作業の回数は実際に数えたとおりで、戻さない。
 */
export const nextPhase = (
  current: CyclePosition,
  settings: TimerSettings,
): Effect.Effect<CyclePosition> =>
  Effect.sync(() => {
    const { worksBeforeLongBreak } = settings;
    switch (current.phase._tag) {
      case "Work":
        return {
          workNumber: current.workNumber,
          phase:
            current.workNumber >= worksBeforeLongBreak
              ? PomodoroPhase.LongBreak()
              : PomodoroPhase.ShortBreak(),
        };
      case "ShortBreak":
        return {
          workNumber: current.workNumber + 1,
          phase: PomodoroPhase.Work(),
        };
      case "LongBreak":
        return initialCyclePosition;
    }
  });

/** 1 回目の作業から長い休憩までのフェーズの並び。 */
export function cyclePhases(settings: TimerSettings): PomodoroPhase[] {
  let position = initialCyclePosition;
  const phases = [position.phase];
  while (position.phase._tag !== "LongBreak") {
    position = Effect.runSync(nextPhase(position, settings));
    phases.push(position.phase);
  }
  return phases;
}
