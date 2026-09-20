import { describe, expect, it } from "vitest";
import { createRecordingPhaseFeedback } from "../notify/phaseFeedback.ts";
import { utcCalendar } from "./calendar.ts";
import { FakeClock } from "./clock.ts";
import { createMemoryDailyWorkStore } from "./dailyWorkStore.ts";
import type { TimerSnapshot } from "./engine.ts";
import { createManualScheduler, type ManualScheduler } from "./scheduler.ts";
import { createTimerRuntime } from "./timerRuntime.ts";

const MINUTE_MS = 60_000;
const WORK_MS = 25 * MINUTE_MS;
const SHORT_BREAK_MS = 5 * MINUTE_MS;

function setup(wrapScheduler: (base: ManualScheduler) => ManualScheduler = (base) => base) {
  const clock = new FakeClock(Date.UTC(2026, 7, 14, 1, 0, 0));
  const scheduler = wrapScheduler(createManualScheduler(clock));
  const feedback = createRecordingPhaseFeedback();
  const store = createMemoryDailyWorkStore();
  const runtime = createTimerRuntime({
    clock,
    calendar: utcCalendar,
    store,
    feedback,
    scheduler,
  });

  const changes: TimerSnapshot[] = [];
  const unsubscribe = runtime.subscribe(() => {
    changes.push(runtime.getSnapshot());
  });

  return { clock, scheduler, feedback, store, runtime, changes, unsubscribe };
}

describe("timer runtime の駆動", () => {
  it("購読している間は 250ms ごとに残り時間を詰める", async () => {
    const { runtime, scheduler, changes } = setup();

    await runtime.start();
    changes.length = 0;
    scheduler.advance(1000);

    expect(changes).toHaveLength(4);
    expect(runtime.getSnapshot().remainingMs).toBe(WORK_MS - 1000);
  });

  it("値が変わらない間は購読者に知らせない", () => {
    const { scheduler, changes, runtime } = setup();

    scheduler.advance(10 * 1000);

    expect(changes).toEqual([]);
    expect(runtime.getSnapshot().status).toBe("idle");
  });

  it("購読をやめるとタイマーを手放す", async () => {
    const { runtime, scheduler, unsubscribe } = setup();

    await runtime.start();
    expect(scheduler.pending()).toBeGreaterThan(0);

    unsubscribe();

    expect(scheduler.pending()).toBe(0);
  });

  it("締切を過ぎたら次のフェーズへ進み、1 回だけ知らせる", async () => {
    const { runtime, scheduler, feedback } = setup();

    await runtime.start();
    scheduler.advance(WORK_MS);

    expect(feedback.announcements).toEqual([{ endedTag: "Work", nextTag: "ShortBreak" }]);
    expect(runtime.getSnapshot().position.phase._tag).toBe("ShortBreak");
    expect(runtime.getSnapshot().remainingMs).toBe(SHORT_BREAK_MS);
  });

  it("背面にいる間に時計が飛んでも、sync で飛んだ順に知らせる", async () => {
    const { runtime, clock, feedback } = setup();

    await runtime.start();
    clock.advance(55 * MINUTE_MS);
    runtime.sync();

    expect(feedback.announcements).toEqual([
      { endedTag: "Work", nextTag: "ShortBreak" },
      { endedTag: "ShortBreak", nextTag: "Work" },
      { endedTag: "Work", nextTag: "LongBreak" },
    ]);
    expect(runtime.getSnapshot().position.phase._tag).toBe("LongBreak");
  });

  it("締切が同じ間はそのタイマーを張り替えない", async () => {
    let timeouts = 0;
    const { runtime, scheduler } = setup((base) => ({
      ...base,
      setTimeout(handler, ms) {
        timeouts++;
        return base.setTimeout(handler, ms);
      },
    }));

    await runtime.start();
    const afterStart = timeouts;
    scheduler.advance(10 * 1000);

    expect(afterStart).toBe(1);
    expect(timeouts).toBe(1);

    scheduler.advance(WORK_MS);

    // 次のフェーズに入った分だけ張り直す。
    expect(timeouts).toBe(2);
    expect(runtime.getSnapshot().position.phase._tag).toBe("ShortBreak");
  });

  it("作業した分だけを今日の記録に足す", async () => {
    const { runtime, scheduler } = setup();

    await runtime.start();
    scheduler.advance(WORK_MS + SHORT_BREAK_MS);

    expect(runtime.getSnapshot().todayWorkMs).toBe(WORK_MS);
  });
});

describe("timer runtime と通知の順序", () => {
  it("start は prepare を待ってから keep-alive とタイマーを始める", async () => {
    const { runtime, feedback } = setup();

    const started = runtime.start();

    expect(feedback.calls).toEqual(["prepare"]);
    expect(runtime.getSnapshot().status).toBe("idle");

    await started;

    expect(feedback.calls).toEqual(["prepare", "startKeepAlive"]);
    expect(runtime.getSnapshot().status).toBe("running");
  });

  it("pause と reset は keep-alive を止める", async () => {
    const { runtime, feedback } = setup();

    await runtime.start();
    runtime.pause();
    expect(feedback.calls.at(-1)).toBe("stopKeepAlive");
    expect(runtime.getSnapshot().status).toBe("paused");

    runtime.reset();
    expect(feedback.calls.at(-1)).toBe("stopKeepAlive");
    expect(runtime.getSnapshot().status).toBe("idle");
  });

  it("dispose は keep-alive とタイマーの両方を止める", async () => {
    const { runtime, scheduler, feedback } = setup();

    await runtime.start();
    runtime.dispose();

    expect(feedback.calls.at(-1)).toBe("stopKeepAlive");
    expect(scheduler.pending()).toBe(0);
  });
});
