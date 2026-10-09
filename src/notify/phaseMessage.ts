import type { PomodoroPhase } from "../domain/cycle.ts";
import { phaseName } from "../ui/cycleCopy.ts";

export interface PhaseNotifyCopy {
  readonly title: string;
  readonly body: string;
}

/** フェーズの呼び名は画面と同じ phaseName を使う。 */
export function phaseEndedCopy(ended: PomodoroPhase, next: PomodoroPhase): PhaseNotifyCopy {
  return {
    title: `${phaseName(ended)}が終わりました`,
    body: `${phaseName(next)}が始まりました`,
  };
}
