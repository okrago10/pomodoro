import { describe, expect, it } from "vitest";
import {
  createLocalStorageDailyWorkStore,
  createMemoryDailyWorkStore,
  DAILY_WORK_STORAGE_KEY,
} from "./dailyWorkStore.ts";

class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  #data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#data.set(key, value);
  }
}

describe("memory daily work store", () => {
  it("keeps yesterday and today as separate totals", () => {
    const store = createMemoryDailyWorkStore();
    store.add("2026-08-14", 25 * 60_000);
    store.add("2026-08-15", 5 * 60_000);
    expect(store.get("2026-08-14")).toBe(25 * 60_000);
    expect(store.get("2026-08-15")).toBe(5 * 60_000);
  });

  it("readAll は全日分を、呼ぶたびに別のオブジェクトとして返す", () => {
    const store = createMemoryDailyWorkStore({ "2026-08-14": 25 * 60_000 });

    expect(store.readAll()).toEqual({ "2026-08-14": 25 * 60_000 });
    expect(store.readAll()).not.toBe(store.readAll());
  });
});

describe("localStorage daily work store", () => {
  it("survives a new store instance on the same storage", () => {
    const storage = new MemoryStorage();
    const first = createLocalStorageDailyWorkStore(storage);
    first.add("2026-08-15", 10 * 60_000);

    const second = createLocalStorageDailyWorkStore(storage);
    expect(second.get("2026-08-15")).toBe(10 * 60_000);
    expect(storage.getItem(DAILY_WORK_STORAGE_KEY)).toContain("2026-08-15");
  });

  it("readAll は全日分を 1 回の読み込みで返す", () => {
    const storage = new MemoryStorage();
    const store = createLocalStorageDailyWorkStore(storage);
    store.add("2026-08-14", 25 * 60_000);
    store.add("2026-08-15", 5 * 60_000);

    expect(store.readAll()).toEqual({
      "2026-08-14": 25 * 60_000,
      "2026-08-15": 5 * 60_000,
    });
  });

  it("壊れた保存内容でも readAll は空を返す", () => {
    const storage = new MemoryStorage();
    storage.setItem(DAILY_WORK_STORAGE_KEY, "not json");
    const store = createLocalStorageDailyWorkStore(storage);

    expect(store.readAll()).toEqual({});
  });

  it("ignores write failures", () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    const store = createLocalStorageDailyWorkStore(storage);
    expect(() => store.add("2026-08-15", 1000)).not.toThrow();
    expect(store.get("2026-08-15")).toBe(0);
  });
});
