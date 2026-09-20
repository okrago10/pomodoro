import type { PhaseFeedback } from "../notify/phaseFeedback.ts";
import type { Calendar } from "./calendar.ts";
import type { Clock } from "./clock.ts";
import type { DailyWorkStore } from "./dailyWorkStore.ts";
import { createTimerEngine, type TimerSnapshot } from "./engine.ts";
import type { Scheduler } from "./scheduler.ts";

const TICK_MS = 250;
/** 締切ちょうどに起こすと取りこぼすことがあるので、少し後ろで起こす。 */
const DEADLINE_MARGIN_MS = 30;

export interface TimerRuntimeDeps {
  readonly clock: Clock;
  readonly calendar: Calendar;
  readonly store: DailyWorkStore;
  readonly feedback: PhaseFeedback;
  readonly scheduler: Scheduler;
}

export interface TimerRuntime {
  /** 値が変わったときだけ別のオブジェクトになる。 */
  getSnapshot(): TimerSnapshot;
  subscribe(listener: () => void): () => void;
  start(): Promise<void>;
  pause(): void;
  reset(): void;
  /** 画面が前面に戻ったときなど、外から時計に追いつかせる。 */
  sync(): void;
  /** 購読が終わったあとの後片付け。 */
  dispose(): void;
}

function sameSnapshot(a: TimerSnapshot, b: TimerSnapshot): boolean {
  return (
    a.status === b.status &&
    a.remainingMs === b.remainingMs &&
    a.todayWorkMs === b.todayWorkMs &&
    a.position.stepIndex === b.position.stepIndex
  );
}

/**
 * タイマーの駆動を React の外で持つ。250ms ごとの追いつきと、
 * 締切に合わせた 1 回きりの起床の両方をここで面倒を見る。
 * タイマーを実際に握るのは購読者がいる間だけ。
 */
export function createTimerRuntime(deps: TimerRuntimeDeps): TimerRuntime {
  const { clock, calendar, store, feedback, scheduler } = deps;
  const engine = createTimerEngine(clock, calendar, store);
  const listeners = new Set<() => void>();

  let current = engine.snapshot();
  let intervalId: number | null = null;
  let deadlineId: number | null = null;
  /** deadlineId のタイマーが狙っている締切。 */
  let scheduledFor: number | null = null;

  function publish(next: TimerSnapshot): void {
    if (sameSnapshot(current, next)) {
      return;
    }
    current = next;
    for (const listener of listeners) {
      listener();
    }
  }

  function clearDeadline(): void {
    if (deadlineId !== null) {
      scheduler.clearTimeout(deadlineId);
      deadlineId = null;
    }
    scheduledFor = null;
  }

  function scheduleDeadline(): void {
    const deadline = listeners.size === 0 ? null : engine.runningDeadlineMs();
    if (deadlineId !== null && deadline === scheduledFor) {
      // 同じ締切を狙うタイマーがもう動いている。250ms ごとに張り替えない。
      return;
    }
    clearDeadline();
    if (deadline === null) {
      return;
    }
    scheduledFor = deadline;
    deadlineId = scheduler.setTimeout(
      () => {
        deadlineId = null;
        scheduledFor = null;
        sync();
      },
      Math.max(0, deadline - clock.now()) + DEADLINE_MARGIN_MS,
    );
  }

  function sync(): void {
    const next = engine.tick();
    const transitions = engine.takeTransitions();
    publish(next);
    for (const transition of transitions) {
      feedback.announce(transition.from.phase._tag, transition.to.phase._tag);
    }
    scheduleDeadline();
  }

  function stopTimers(): void {
    if (intervalId !== null) {
      scheduler.clearInterval(intervalId);
      intervalId = null;
    }
    clearDeadline();
  }

  return {
    getSnapshot: () => current,

    subscribe(listener) {
      listeners.add(listener);
      intervalId ??= scheduler.setInterval(sync, TICK_MS);
      sync();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          stopTimers();
        }
      };
    },

    async start() {
      await feedback.prepare();
      feedback.startKeepAlive();
      publish(engine.start());
      scheduleDeadline();
    },

    pause() {
      feedback.stopKeepAlive();
      publish(engine.pause());
      scheduleDeadline();
    },

    reset() {
      feedback.stopKeepAlive();
      publish(engine.reset());
      scheduleDeadline();
    },

    sync,

    dispose() {
      stopTimers();
      feedback.stopKeepAlive();
    },
  };
}
