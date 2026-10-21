import { describe, expect, it } from "vitest";
import { DEFAULT_TIMER_SETTINGS, parseTimerSettings } from "../domain/timerSettings.ts";
import {
  createLocalStorageTimerSettingsStore,
  TIMER_SETTINGS_STORAGE_KEY,
} from "./timerSettingsStore.ts";

class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  #data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#data.set(key, value);
  }
}

describe("localStorage timer settings store", () => {
  it("何も保存していなければ初期値を読む", () => {
    expect(createLocalStorageTimerSettingsStore(new MemoryStorage()).load()).toEqual({
      workMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      worksBeforeLongBreak: 2,
    });
  });

  it("保存した設定を、同じ保存先の新しいストアで読める", () => {
    const storage = new MemoryStorage();
    const settings = parseTimerSettings({
      workMinutes: 50,
      shortBreakMinutes: 10,
      longBreakMinutes: 30,
      worksBeforeLongBreak: 4,
    });
    createLocalStorageTimerSettingsStore(storage).save(settings);

    expect(createLocalStorageTimerSettingsStore(storage).load()).toEqual(settings);
    expect(JSON.parse(storage.getItem(TIMER_SETTINGS_STORAGE_KEY) ?? "null")).toEqual({
      workMinutes: 50,
      shortBreakMinutes: 10,
      longBreakMinutes: 30,
      worksBeforeLongBreak: 4,
    });
  });

  it("壊れた保存内容なら初期値を読む", () => {
    const storage = new MemoryStorage();
    storage.setItem(TIMER_SETTINGS_STORAGE_KEY, "{");

    expect(createLocalStorageTimerSettingsStore(storage).load()).toEqual(DEFAULT_TIMER_SETTINGS);
  });

  it("読めない項目だけを初期値にし、ほかの項目は残す", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      TIMER_SETTINGS_STORAGE_KEY,
      JSON.stringify({ workMinutes: 50, shortBreakMinutes: "10", longBreakMinutes: 999 }),
    );

    expect(createLocalStorageTimerSettingsStore(storage).load()).toEqual({
      workMinutes: 50,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      worksBeforeLongBreak: 2,
    });
  });

  it("保存先が例外を投げても、読み込みは初期値を返し、保存は例外を投げない", () => {
    const broken: Pick<Storage, "getItem" | "setItem"> = {
      getItem() {
        throw new Error("read failed");
      },
      setItem() {
        throw new Error("write failed");
      },
    };
    const store = createLocalStorageTimerSettingsStore(broken);

    expect(store.load()).toEqual(DEFAULT_TIMER_SETTINGS);
    expect(() => {
      store.save(parseTimerSettings({ workMinutes: 50 }));
    }).not.toThrow();
  });

  it("自分が読み書きしたあと保存先が変わっていなければ、渡した値を返す", () => {
    const storage = new MemoryStorage();
    const store = createLocalStorageTimerSettingsStore(storage);
    const current = parseTimerSettings({ workMinutes: 50 });
    store.save(parseTimerSettings({ workMinutes: 40 }));

    expect(store.load(current)).toBe(current);
  });

  it("別のストアが書いた値は、渡した値に重ねて返す", () => {
    const storage = new MemoryStorage();
    const mine = createLocalStorageTimerSettingsStore(storage);
    mine.save(DEFAULT_TIMER_SETTINGS);

    createLocalStorageTimerSettingsStore(storage).save(parseTimerSettings({ workMinutes: 50 }));

    expect(mine.load(DEFAULT_TIMER_SETTINGS).workMinutes).toBe(50);
  });

  it("書き込みに失敗したあとも、古い保存内容で渡した値を上書きしない", () => {
    const storage = new MemoryStorage();
    const store = createLocalStorageTimerSettingsStore(storage);
    store.save(DEFAULT_TIMER_SETTINGS);
    storage.setItem = () => {
      throw new Error("quota exceeded");
    };
    const current = parseTimerSettings({ workMinutes: 50 });
    store.save(current);

    expect(store.load(current)).toBe(current);
  });
});
