import { Effect } from "effect";
import {
  initialCyclePosition,
  nextPhase,
  phaseDurationMinutes,
  type CyclePosition,
} from "../domain/cycle.ts";
import type { Clock } from "./clock.ts";

export type TimerStatus = "idle" | "running" | "paused";

export interface TimerSnapshot {
  readonly position: CyclePosition;
  readonly remainingMs: number;
  readonly status: TimerStatus;
}

export function phaseDurationMs(position: CyclePosition): number {
  return phaseDurationMinutes(position.phase) * 60_000;
}

export function createTimerEngine(clock: Clock) {
  let position: CyclePosition = initialCyclePosition;
  let status: TimerStatus = "idle";
  let deadlineMs: number | null = null;
  let remainingMs = phaseDurationMs(position);

  function snapshot(): TimerSnapshot {
    if (status === "running" && deadlineMs !== null) {
      remainingMs = Math.max(0, deadlineMs - clock.now());
    }
    return { position, remainingMs, status };
  }

  function start(): TimerSnapshot {
    if (status === "running") {
      return snapshot();
    }
    if (status === "idle") {
      remainingMs = phaseDurationMs(position);
    }
    deadlineMs = clock.now() + remainingMs;
    status = "running";
    return snapshot();
  }

  function pause(): TimerSnapshot {
    if (status !== "running") {
      return snapshot();
    }
    const now = clock.now();
    remainingMs = Math.max(0, (deadlineMs ?? now) - now);
    deadlineMs = null;
    status = "paused";
    return snapshot();
  }

  function tick(): TimerSnapshot {
    if (status !== "running" || deadlineMs === null) {
      return snapshot();
    }

    const now = clock.now();
    let nextDeadline: number = deadlineMs;
    while (now >= nextDeadline) {
      position = Effect.runSync(nextPhase(position));
      nextDeadline += phaseDurationMs(position);
    }
    deadlineMs = nextDeadline;
    remainingMs = Math.max(0, nextDeadline - now);
    return snapshot();
  }

  return { snapshot, start, pause, tick };
}

export type TimerEngine = ReturnType<typeof createTimerEngine>;
