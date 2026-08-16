import { describe, expect, it } from "vitest";
import { lastNDayKeys, localCalendar } from "./calendar.ts";

describe("lastNDayKeys", () => {
  it("returns today and the preceding days in order", () => {
    const fridayNoon = new Date(2026, 7, 14, 12, 0, 0, 0).getTime();
    expect(lastNDayKeys(fridayNoon, 3, localCalendar)).toEqual([
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
    ]);
  });
});
