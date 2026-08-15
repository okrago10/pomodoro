import { Data, Effect } from "effect";

export const WORK_MINUTES = 25;
export const SHORT_BREAK_MINUTES = 5;
export const LONG_BREAK_MINUTES = 15;

export type PomodoroPhase = Data.TaggedEnum<{
  Work: {};
  ShortBreak: {};
  LongBreak: {};
}>;

export const PomodoroPhase = Data.taggedEnum<PomodoroPhase>();

export type CycleStepIndex = 0 | 1 | 2 | 3;

export interface CyclePosition {
  readonly stepIndex: CycleStepIndex;
  readonly phase: PomodoroPhase;
}

const CYCLE: readonly [PomodoroPhase, PomodoroPhase, PomodoroPhase, PomodoroPhase] = [
  PomodoroPhase.Work(),
  PomodoroPhase.ShortBreak(),
  PomodoroPhase.Work(),
  PomodoroPhase.LongBreak(),
];

export const initialCyclePosition: CyclePosition = {
  stepIndex: 0,
  phase: CYCLE[0],
};

export function phaseDurationMinutes(phase: PomodoroPhase): 25 | 5 | 15 {
  switch (phase._tag) {
    case "Work":
      return WORK_MINUTES;
    case "ShortBreak":
      return SHORT_BREAK_MINUTES;
    case "LongBreak":
      return LONG_BREAK_MINUTES;
  }
}

export function isWorkPhase(phase: PomodoroPhase): boolean {
  return phase._tag === "Work";
}

export function isBreakPhase(phase: PomodoroPhase): boolean {
  return phase._tag !== "Work";
}

export const nextPhase = (current: CyclePosition): Effect.Effect<CyclePosition> =>
  Effect.sync(() => {
    const stepIndex = ((current.stepIndex + 1) % CYCLE.length) as CycleStepIndex;
    return { stepIndex, phase: CYCLE[stepIndex] };
  });
