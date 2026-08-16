import type { CyclePosition, PomodoroPhase } from "../domain/cycle.ts";
import type { TimerStatus } from "../timer/engine.ts";

export function phaseName(phase: PomodoroPhase): string {
  switch (phase._tag) {
    case "Work":
      return "作業";
    case "ShortBreak":
      return "短い休憩";
    case "LongBreak":
      return "長い休憩";
  }
}

export function cycleStepLabel(position: CyclePosition): string {
  switch (position.stepIndex) {
    case 0:
      return "1回目の作業";
    case 1:
      return "短い休憩";
    case 2:
      return "2回目の作業";
    case 3:
      return "長い休憩";
  }
}

export function startToggleLabel(status: TimerStatus): string {
  return status === "running" ? "一時停止" : "開始";
}
