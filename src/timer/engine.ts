import { Effect } from "effect";
import {
  initialCyclePosition,
  isWorkPhase,
  nextPhase,
  phaseDurationMinutes,
  type CyclePosition,
} from "../domain/cycle.ts";
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

export interface PhaseTransition {
  readonly from: CyclePosition;
  readonly to: CyclePosition;
}

export function phaseDurationMs(position: CyclePosition): number {
  return phaseDurationMinutes(position.phase) * 60_000;
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
  let remainingMs = phaseDurationMs(position);
  let todayWorkMs = storedTotal(store, calendar.dayKey(clock.now()));
  let cursorMs = clock.now();
  let pendingTransitions: PhaseTransition[] = [];

  function applyElapsed(from: number, to: number, work: boolean): void {
    if (to <= from) {
      return;
    }
    let start = from;
    while (start < to) {
      const sliceEnd = Math.min(to, calendar.startOfNextDay(start));
      const key = calendar.dayKey(start);
      if (work) {
        try {
          store.add(key, sliceEnd - start);
        } catch {
          // Persistence failures must not stop the timer.
        }
      }
      start = sliceEnd;
    }
  }

  function rollover(now: number): void {
    todayWorkMs = storedTotal(store, calendar.dayKey(now));
  }

  function snapshot(): TimerSnapshot {
    const now = clock.now();
    if (status === "running" && deadlineMs !== null) {
      const until = Math.min(now, deadlineMs);
      applyElapsed(cursorMs, until, isWorkPhase(position.phase));
      cursorMs = until;
      remainingMs = Math.max(0, deadlineMs - now);
    }
    rollover(now);
    return { position, remainingMs, status, todayWorkMs };
  }

  function start(): TimerSnapshot {
    if (status === "running") {
      return snapshot();
    }
    const now = clock.now();
    rollover(now);
    if (status === "idle") {
      remainingMs = phaseDurationMs(position);
    }
    deadlineMs = now + remainingMs;
    status = "running";
    cursorMs = now;
    return snapshot();
  }

  function pause(): TimerSnapshot {
    if (status !== "running") {
      return snapshot();
    }
    const now = clock.now();
    const end = deadlineMs ?? now;
    const until = Math.min(now, end);
    applyElapsed(cursorMs, until, isWorkPhase(position.phase));
    cursorMs = now;
    remainingMs = Math.max(0, end - now);
    deadlineMs = null;
    status = "paused";
    rollover(now);
    return { position, remainingMs, status, todayWorkMs };
  }

  function reset(): TimerSnapshot {
    const now = clock.now();
    if (status === "running") {
      const end = deadlineMs ?? now;
      const until = Math.min(now, end);
      applyElapsed(cursorMs, until, isWorkPhase(position.phase));
    }
    rollover(now);
    position = initialCyclePosition;
    status = "idle";
    deadlineMs = null;
    remainingMs = phaseDurationMs(position);
    cursorMs = now;
    return { position, remainingMs, status, todayWorkMs };
  }

  function tick(): TimerSnapshot {
    if (status !== "running" || deadlineMs === null) {
      return snapshot();
    }

    const now = clock.now();
    let nextDeadline: number = deadlineMs;
    while (now >= nextDeadline) {
      const from = position;
      applyElapsed(cursorMs, nextDeadline, isWorkPhase(position.phase));
      position = Effect.runSync(nextPhase(position));
      pendingTransitions.push({ from, to: position });
      cursorMs = nextDeadline;
      nextDeadline += phaseDurationMs(position);
    }
    applyElapsed(cursorMs, now, isWorkPhase(position.phase));
    cursorMs = now;
    deadlineMs = nextDeadline;
    remainingMs = Math.max(0, nextDeadline - now);
    rollover(now);
    return { position, remainingMs, status, todayWorkMs };
  }

  function takeTransitions(): readonly PhaseTransition[] {
    const transitions = pendingTransitions;
    pendingTransitions = [];
    return transitions;
  }

  function runningDeadlineMs(): number | null {
    return status === "running" ? deadlineMs : null;
  }

  return { snapshot, start, pause, reset, tick, takeTransitions, runningDeadlineMs };
}

export type TimerEngine = ReturnType<typeof createTimerEngine>;
