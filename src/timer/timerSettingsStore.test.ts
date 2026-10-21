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
});
