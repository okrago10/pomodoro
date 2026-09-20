import { describe, expect, it } from "vitest";
import { utcCalendar } from "./calendar.ts";
import { FakeClock } from "./clock.ts";
import { createDailyWorkReader, selectedDay } from "./dailyWorkReader.ts";
import { createMemoryDailyWorkStore } from "./dailyWorkStore.ts";

const MINUTE_MS = 60_000;
const NOW = Date.UTC(2026, 7, 14, 3, 0, 0);

function readerWith(totals: Readonly<Record<string, number>>) {
  const store = createMemoryDailyWorkStore(totals);
  return createDailyWorkReader(store, new FakeClock(NOW), utcCalendar);
}

describe("daily work reader", () => {
  it("今日で終わる連続した日を古い順に返す", () => {
    const work = readerWith({}).recentWork(3);

    expect(work.todayKey).toBe("2026-08-14");
    expect(work.days.map((day) => day.dayKey)).toEqual(["2026-08-12", "2026-08-13", "2026-08-14"]);
  });

  it("記録の無い日は 0 にする", () => {
    const work = readerWith({ "2026-08-14": 25 * MINUTE_MS }).recentWork(3);

    expect(work.days.map((day) => day.ms)).toEqual([0, 0, 25 * MINUTE_MS]);
  });

  it("1 分未満しか働いていない日は 0 として返す", () => {
    const work = readerWith({ "2026-08-14": 42_000 }).recentWork(3);

    expect(work.days.at(-1)?.ms).toBe(0);
    expect(work.maxMs).toBe(0);
  });

  it("端数は分単位に切り捨てる", () => {
    const work = readerWith({ "2026-08-14": 25 * MINUTE_MS + 42_000 }).recentWork(3);

    expect(work.days.at(-1)?.ms).toBe(25 * MINUTE_MS);
  });

  it("枠の中の最大値を返す", () => {
    const work = readerWith({
      "2026-08-12": 50 * MINUTE_MS,
      "2026-08-14": 25 * MINUTE_MS,
      "2026-08-01": 90 * MINUTE_MS,
    }).recentWork(3);

    expect(work.maxMs).toBe(50 * MINUTE_MS);
  });

  it("全日分を 1 回の読み込みで取る", () => {
    const store = createMemoryDailyWorkStore({ "2026-08-14": 25 * MINUTE_MS });
    let reads = 0;
    const reader = createDailyWorkReader(
      {
        readAll() {
          reads++;
          return store.readAll();
        },
      },
      new FakeClock(NOW),
      utcCalendar,
    );

    reader.recentWork(7);

    expect(reads).toBe(1);
  });
});

describe("selectedDay", () => {
  const work = readerWith({ "2026-08-13": 25 * MINUTE_MS }).recentWork(3);

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
