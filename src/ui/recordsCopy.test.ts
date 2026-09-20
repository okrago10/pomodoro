import { describe, expect, it } from "vitest";
import type { RecentDailyWork } from "../timer/dailyWorkReader.ts";
import { barHeightPx, selectedDay, selectedDayLabel, weekdayLabel } from "./recordsCopy.ts";

const MINUTE_MS = 60_000;

describe("records copy", () => {
  it("labels weekdays from the day key", () => {
    expect(weekdayLabel("2026-08-14")).toBe("金");
    expect(weekdayLabel("2026-08-15")).toBe("土");
  });

  it("壊れた dayKey でも落ちない", () => {
    expect(weekdayLabel("")).toBe("");
  });

  it("names today and yesterday relative to the current day key", () => {
    expect(selectedDayLabel("2026-08-15", "2026-08-15")).toBe("今日");
    expect(selectedDayLabel("2026-08-14", "2026-08-15")).toBe("昨日");
    expect(selectedDayLabel("2026-08-10", "2026-08-15")).toBe("8/10");
  });

  it("月をまたいだ昨日も「昨日」と呼ぶ", () => {
    expect(selectedDayLabel("2026-08-31", "2026-09-01")).toBe("昨日");
    expect(selectedDayLabel("2026-08-30", "2026-09-01")).toBe("8/30");
  });
});

describe("selectedDay", () => {
  const work: RecentDailyWork = {
    todayKey: "2026-08-14",
    days: [
      { dayKey: "2026-08-13", ms: 25 * MINUTE_MS },
      { dayKey: "2026-08-14", ms: 5 * MINUTE_MS },
    ],
    maxMs: 25 * MINUTE_MS,
  };

  it("まだ選んでいないときは今日を返す", () => {
    expect(selectedDay(work, null).dayKey).toBe("2026-08-14");
  });

  it("選んだ日を返す", () => {
    expect(selectedDay(work, "2026-08-13")).toEqual({
      dayKey: "2026-08-13",
      ms: 25 * MINUTE_MS,
    });
  });

  it("選んだ日が枠から外れていたら今日に戻す", () => {
    expect(selectedDay(work, "2026-08-01").dayKey).toBe("2026-08-14");
  });

  it("枠が空でも今日を返す", () => {
    expect(selectedDay({ todayKey: "2026-08-14", days: [], maxMs: 0 }, null)).toEqual({
      dayKey: "2026-08-14",
      ms: 0,
    });
  });
});

describe("bar heights", () => {
  it("makes yesterday and today visually different", () => {
    const yesterday = 50 * MINUTE_MS;
    const today = 25 * MINUTE_MS;
    const max = Math.max(yesterday, today);
    expect(barHeightPx(yesterday, max)).toBeGreaterThan(barHeightPx(today, max));
    expect(barHeightPx(0, max)).toBeLessThan(barHeightPx(today, max));
  });

  it("keeps a sub-minute leftover as an empty bar even when it is the day's max", () => {
    const leftover = 42_000;
    expect(barHeightPx(leftover, leftover)).toBe(barHeightPx(0, leftover));
    expect(barHeightPx(leftover, leftover)).toBeLessThan(
      barHeightPx(25 * MINUTE_MS, 25 * MINUTE_MS),
    );
  });

  it("renders empty bars when every day is below one minute", () => {
    const subMinute = 59_000;
    expect(barHeightPx(0, 0)).toBe(barHeightPx(subMinute, subMinute));
  });

  it("0 の日は最大値によらず同じ空の棒にする", () => {
    expect(barHeightPx(0, 0)).toBe(barHeightPx(0, 25 * MINUTE_MS));
  });

  it("最大が 1 分でも、埋まった棒は空の棒より高い", () => {
    expect(barHeightPx(MINUTE_MS, MINUTE_MS)).toBeGreaterThan(barHeightPx(0, MINUTE_MS));
  });
});
