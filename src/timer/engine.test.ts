import { describe, expect, it } from "vitest";
import { utcCalendar } from "./calendar.ts";
import { FakeClock } from "./clock.ts";
import { createMemoryDailyWorkStore, type DailyWorkStore } from "./dailyWorkStore.ts";
import { createTimerEngine, phaseDurationMs } from "./engine.ts";

const SECOND = 1_000;
const MINUTE = 60_000;

describe("timer engine", () => {
  it("starts idle on a 25-minute work phase", () => {
    const engine = createTimerEngine(new FakeClock());
    const snap = engine.snapshot();
    expect(snap.status).toBe("idle");
    expect(snap.position.phase._tag).toBe("Work");
    expect(snap.remainingMs).toBe(25 * MINUTE);
  });

  it("counts down from wall-clock time while running", () => {
    const clock = new FakeClock(10_000);
    const engine = createTimerEngine(clock);
    engine.start();
    clock.advance(3 * SECOND);
    const snap = engine.tick();
    expect(snap.status).toBe("running");
    expect(snap.remainingMs).toBe(25 * MINUTE - 3 * SECOND);
  });

  it("does not advance while paused, then resumes remaining time", () => {
    const clock = new FakeClock();
    const engine = createTimerEngine(clock);
    engine.start();
    clock.advance(40 * SECOND);
    engine.tick();
    engine.pause();
    const pausedRemaining = engine.snapshot().remainingMs;

    clock.advance(10 * MINUTE);
    expect(engine.tick().remainingMs).toBe(pausedRemaining);
    expect(engine.snapshot().status).toBe("paused");
    expect(engine.snapshot().position.phase._tag).toBe("Work");

    engine.start();
    clock.advance(5 * SECOND);
    const resumed = engine.tick();
    expect(resumed.status).toBe("running");
    expect(resumed.remainingMs).toBe(pausedRemaining - 5 * SECOND);
  });

  it("auto-starts a 5-minute short break after the first 25-minute work", () => {
    const clock = new FakeClock();
    const engine = createTimerEngine(clock);
    engine.start();
    clock.advance(25 * MINUTE);
    const snap = engine.tick();
    expect(snap.position.phase._tag).toBe("ShortBreak");
    expect(snap.status).toBe("running");
    expect(snap.remainingMs).toBe(5 * MINUTE);
    const transitions = engine.takeTransitions();
    expect(transitions).toHaveLength(1);
    expect(transitions[0]?.from.phase._tag).toBe("Work");
    expect(transitions[0]?.to.phase._tag).toBe("ShortBreak");
  });

  it("then auto-starts the second work, then a 15-minute long break", () => {
    const clock = new FakeClock();
    const engine = createTimerEngine(clock);
    engine.start();

    clock.advance(25 * MINUTE);
    expect(engine.tick().position.phase._tag).toBe("ShortBreak");

    clock.advance(5 * MINUTE);
    const secondWork = engine.tick();
    expect(secondWork.position.phase._tag).toBe("Work");
    expect(secondWork.remainingMs).toBe(25 * MINUTE);

    clock.advance(25 * MINUTE);
    const longBreak = engine.tick();
    expect(longBreak.position.phase._tag).toBe("LongBreak");
    expect(longBreak.remainingMs).toBe(15 * MINUTE);
    expect(longBreak.status).toBe("running");
  });

  it("resets to the first idle work phase after confirmation-style reset", () => {
    const clock = new FakeClock();
    const engine = createTimerEngine(clock);
    engine.start();
    clock.advance(25 * MINUTE + 90 * SECOND);
    engine.tick();
    expect(engine.snapshot().position.phase._tag).toBe("ShortBreak");

    const snap = engine.reset();
    expect(snap.status).toBe("idle");
    expect(snap.position.stepIndex).toBe(0);
    expect(snap.position.phase._tag).toBe("Work");
    expect(snap.remainingMs).toBe(25 * MINUTE);

    clock.advance(MINUTE);
    expect(engine.tick().remainingMs).toBe(25 * MINUTE);
    expect(engine.snapshot().status).toBe("idle");
  });

  it("keeps phase aligned to the original deadline when the clock jumps", () => {
    const clock = new FakeClock();
    const engine = createTimerEngine(clock);
    engine.start();
    clock.advance(25 * MINUTE + 90 * SECOND);
    const snap = engine.tick();
    expect(snap.position.phase._tag).toBe("ShortBreak");
    expect(snap.remainingMs).toBe(5 * MINUTE - 90 * SECOND);
    expect(phaseDurationMs(snap.position)).toBe(5 * MINUTE);
  });

  it("reports each skipped phase when the clock jumps past more than one", () => {
    const clock = new FakeClock();
    const engine = createTimerEngine(clock);
    engine.start();
    clock.advance(25 * MINUTE + 5 * MINUTE);
    engine.tick();
    const transitions = engine.takeTransitions();
    expect(transitions.map((item) => item.to.phase._tag)).toEqual(["ShortBreak", "Work"]);
    expect(engine.takeTransitions()).toEqual([]);
  });

  it("adds 25 minutes of work after a completed work phase, not during the break", () => {
    const clock = new FakeClock();
    const engine = createTimerEngine(clock, utcCalendar);
    engine.start();
    clock.advance(25 * MINUTE);
    const afterWork = engine.tick();
    expect(afterWork.todayWorkMs).toBe(25 * MINUTE);
    expect(afterWork.position.phase._tag).toBe("ShortBreak");

    clock.advance(5 * MINUTE);
    const afterBreak = engine.tick();
    expect(afterBreak.todayWorkMs).toBe(25 * MINUTE);
    expect(afterBreak.position.phase._tag).toBe("Work");
  });

  it("does not add work time while paused", () => {
    const clock = new FakeClock();
    const engine = createTimerEngine(clock, utcCalendar);
    engine.start();
    clock.advance(10 * MINUTE);
    engine.tick();
    engine.pause();
    expect(engine.snapshot().todayWorkMs).toBe(10 * MINUTE);

    clock.advance(20 * MINUTE);
    expect(engine.tick().todayWorkMs).toBe(10 * MINUTE);

    engine.start();
    clock.advance(5 * MINUTE);
    expect(engine.tick().todayWorkMs).toBe(15 * MINUTE);
  });

  it("counts only the work portion of a multi-phase clock jump", () => {
    const clock = new FakeClock();
    const engine = createTimerEngine(clock, utcCalendar);
    engine.start();
    clock.advance(25 * MINUTE + 90 * SECOND);
    expect(engine.tick().todayWorkMs).toBe(25 * MINUTE);
  });

  it("keeps today's total when the cycle is reset", () => {
    const clock = new FakeClock();
    const engine = createTimerEngine(clock, utcCalendar);
    engine.start();
    clock.advance(8 * MINUTE);
    engine.tick();
    const snap = engine.reset();
    expect(snap.status).toBe("idle");
    expect(snap.todayWorkMs).toBe(8 * MINUTE);
  });

  it("resets today's total when the calendar day changes", () => {
    const clock = new FakeClock();
    const engine = createTimerEngine(clock, utcCalendar);
    engine.start();
    clock.advance(10 * MINUTE);
    expect(engine.tick().todayWorkMs).toBe(10 * MINUTE);

    engine.pause();
    clock.advance(24 * 60 * MINUTE);
    expect(engine.tick().todayWorkMs).toBe(0);
  });

  it("keeps yesterday and today as separate persisted totals", () => {
    const store = createMemoryDailyWorkStore();
    const startMs = Date.UTC(1970, 0, 1, 23, 50);
    const clock = new FakeClock(startMs);
    const engine = createTimerEngine(clock, utcCalendar, store);
    engine.start();
    clock.advance(20 * MINUTE);
    expect(engine.tick().todayWorkMs).toBe(10 * MINUTE);
    expect(store.get("1970-01-01")).toBe(10 * MINUTE);
    expect(store.get("1970-01-02")).toBe(10 * MINUTE);
  });

  it("loads today's total from persistence after a new engine starts", () => {
    const store = createMemoryDailyWorkStore();
    const clock = new FakeClock();
    const first = createTimerEngine(clock, utcCalendar, store);
    first.start();
    clock.advance(12 * MINUTE);
    first.tick();
    first.pause();

    const second = createTimerEngine(clock, utcCalendar, store);
    expect(second.snapshot().todayWorkMs).toBe(12 * MINUTE);
    expect(second.snapshot().status).toBe("idle");
  });

  it("keeps running when persistence throws", () => {
    const store: DailyWorkStore = {
      get() {
        throw new Error("read failed");
      },
      add() {
        throw new Error("write failed");
      },
    };
    const clock = new FakeClock();
    const engine = createTimerEngine(clock, utcCalendar, store);
    engine.start();
    clock.advance(3 * SECOND);
    const snap = engine.tick();
    expect(snap.status).toBe("running");
    expect(snap.remainingMs).toBe(25 * MINUTE - 3 * SECOND);
    expect(snap.todayWorkMs).toBe(0);
  });
});
