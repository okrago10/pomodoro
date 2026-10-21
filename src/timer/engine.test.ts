import { describe, expect, it } from "vitest";
import { utcCalendar } from "./calendar.ts";
import { FakeClock } from "./clock.ts";
import { createMemoryDailyWorkStore, type DailyWorkStore } from "./dailyWorkStore.ts";
import { phaseDurationMs } from "../domain/cycle.ts";
import { DEFAULT_TIMER_SETTINGS, parseTimerSettings } from "../domain/timerSettings.ts";
import { createTimerEngine } from "./engine.ts";

const SECOND = 1_000;
const MINUTE = 60_000;

describe("timer engine", () => {
  it("starts idle on a 25-minute work phase", () => {
    const engine = createTimerEngine(new FakeClock());
    const snap = engine.tick();
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
    const pausedRemaining = engine.tick().remainingMs;

    clock.advance(10 * MINUTE);
    expect(engine.tick().remainingMs).toBe(pausedRemaining);
    expect(engine.tick().status).toBe("paused");
    expect(engine.tick().position.phase._tag).toBe("Work");

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
    expect(engine.tick().position.phase._tag).toBe("ShortBreak");

    const snap = engine.reset();
    expect(snap.status).toBe("idle");
    expect(snap.position.workNumber).toBe(1);
    expect(snap.position.phase._tag).toBe("Work");
    expect(snap.remainingMs).toBe(25 * MINUTE);

    clock.advance(MINUTE);
    expect(engine.tick().remainingMs).toBe(25 * MINUTE);
    expect(engine.tick().status).toBe("idle");
  });

  it("moves on to the next phase when paused after the deadline", () => {
    const clock = new FakeClock();
    const engine = createTimerEngine(clock, utcCalendar);
    engine.start();
    clock.advance(25 * MINUTE + 90 * SECOND);

    const snap = engine.pause();
    expect(snap.status).toBe("paused");
    expect(snap.position.phase._tag).toBe("ShortBreak");
    expect(snap.remainingMs).toBe(5 * MINUTE - 90 * SECOND);
    expect(snap.todayWorkMs).toBe(25 * MINUTE);
    expect(engine.takeTransitions().map((item) => item.to.phase._tag)).toEqual(["ShortBreak"]);
  });

  it("keeps phase aligned to the original deadline when the clock jumps", () => {
    const clock = new FakeClock();
    const engine = createTimerEngine(clock);
    engine.start();
    clock.advance(25 * MINUTE + 90 * SECOND);
    const snap = engine.tick();
    expect(snap.position.phase._tag).toBe("ShortBreak");
    expect(snap.remainingMs).toBe(5 * MINUTE - 90 * SECOND);
    expect(phaseDurationMs(snap.position.phase, DEFAULT_TIMER_SETTINGS)).toBe(5 * MINUTE);
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
    expect(engine.tick().todayWorkMs).toBe(10 * MINUTE);

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

  it("keeps all work from a multi-phase clock jump when reset, without reporting its transitions", () => {
    const clock = new FakeClock();
    const engine = createTimerEngine(clock, utcCalendar);
    engine.start();
    clock.advance(25 * MINUTE + 5 * MINUTE + 25 * MINUTE + 2 * MINUTE);

    const snap = engine.reset();
    expect(snap.status).toBe("idle");
    expect(snap.position.workNumber).toBe(1);
    expect(snap.todayWorkMs).toBe(50 * MINUTE);
    expect(engine.takeTransitions()).toEqual([]);
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
    expect(second.tick().todayWorkMs).toBe(12 * MINUTE);
    expect(second.tick().status).toBe("idle");
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

describe("timer engine settings", () => {
  it("runs the cycle with the settings it was created with", () => {
    const clock = new FakeClock();
    const settings = parseTimerSettings({ workMinutes: 50, worksBeforeLongBreak: 3 });
    const engine = createTimerEngine(clock, utcCalendar, createMemoryDailyWorkStore(), settings);
    expect(engine.tick().remainingMs).toBe(50 * MINUTE);
    expect(engine.tick().settings).toBe(settings);

    engine.start();
    clock.advance(50 * MINUTE + 5 * MINUTE + 50 * MINUTE + 5 * MINUTE + 50 * MINUTE);
    const snap = engine.tick();

    expect(engine.takeTransitions().map((item) => item.to.phase._tag)).toEqual([
      "ShortBreak",
      "Work",
      "ShortBreak",
      "Work",
      "LongBreak",
    ]);
    expect(snap.remainingMs).toBe(15 * MINUTE);
  });

  it("shows a new work length at once while idle", () => {
    const engine = createTimerEngine(new FakeClock());

    const snap = engine.updateSettings({ workMinutes: 50 });

    expect(snap.status).toBe("idle");
    expect(snap.remainingMs).toBe(50 * MINUTE);
    expect(snap.settings.workMinutes).toBe(50);
    expect(engine.tick().remainingMs).toBe(50 * MINUTE);
  });

  it("keeps the running phase's deadline and uses the new lengths from the next phase", () => {
    const clock = new FakeClock();
    const engine = createTimerEngine(clock);
    engine.start();
    clock.advance(10 * MINUTE);

    expect(engine.updateSettings({ workMinutes: 50, shortBreakMinutes: 10 }).remainingMs).toBe(
      15 * MINUTE,
    );

    clock.advance(15 * MINUTE);
    const shortBreak = engine.tick();
    expect(shortBreak.position.phase._tag).toBe("ShortBreak");
    expect(shortBreak.remainingMs).toBe(10 * MINUTE);

    clock.advance(10 * MINUTE);
    const secondWork = engine.tick();
    expect(secondWork.position.phase._tag).toBe("Work");
    expect(secondWork.remainingMs).toBe(50 * MINUTE);
  });

  it("keeps a paused phase's remaining time", () => {
    const clock = new FakeClock();
    const engine = createTimerEngine(clock);
    engine.start();
    clock.advance(10 * MINUTE);
    engine.pause();

    const snap = engine.updateSettings({ workMinutes: 50 });
    expect(snap.status).toBe("paused");
    expect(snap.remainingMs).toBe(15 * MINUTE);

    engine.start();
    clock.advance(15 * MINUTE + 5 * MINUTE);
    expect(engine.tick().remainingMs).toBe(50 * MINUTE);
  });

  it("takes the long break after the current work when the cycle shrinks below it", () => {
    const clock = new FakeClock();
    const settings = parseTimerSettings({ worksBeforeLongBreak: 4 });
    const engine = createTimerEngine(clock, utcCalendar, createMemoryDailyWorkStore(), settings);
    engine.start();
    clock.advance(25 * MINUTE + 5 * MINUTE + 25 * MINUTE + 5 * MINUTE);
    expect(engine.tick().position.workNumber).toBe(3);

    engine.updateSettings({ worksBeforeLongBreak: 2 });
    clock.advance(25 * MINUTE);

    expect(engine.tick().position.phase._tag).toBe("LongBreak");
  });

  it("replays time that passed before a change with the old lengths", () => {
    const clock = new FakeClock();
    const engine = createTimerEngine(clock);
    engine.start();
    clock.advance(25 * MINUTE + 90 * SECOND);

    const snap = engine.updateSettings({ shortBreakMinutes: 10 });

    expect(snap.position.phase._tag).toBe("ShortBreak");
    expect(snap.remainingMs).toBe(5 * MINUTE - 90 * SECOND);
    expect(engine.takeTransitions().map((item) => item.to.phase._tag)).toEqual(["ShortBreak"]);
  });

  it("ignores out-of-range values and keeps the same settings when nothing changes", () => {
    const engine = createTimerEngine(new FakeClock());
    const before = engine.tick().settings;

    const ignored = engine.updateSettings({ workMinutes: 0, shortBreakMinutes: Number.NaN });
    expect(ignored.settings).toBe(before);
    expect(ignored.remainingMs).toBe(25 * MINUTE);
    expect(engine.updateSettings({ workMinutes: 25 }).settings).toBe(before);
    expect(engine.updateSettings({ workMinutes: 26 }).settings).not.toBe(before);
  });

  it("resets to the first work with its new length", () => {
    const clock = new FakeClock();
    const engine = createTimerEngine(clock);
    engine.start();
    clock.advance(30 * MINUTE);
    engine.updateSettings({ workMinutes: 50 });

    const snap = engine.reset();

    expect(snap.position.workNumber).toBe(1);
    expect(snap.position.phase._tag).toBe("Work");
    expect(snap.remainingMs).toBe(50 * MINUTE);
  });
});
