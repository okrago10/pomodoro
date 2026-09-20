import { describe, expect, it } from "vitest";
import { utcCalendar } from "../timer/calendar.ts";
import { barHeightPx, selectedDayLabel, weekdayLabel } from "./recordsCopy.ts";

describe("records copy", () => {
  it("labels weekdays from the day key", () => {
    expect(weekdayLabel("2026-08-14")).toBe("金");
    expect(weekdayLabel("2026-08-15")).toBe("土");
  });

  it("names today and yesterday relative to the current day key", () => {
    expect(selectedDayLabel("2026-08-15", "2026-08-15")).toBe("今日");
    expect(selectedDayLabel("2026-08-14", "2026-08-15")).toBe("昨日");
    expect(selectedDayLabel("2026-08-10", "2026-08-15")).toBe("8/10");
  });
});

describe("bar heights", () => {
  it("makes yesterday and today visually different", () => {
    const yesterday = 50 * 60_000;
    const today = 25 * 60_000;
    const max = Math.max(yesterday, today);
    expect(barHeightPx(yesterday, max)).toBeGreaterThan(barHeightPx(today, max));
    expect(barHeightPx(0, max)).toBeLessThan(barHeightPx(today, max));
  });

  it("keeps a sub-minute leftover as an empty bar even when it is the day's max", () => {
    const leftover = 42_000;
    expect(barHeightPx(leftover, leftover)).toBe(barHeightPx(0, leftover));
    expect(barHeightPx(leftover, leftover)).toBeLessThan(barHeightPx(25 * 60_000, 25 * 60_000));
  });

  it("renders empty bars when every day is below one minute", () => {
    const subMinute = 59_000;
    expect(barHeightPx(0, 0)).toBe(barHeightPx(subMinute, subMinute));
  });
});

describe("selectedDayLabel と Calendar", () => {
  it("月をまたいだ昨日も「昨日」と呼ぶ", () => {
    expect(selectedDayLabel("2026-08-31", "2026-09-01")).toBe("昨日");
  });

  it("渡した Calendar で前日を判定する", () => {
    expect(selectedDayLabel("2026-08-31", "2026-09-01", utcCalendar)).toBe("昨日");
    expect(selectedDayLabel("2026-08-30", "2026-09-01", utcCalendar)).toBe("8/30");
  });
});
