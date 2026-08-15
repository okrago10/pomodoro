import { describe, expect, it } from "vitest";
import { FakeClock } from "./clock.ts";
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
});
