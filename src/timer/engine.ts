import { Effect } from "effect";
import {
  initialCyclePosition,
  isWorkPhase,
  nextPhase,
  phaseDurationMs,
  type CyclePosition,
} from "../domain/cycle.ts";
import {
  DEFAULT_TIMER_SETTINGS,
  parseTimerSettings,
  type TimerSettings,
  type TimerSettingsPatch,
} from "../domain/timerSettings.ts";
import { localCalendar, type Calendar } from "./calendar.ts";
import type { Clock } from "./clock.ts";
import { createMemoryDailyWorkStore, type DailyWorkStore } from "./dailyWorkStore.ts";

/**
 * 待機中は位置も残り時間も持たない。どちらも今の設定から導くので、
 * 待機中に設定を変えるとすぐ表示に出る。
 */
type Run =
  | { readonly status: "idle" }
  | { readonly status: "running"; readonly position: CyclePosition; readonly deadlineMs: number }
  | { readonly status: "paused"; readonly position: CyclePosition; readonly remainingMs: number };

export type TimerStatus = Run["status"];

export interface TimerSnapshot {
  readonly position: CyclePosition;
  readonly remainingMs: number;
  readonly status: TimerStatus;
  readonly todayWorkMs: number;
  /** 値が変わったときだけ別のオブジェクトになる。 */
  readonly settings: TimerSettings;
}

interface PhaseTransition {
  readonly from: CyclePosition;
  readonly to: CyclePosition;
}

function storedTotal(store: DailyWorkStore, dayKey: string): number {
  try {
    const value = store.get(dayKey);
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function createTimerEngine(
  clock: Clock,
  calendar: Calendar = localCalendar,
  store: DailyWorkStore = createMemoryDailyWorkStore(),
  initialSettings: TimerSettings = DEFAULT_TIMER_SETTINGS,
) {
  let settings = initialSettings;
  let run: Run = { status: "idle" };
  let todayWorkMs = storedTotal(store, calendar.dayKey(clock.now()));
  /** 経過をどこまで反映したか。動いている間だけ前に進む。 */
  let cursorMs = clock.now();
  let pendingTransitions: PhaseTransition[] = [];

  /** cursorMs から until までの経過を進める。作業なら日をまたぐぶんを日ごとに分けて記録する。 */
  function accrue(until: number, work: boolean): void {
    while (cursorMs < until) {
      const sliceEnd = Math.min(until, calendar.startOfNextDay(cursorMs));
      if (work) {
        try {
          store.add(calendar.dayKey(cursorMs), sliceEnd - cursorMs);
        } catch {
          // Persistence failures must not stop the timer.
        }
      }
      cursorMs = sliceEnd;
    }
  }

  /**
   * now まで追いつく。どの操作もまずここを通る。
   * 動いている間は、越えた締切ごとにフェーズを進めて遷移をためる。
   */
  function advanceTo(now: number): void {
    if (run.status === "running") {
      let { position, deadlineMs } = run;
      while (now >= deadlineMs) {
        const from = position;
        accrue(deadlineMs, isWorkPhase(from.phase));
        position = Effect.runSync(nextPhase(from, settings));
        pendingTransitions.push({ from, to: position });
        deadlineMs += phaseDurationMs(position.phase, settings);
      }
      accrue(now, isWorkPhase(position.phase));
      run = { status: "running", position, deadlineMs };
    }
    todayWorkMs = storedTotal(store, calendar.dayKey(now));
  }

  function toSnapshot(now: number): TimerSnapshot {
    const common = { status: run.status, todayWorkMs, settings };
    switch (run.status) {
      case "idle":
        return {
          ...common,
          position: initialCyclePosition,
          remainingMs: phaseDurationMs(initialCyclePosition.phase, settings),
        };
      case "running":
        return { ...common, position: run.position, remainingMs: run.deadlineMs - now };
      case "paused":
        return { ...common, position: run.position, remainingMs: run.remainingMs };
    }
  }

  /** now まで追いついた状態を返す。読むだけでも作業時間の記録とフェーズの遷移が進む。 */
  function tick(): TimerSnapshot {
    const now = clock.now();
    advanceTo(now);
    return toSnapshot(now);
  }

  function start(): TimerSnapshot {
    const now = clock.now();
    advanceTo(now);
    if (run.status !== "running") {
      // 表示している位置と残り時間から動かす。
      const { position, remainingMs } = toSnapshot(now);
      run = { status: "running", position, deadlineMs: now + remainingMs };
      cursorMs = now;
    }
    return toSnapshot(now);
  }

  function pause(): TimerSnapshot {
    const now = clock.now();
    advanceTo(now);
    if (run.status === "running") {
      run = { status: "paused", position: run.position, remainingMs: run.deadlineMs - now };
    }
    return toSnapshot(now);
  }

  /** 進行中のサイクルは、まだ知らせていない遷移ごと破棄する。記録した作業時間は残す。 */
  function reset(): TimerSnapshot {
    const now = clock.now();
    advanceTo(now);
    run = { status: "idle" };
    pendingTransitions = [];
    return toSnapshot(now);
  }

  /**
   * 先に古い設定で now まで追いついてから差し替える。進行中のフェーズは締切も止めた残りも
   * そのままで、新しい設定は次のフェーズから効く。範囲外や NaN の値は無視する。
   */
  function updateSettings(patch: TimerSettingsPatch): TimerSnapshot {
    const now = clock.now();
    advanceTo(now);
    settings = parseTimerSettings({ ...settings, ...patch }, settings);
    return toSnapshot(now);
  }

  function takeTransitions(): readonly PhaseTransition[] {
    const transitions = pendingTransitions;
    pendingTransitions = [];
    return transitions;
  }

  function runningDeadlineMs(): number | null {
    return run.status === "running" ? run.deadlineMs : null;
  }

  return { start, pause, reset, tick, updateSettings, takeTransitions, runningDeadlineMs };
}
