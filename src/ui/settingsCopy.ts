import { cyclePhases, phaseDurationMinutes, PomodoroPhase } from "../domain/cycle.ts";
import type { CyclePosition } from "../domain/cycle.ts";
import type { TimerSettingKey, TimerSettings } from "../domain/timerSettings.ts";
import type { TimerStatus } from "../timer/engine.ts";
import { cycleStepLabel, phaseName } from "./cycleCopy.ts";

const WORK = phaseName(PomodoroPhase.Work());
const LONG_BREAK = phaseName(PomodoroPhase.LongBreak());

export const SETTING_LABELS = {
  workMinutes: `${WORK}（分）`,
  shortBreakMinutes: `${phaseName(PomodoroPhase.ShortBreak())}（分）`,
  longBreakMinutes: `${LONG_BREAK}（分）`,
  worksBeforeLongBreak: `${LONG_BREAK}までの${WORK}回数`,
} satisfies Record<TimerSettingKey, string>;

export function cyclePreview(settings: TimerSettings): string {
  return cyclePhases(settings)
    .map((phase) => `${phaseName(phase)} ${phaseDurationMinutes(phase, settings)}分`)
    .join(" → ");
}

/** 動いている間は、変えても今のフェーズの長さは変わらないと伝える。待機中は null。 */
export function settingsTimingNote(status: TimerStatus, position: CyclePosition): string | null {
  if (status === "idle") {
    return null;
  }
  return `進行中の${cycleStepLabel(position)}は今の長さのまま続きます。変更は次のフェーズから反映されます。`;
}
