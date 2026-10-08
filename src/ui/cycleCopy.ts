import { isWorkPhase, workRound, type CyclePosition, type PomodoroPhase } from "../domain/cycle.ts";
import type { TimerStatus } from "../timer/engine.ts";

/** フェーズの呼び名はここだけに置く。画面も通知もこれを使う。 */
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
  const name = phaseName(position.phase);
  return isWorkPhase(position.phase) ? `${workRound(position)}回目の${name}` : name;
}

export function startToggleLabel(status: TimerStatus): string {
  return status === "running" ? "一時停止" : "開始";
}
