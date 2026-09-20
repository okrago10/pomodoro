import type { FakeClock } from "./clock.ts";

/** setInterval / setTimeout の差し替え口。 */
export interface Scheduler {
  setInterval(handler: () => void, ms: number): number;
  clearInterval(id: number): void;
  setTimeout(handler: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

export const windowScheduler: Scheduler = {
  setInterval: (handler, ms) => window.setInterval(handler, ms),
  clearInterval: (id) => {
    window.clearInterval(id);
  },
  setTimeout: (handler, ms) => window.setTimeout(handler, ms),
  clearTimeout: (id) => {
    window.clearTimeout(id);
  },
};

export interface ManualScheduler extends Scheduler {
  /** 時計を ms 進め、その間に期限が来たものを古い順に実行する。 */
  advance(ms: number): void;
  /** まだ実行を待っているものの数。 */
  pending(): number;
}

interface ScheduledTask {
  at: number;
  /** 繰り返し間隔。1 回だけのものは null。 */
  readonly every: number | null;
  readonly handler: () => void;
}

/**
 * テスト用のアダプター。時計は渡された FakeClock を使い、
 * ハンドラを呼ぶ時点の時刻とハンドラが見る時刻を一致させる。
 */
export function createManualScheduler(clock: FakeClock): ManualScheduler {
  const tasks = new Map<number, ScheduledTask>();
  let nextId = 1;

  function add(handler: () => void, ms: number, every: number | null): number {
    const id = nextId++;
    tasks.set(id, { at: clock.now() + Math.max(0, ms), every, handler });
    return id;
  }

  /** 期限の来た一番古いものを取り出す。繰り返しのものは次回に付け替える。 */
  function takeDue(target: number): { at: number; handler: () => void } | null {
    let dueId: number | null = null;
    let due: ScheduledTask | null = null;
    for (const [id, task] of tasks) {
      if (task.at <= target && (due === null || task.at < due.at)) {
        dueId = id;
        due = task;
      }
    }
    if (dueId === null || due === null) {
      return null;
    }
    const at = due.at;
    if (due.every === null) {
      tasks.delete(dueId);
    } else {
      due.at = at + due.every;
    }
    return { at, handler: due.handler };
  }

  return {
    setInterval: (handler, ms) => add(handler, ms, Math.max(1, ms)),
    setTimeout: (handler, ms) => add(handler, ms, null),
    clearInterval: (id) => {
      tasks.delete(id);
    },
    clearTimeout: (id) => {
      tasks.delete(id);
    },
    advance(ms) {
      const target = clock.now() + ms;
      for (let due = takeDue(target); due !== null; due = takeDue(target)) {
        clock.advance(Math.max(0, due.at - clock.now()));
        due.handler();
      }
      clock.advance(Math.max(0, target - clock.now()));
    },
    pending: () => tasks.size,
  };
}
