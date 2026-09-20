import { createWebPhaseFeedback } from "./notify/webNotify.ts";
import { localCalendar } from "./timer/calendar.ts";
import { systemClock } from "./timer/clock.ts";
import { createLocalStorageDailyWorkStore, type DailyWorkStore } from "./timer/dailyWorkStore.ts";
import { windowScheduler } from "./timer/scheduler.ts";
import { createTimerRuntime, type TimerRuntime } from "./timer/timerRuntime.ts";

export interface AppDeps {
  readonly timer: TimerRuntime;
  readonly store: DailyWorkStore;
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
    }),
    store,
  };
}
