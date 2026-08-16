import { describe, expect, it } from "vitest";
import { floorToMinuteMs, formatRemaining, formatTodayWork } from "./format.ts";

describe("formatRemaining", () => {
  it("renders mm:ss", () => {
    expect(formatRemaining(25 * 60_000)).toBe("25:00");
    expect(formatRemaining(5 * 60_000 - 1_000)).toBe("04:59");
    expect(formatRemaining(0)).toBe("00:00");
  });
});

describe("floorToMinuteMs", () => {
  it("floors sub-minute work to zero", () => {
    expect(floorToMinuteMs(0)).toBe(0);
    expect(floorToMinuteMs(42_000)).toBe(0);
    expect(floorToMinuteMs(59_000)).toBe(0);
  });

  it("keeps full minutes and drops leftover seconds", () => {
    expect(floorToMinuteMs(60_000)).toBe(60_000);
    expect(floorToMinuteMs(90_000)).toBe(60_000);
  });
});

describe("formatTodayWork", () => {
  it("renders minutes, hours, and mixed durations", () => {
    expect(formatTodayWork(0)).toBe("0分");
    expect(formatTodayWork(59_000)).toBe("0分");
    expect(formatTodayWork(90_000)).toBe("1分");
    expect(formatTodayWork(25 * 60_000)).toBe("25分");
    expect(formatTodayWork(60 * 60_000)).toBe("1時間");
    expect(formatTodayWork(85 * 60_000)).toBe("1時間25分");
  });
});
