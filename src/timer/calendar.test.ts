import { describe, expect, it } from "vitest";
import {
  addDays,
  lastNDayKeys,
  localCalendar,
  parseDayKey,
  utcCalendar,
  weekdayIndex,
  type Calendar,
} from "./calendar.ts";

describe("暦日の計算", () => {
  it("addDays は 0 日で同じ dayKey を返す", () => {
    expect(addDays("2026-08-14", 0)).toBe("2026-08-14");
  });

  it("addDays は月をまたぐ", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
  });

  it("addDays は年をまたぐ", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("addDays はうるう年の 2 月 29 日を飛ばさない", () => {
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("addDays は 1 桁の月日を 0 で埋める", () => {
    expect(addDays("2026-01-10", -1)).toBe("2026-01-09");
  });

  it("weekdayIndex は dayKey の曜日を返す", () => {
    expect(weekdayIndex("2026-08-14")).toBe(5);
    expect(weekdayIndex("2026-08-15")).toBe(6);
    expect(weekdayIndex("2026-08-16")).toBe(0);
  });

  it("parseDayKey は dayKey を年月日に分解する", () => {
    expect(parseDayKey("2026-08-09")).toEqual({ year: 2026, month: 8, day: 9 });
  });
});

const calendars: ReadonlyArray<readonly [string, Calendar]> = [
  ["localCalendar", localCalendar],
  ["utcCalendar", utcCalendar],
];

describe.each(calendars)("%s は Calendar の契約を満たす", (_name, calendar) => {
  const ms = Date.UTC(2026, 7, 14, 3, 0, 0);

  it("翌日 0 時の dayKey は、今日の dayKey の 1 日後と一致する", () => {
    expect(calendar.dayKey(calendar.startOfNextDay(ms))).toBe(addDays(calendar.dayKey(ms), 1));
  });

  it("翌日 0 時はその瞬間より後にある", () => {
    expect(calendar.startOfNextDay(ms)).toBeGreaterThan(ms);
  });

  it("lastNDayKeys は、その Calendar の今日で終わる連続した n 日を返す", () => {
    const keys = lastNDayKeys(ms, 3, calendar);

    expect(keys).toHaveLength(3);
    expect(keys.at(-1)).toBe(calendar.dayKey(ms));
    expect(keys[1]).toBe(addDays(keys[0], 1));
    expect(keys[2]).toBe(addDays(keys[1], 1));
  });
});

describe("lastNDayKeys", () => {
  it("今日と、その手前の日を古い順に返す", () => {
    const fridayNoon = new Date(2026, 7, 14, 12, 0, 0, 0).getTime();
    expect(lastNDayKeys(fridayNoon, 3, localCalendar)).toEqual([
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
    ]);
  });

  it("月をまたいでも連続した日を返す", () => {
    const septemberFirstNoon = new Date(2026, 8, 1, 12, 0, 0, 0).getTime();
    expect(lastNDayKeys(septemberFirstNoon, 3, localCalendar)).toEqual([
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
    ]);
  });
});
