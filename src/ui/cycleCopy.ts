import { isWorkPhase, type CyclePosition, type PomodoroPhase } from "../domain/cycle.ts";
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
  // 作業はサイクルの偶数番目に並ぶので、何回目かは stepIndex から決まる。
  return isWorkPhase(position.phase) ? `${position.stepIndex / 2 + 1}回目の${name}` : name;
}

export function startToggleLabel(status: TimerStatus): string {
  return status === "running" ? "一時停止" : "開始";
}

export interface PhaseNotifyCopy {
  readonly title: string;
  readonly body: string;
}

export function phaseEndedCopy(ended: PomodoroPhase, next: PomodoroPhase): PhaseNotifyCopy {
  return {
    title: `${phaseName(ended)}が終わりました`,
    body: `${phaseName(next)}が始まりました`,
  };
}
