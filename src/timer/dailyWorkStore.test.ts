import { describe, expect, it } from "vitest";
import {
  createLocalStorageDailyWorkStore,
  createMemoryDailyWorkStore,
  DAILY_WORK_STORAGE_KEY,
  type DailyWorkStore,
  type DailyWorkTotals,
} from "./dailyWorkStore.ts";
import { MemoryStorage } from "./memoryStorage.ts";

const MINUTE_MS = 60_000;

/** 保存済みの値から組み立てる。壊れた値の扱いも同じ入口で確かめる。 */
const adapters: ReadonlyArray<
  readonly [
    name: string,
    create: (saved?: Readonly<Record<string, number>>) => DailyWorkStore & DailyWorkTotals,
  ]
> = [
  ["memory", (saved = {}) => createMemoryDailyWorkStore(saved)],
  [
    "localStorage",
    (saved = {}) => {
      const storage = new MemoryStorage();
      storage.setItem(DAILY_WORK_STORAGE_KEY, JSON.stringify(saved));
      return createLocalStorageDailyWorkStore(storage);
    },
  ],
];

describe.each(adapters)("%s daily work store の契約", (_name, create) => {
  it("記録の無い日は 0 を返す", () => {
    const store = create();

    expect(store.get("2026-08-14")).toBe(0);
    expect(store.readAll()).toEqual({});
  });

  it("昨日と今日を別々に足していく", () => {
    const store = create();
    store.add("2026-08-14", 25 * MINUTE_MS);
    store.add("2026-08-15", 5 * MINUTE_MS);
    store.add("2026-08-15", 5 * MINUTE_MS);

    expect(store.get("2026-08-14")).toBe(25 * MINUTE_MS);
    expect(store.get("2026-08-15")).toBe(10 * MINUTE_MS);
    expect(store.readAll()).toEqual({
      "2026-08-14": 25 * MINUTE_MS,
      "2026-08-15": 10 * MINUTE_MS,
    });
  });

  it("0 以下や有限でない差分は記録しない", () => {
    const store = create({ "2026-08-14": MINUTE_MS });
    for (const delta of [0, -MINUTE_MS, Number.NaN, Number.POSITIVE_INFINITY]) {
      store.add("2026-08-14", delta);
    }

    expect(store.get("2026-08-14")).toBe(MINUTE_MS);
  });

  it("保存済みの壊れた値は 0 として扱い、readAll にも含めない", () => {
    const store = create({
      "2026-08-13": -MINUTE_MS,
      "2026-08-14": Number.NaN,
      "2026-08-15": 5 * MINUTE_MS,
    });

    expect(store.get("2026-08-13")).toBe(0);
    expect(store.get("2026-08-14")).toBe(0);
    expect(store.readAll()).toEqual({ "2026-08-15": 5 * MINUTE_MS });
  });

  it("日付でないキーで継承したプロパティを読まない", () => {
    const store = create();

    expect(store.get("toString")).toBe(0);
    expect(store.get("constructor")).toBe(0);
  });

  it("readAll は呼ぶたびに別のオブジェクトを返す", () => {
    const store = create({ "2026-08-14": 25 * MINUTE_MS });

    expect(store.readAll()).toEqual({ "2026-08-14": 25 * MINUTE_MS });
    expect(store.readAll()).not.toBe(store.readAll());
  });
});

describe("localStorage daily work store", () => {
  it("survives a new store instance on the same storage", () => {
    const storage = new MemoryStorage();
    const first = createLocalStorageDailyWorkStore(storage);
    first.add("2026-08-15", 10 * MINUTE_MS);

    const second = createLocalStorageDailyWorkStore(storage);
    expect(second.get("2026-08-15")).toBe(10 * MINUTE_MS);
    expect(storage.getItem(DAILY_WORK_STORAGE_KEY)).toContain("2026-08-15");
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

  it("読み出しに失敗しても例外を投げず、記録は 0 として扱う", () => {
    const storage = {
      getItem(): string | null {
        throw new Error("denied");
      },
      setItem(): void {
        throw new Error("denied");
      },
    };
    const store = createLocalStorageDailyWorkStore(storage);

    expect(store.get("2026-08-15")).toBe(0);
    expect(store.readAll()).toEqual({});
    expect(() => store.add("2026-08-15", 1000)).not.toThrow();
  });
});
