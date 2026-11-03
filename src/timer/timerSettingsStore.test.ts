import { describe, expect, it } from "vitest";
import { DEFAULT_TIMER_SETTINGS } from "../domain/timerSettings.ts";
import {
  createLocalStorageTimerSettingsStore,
  createMemoryTimerSettingsStore,
  TIMER_SETTINGS_STORAGE_KEY,
  type TimerSettingsStore,
} from "./timerSettingsStore.ts";
import { MemoryStorage } from "./memoryStorage.ts";

function saveRaw(storage: MemoryStorage, value: unknown): void {
  storage.setItem(TIMER_SETTINGS_STORAGE_KEY, JSON.stringify(value));
}

interface Adapter {
  readonly name: string;
  create(): TimerSettingsStore;
  /** 同じ保存先へ書く 2 つの書き手。メモリ版は同じストアを共有するほかに書き手を作れない。 */
  createWriters(): readonly [TimerSettingsStore, TimerSettingsStore];
}

const adapters: readonly Adapter[] = [
  {
    name: "memory",
    create: () => createMemoryTimerSettingsStore(),
    createWriters() {
      const store = createMemoryTimerSettingsStore();
      return [store, store];
    },
  },
  {
    name: "localStorage",
    create: () => createLocalStorageTimerSettingsStore(new MemoryStorage()),
    createWriters() {
      const storage = new MemoryStorage();
      return [
        createLocalStorageTimerSettingsStore(storage),
        createLocalStorageTimerSettingsStore(storage),
      ];
    },
  },
];

describe.each(adapters)("$name timer settings store", ({ create, createWriters }) => {
  it("何も変えていなければ初期値を返す", () => {
    expect(create().current()).toEqual(DEFAULT_TIMER_SETTINGS);
  });

  it("patch を重ねた結果を返し、current も同じ値になる", () => {
    const store = create();

    const next = store.update({ workMinutes: 50 });

    expect(next).toEqual({ ...DEFAULT_TIMER_SETTINGS, workMinutes: 50 });
    expect(store.current()).toBe(next);
  });

  it("範囲外や NaN の項目は今の値のまま残す", () => {
    const store = create();
    store.update({ workMinutes: 50 });

    expect(
      store.update({ workMinutes: 0, shortBreakMinutes: Number.NaN, longBreakMinutes: 20 }),
    ).toEqual({
      ...DEFAULT_TIMER_SETTINGS,
      workMinutes: 50,
      longBreakMinutes: 20,
    });
  });

  it("何も変わらなければ同じオブジェクトを返す", () => {
    const store = create();
    const before = store.update({ workMinutes: 50 });

    expect(store.update({})).toBe(before);
    expect(store.update({ workMinutes: 50 })).toBe(before);
    expect(store.update({ workMinutes: 0 })).toBe(before);
  });

  it("別の書き手が保存した値を取り込んでから patch を重ねる", () => {
    const [mine, other] = createWriters();
    mine.update({ longBreakMinutes: 20 });

    other.update({ workMinutes: 50 });

    expect(mine.update({ shortBreakMinutes: 10 })).toEqual({
      workMinutes: 50,
      shortBreakMinutes: 10,
      longBreakMinutes: 20,
      worksBeforeLongBreak: 2,
    });
  });
});

describe("localStorage timer settings store", () => {
  it("変えた設定を、同じ保存先の新しいストアで読める", () => {
    const storage = new MemoryStorage();
    createLocalStorageTimerSettingsStore(storage).update({
      workMinutes: 50,
      shortBreakMinutes: 10,
      longBreakMinutes: 30,
      worksBeforeLongBreak: 4,
    });

    const expected = {
      workMinutes: 50,
      shortBreakMinutes: 10,
      longBreakMinutes: 30,
      worksBeforeLongBreak: 4,
    };
    expect(createLocalStorageTimerSettingsStore(storage).current()).toEqual(expected);
    expect(JSON.parse(storage.getItem(TIMER_SETTINGS_STORAGE_KEY) ?? "null")).toEqual(expected);
  });

  it("壊れた保存内容なら初期値を読む", () => {
    const storage = new MemoryStorage();
    storage.setItem(TIMER_SETTINGS_STORAGE_KEY, "{");

    expect(createLocalStorageTimerSettingsStore(storage).current()).toEqual(DEFAULT_TIMER_SETTINGS);
  });

  it("読めない項目だけを初期値にし、ほかの項目は残す", () => {
    const storage = new MemoryStorage();
    saveRaw(storage, { workMinutes: 50, shortBreakMinutes: "10", longBreakMinutes: 999 });

    expect(createLocalStorageTimerSettingsStore(storage).current()).toEqual({
      workMinutes: 50,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      worksBeforeLongBreak: 2,
    });
  });

  it("保存先が例外を投げても、初期値から始まり、変更は例外を投げずに手元へ残す", () => {
    const store = createLocalStorageTimerSettingsStore({
      getItem() {
        throw new Error("read failed");
      },
      setItem() {
        throw new Error("write failed");
      },
    });

    expect(store.current()).toEqual(DEFAULT_TIMER_SETTINGS);
    expect(store.update({ workMinutes: 50 }).workMinutes).toBe(50);
    expect(store.current().workMinutes).toBe(50);
  });

  it("自分が書いたあと保存先が変わっていなければ、今の値をそのまま使う", () => {
    const storage = new MemoryStorage();
    const store = createLocalStorageTimerSettingsStore(storage);
    const current = store.update({ workMinutes: 50 });

    expect(store.update({})).toBe(current);
  });

  it("範囲外の項目は、別の書き手の値ではなく今の値のまま残す", () => {
    const storage = new MemoryStorage();
    const mine = createLocalStorageTimerSettingsStore(storage);
    mine.update({ workMinutes: 50 });

    saveRaw(storage, { ...DEFAULT_TIMER_SETTINGS, workMinutes: 40, shortBreakMinutes: 7 });

    expect(mine.update({ workMinutes: 0 })).toEqual({
      ...DEFAULT_TIMER_SETTINGS,
      workMinutes: 50,
      shortBreakMinutes: 7,
    });
  });

  it("書き込みに失敗したあとも、古い保存内容で手元の変更を戻さない", () => {
    const storage = new MemoryStorage();
    const store = createLocalStorageTimerSettingsStore(storage);
    store.update({});
    storage.setItem = () => {
      throw new Error("quota exceeded");
    };
    store.update({ workMinutes: 50 });

    expect(store.update({ shortBreakMinutes: 10 })).toEqual({
      ...DEFAULT_TIMER_SETTINGS,
      workMinutes: 50,
      shortBreakMinutes: 10,
    });
  });
});
