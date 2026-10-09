import type { PhaseFeedback } from "../notify/phaseFeedback.ts";
import type { Calendar } from "./calendar.ts";
import type { Clock } from "./clock.ts";
import type { DailyWorkStore } from "./dailyWorkStore.ts";
import { createTimerEngine, type TimerSnapshot } from "./engine.ts";
import type { Scheduler } from "./scheduler.ts";
import type { Visibility } from "./visibility.ts";

const TICK_MS = 250;
/** 締切ちょうどに起こすと取りこぼすことがあるので、少し後ろで起こす。 */
const DEADLINE_MARGIN_MS = 30;

export interface TimerRuntimeDeps {
  readonly clock: Clock;
  readonly calendar: Calendar;
  readonly store: DailyWorkStore;
  readonly feedback: PhaseFeedback;
  readonly scheduler: Scheduler;
  readonly visibility: Visibility;
}

/** メソッドは this に依存しないので、取り出してそのまま渡してよい。 */
export interface TimerRuntime {
  /** 値が変わったときだけ別のオブジェクトになる。 */
  getSnapshot(): TimerSnapshot;
  subscribe(listener: () => void): () => void;
  start(): Promise<void>;
  pause(): void;
  reset(): void;
}

function sameSnapshot(a: TimerSnapshot, b: TimerSnapshot): boolean {
  return (
    a.status === b.status &&
    a.remainingMs === b.remainingMs &&
    a.todayWorkMs === b.todayWorkMs &&
    a.position.stepIndex === b.position.stepIndex &&
    a.position.phase._tag === b.position.phase._tag
  );
}

/**
 * タイマーの駆動を React の外で持つ。250ms ごとの追いつき、
 * 締切に合わせた 1 回きりの起床、画面が前面に戻ったときの追いつきを
 * すべてここで見る。
 *
 * タイマー・前面復帰の監視・keep-alive を握るのは購読者がいる間だけで、
 * 最後の購読が外れたら手放す。後片付けの入口は購読の解除ひとつだけにしてある。
 */
export function createTimerRuntime(deps: TimerRuntimeDeps): TimerRuntime {
  const { clock, calendar, store, feedback, scheduler, visibility } = deps;
  const engine = createTimerEngine(clock, calendar, store);
  const listeners = new Set<() => void>();

  let current = engine.tick();
  let intervalId: number | null = null;
  let deadlineId: number | null = null;
  let stopWatchingVisibility: (() => void) | null = null;
  /** deadlineId のタイマーが狙っている締切。 */
  let scheduledFor: number | null = null;

  /** 知らせられなくてもタイマーは止めない。engine の永続化と同じ扱い。 */
  function tryFeedback(run: () => void): void {
    try {
      run();
    } catch {
      // 通知・音・振動の失敗はタイマーに影響させない。
    }
  }

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
        catchUp();
      },
      Math.max(0, deadline - clock.now()) + DEADLINE_MARGIN_MS,
    );
  }

  /**
   * engine の操作のあとは必ずここを通す。どの操作の途中で締切を越えても、
   * たまった遷移をその場で知らせ、次の締切を張り直す。
   */
  function settle(next: TimerSnapshot): void {
    const transitions = engine.takeTransitions();
    publish(next);
    for (const transition of transitions) {
      tryFeedback(() => {
        feedback.announce(transition.from.phase, transition.to.phase);
      });
    }
    scheduleDeadline();
  }

  function catchUp(): void {
    settle(engine.tick());
  }

  function stopDriving(): void {
    if (intervalId !== null) {
      scheduler.clearInterval(intervalId);
      intervalId = null;
    }
    clearDeadline();
    stopWatchingVisibility?.();
    stopWatchingVisibility = null;
  }

  return {
    getSnapshot: () => current,

    subscribe(listener) {
      listeners.add(listener);
      intervalId ??= scheduler.setInterval(catchUp, TICK_MS);
      stopWatchingVisibility ??= visibility.onVisible(catchUp);
      catchUp();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          stopDriving();
          tryFeedback(() => {
            feedback.stopKeepAlive();
          });
        }
      };
    },

    async start() {
      try {
        await feedback.prepare();
      } catch {
        // 通知の許可や音の下準備に失敗しても、タイマーは始める。
      }
      tryFeedback(() => {
        feedback.startKeepAlive();
      });
      settle(engine.start());
    },

    pause() {
      tryFeedback(() => {
        feedback.stopKeepAlive();
      });
      settle(engine.pause());
    },

    reset() {
      tryFeedback(() => {
        feedback.stopKeepAlive();
      });
      settle(engine.reset());
    },
  };
}
