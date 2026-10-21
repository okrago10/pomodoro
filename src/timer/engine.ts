import { Effect } from "effect";
import {
  initialCyclePosition,
  isWorkPhase,
  nextPhase,
  phaseDurationMs,
  type CyclePosition,
} from "../domain/cycle.ts";
import { DEFAULT_TIMER_SETTINGS } from "../domain/timerSettings.ts";
import { localCalendar, type Calendar } from "./calendar.ts";
import type { Clock } from "./clock.ts";
import { createMemoryDailyWorkStore, type DailyWorkStore } from "./dailyWorkStore.ts";

export type TimerStatus = "idle" | "running" | "paused";

export interface TimerSnapshot {
  readonly position: CyclePosition;
  readonly remainingMs: number;
  readonly status: TimerStatus;
  readonly todayWorkMs: number;
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
) {
  let position: CyclePosition = initialCyclePosition;
  let status: TimerStatus = "idle";
  let deadlineMs: number | null = null;
  let remainingMs = phaseDurationMs(position.phase, DEFAULT_TIMER_SETTINGS);
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
    if (status === "running" && deadlineMs !== null) {
      while (now >= deadlineMs) {
        const from = position;
        accrue(deadlineMs, isWorkPhase(from.phase));
        position = Effect.runSync(nextPhase(position, DEFAULT_TIMER_SETTINGS));
        pendingTransitions.push({ from, to: position });
        deadlineMs += phaseDurationMs(position.phase, DEFAULT_TIMER_SETTINGS);
      }
      accrue(now, isWorkPhase(position.phase));
      remainingMs = deadlineMs - now;
    }
    todayWorkMs = storedTotal(store, calendar.dayKey(now));
  }

  function toSnapshot(): TimerSnapshot {
    return { position, remainingMs, status, todayWorkMs };
  }

  /** now まで追いついた状態を返す。読むだけでも作業時間の記録とフェーズの遷移が進む。 */
  function tick(): TimerSnapshot {
    advanceTo(clock.now());
    return toSnapshot();
  }

  function start(): TimerSnapshot {
    const now = clock.now();
    advanceTo(now);
    if (status === "running") {
      return toSnapshot();
    }
    if (status === "idle") {
      remainingMs = phaseDurationMs(position.phase, DEFAULT_TIMER_SETTINGS);
    }
    deadlineMs = now + remainingMs;
    status = "running";
    cursorMs = now;
    return toSnapshot();
  }

  function pause(): TimerSnapshot {
    advanceTo(clock.now());
    if (status === "running") {
      deadlineMs = null;
      status = "paused";
    }
    return toSnapshot();
  }

  /** 進行中のサイクルは、まだ知らせていない遷移ごと破棄する。記録した作業時間は残す。 */
  function reset(): TimerSnapshot {
    advanceTo(clock.now());
    position = initialCyclePosition;
    status = "idle";
    deadlineMs = null;
    remainingMs = phaseDurationMs(position.phase, DEFAULT_TIMER_SETTINGS);
    pendingTransitions = [];
    return toSnapshot();
  }

  function takeTransitions(): readonly PhaseTransition[] {
    const transitions = pendingTransitions;
    pendingTransitions = [];
    return transitions;
  }

  function runningDeadlineMs(): number | null {
    return status === "running" ? deadlineMs : null;
  }

  return { start, pause, reset, tick, takeTransitions, runningDeadlineMs };
}
