import { useCallback, useEffect, useState } from "react";
import { localCalendar } from "./calendar.ts";
import { systemClock } from "./clock.ts";
import { createLocalStorageDailyWorkStore } from "./dailyWorkStore.ts";
import { createTimerEngine, type TimerSnapshot } from "./engine.ts";

const TICK_MS = 250;

export function usePomodoroTimer() {
  const [engine] = useState(() =>
    createTimerEngine(
      systemClock,
      localCalendar,
      createLocalStorageDailyWorkStore(window.localStorage),
    ),
  );
  const [snapshot, setSnapshot] = useState<TimerSnapshot>(() => engine.snapshot());

  useEffect(() => {
    const id = window.setInterval(() => {
      setSnapshot(engine.tick());
    }, TICK_MS);
    return () => {
      window.clearInterval(id);
    };
  }, [engine]);

  const start = useCallback(() => {
    setSnapshot(engine.start());
  }, [engine]);

  const pause = useCallback(() => {
    setSnapshot(engine.pause());
  }, [engine]);

  const reset = useCallback(() => {
    setSnapshot(engine.reset());
  }, [engine]);

  return { ...snapshot, start, pause, reset };
}
