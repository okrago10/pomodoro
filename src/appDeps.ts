import { createWebPhaseFeedback } from "./notify/webNotify.ts";
import { localCalendar } from "./timer/calendar.ts";
import { systemClock } from "./timer/clock.ts";
import { createDailyWorkReader, type DailyWorkReader } from "./timer/dailyWorkReader.ts";
import { createLocalStorageDailyWorkStore } from "./timer/dailyWorkStore.ts";
import { windowScheduler } from "./timer/scheduler.ts";
import { createTimerRuntime, type TimerRuntime } from "./timer/timerRuntime.ts";
import { createLocalStorageTimerSettingsStore } from "./timer/timerSettingsStore.ts";
import { documentVisibility } from "./timer/visibility.ts";

export interface AppDeps {
  readonly timer: TimerRuntime;
  readonly records: DailyWorkReader;
}

/** 本番の組み立てはここ 1 箇所だけ。 */
export function createWebAppDeps(): AppDeps {
  const store = createLocalStorageDailyWorkStore(window.localStorage);

  return {
    timer: createTimerRuntime({
      clock: systemClock,
      calendar: localCalendar,
      store,
      feedback: createWebPhaseFeedback(),
      scheduler: windowScheduler,
      visibility: documentVisibility,
      settings: createLocalStorageTimerSettingsStore(window.localStorage),
    }),
    records: createDailyWorkReader(store, systemClock, localCalendar),
  };
}
