import { useCallback, useEffect, useState } from "react";
import { systemClock } from "./clock.ts";
import { createTimerEngine, type TimerSnapshot } from "./engine.ts";

const TICK_MS = 250;

export function usePomodoroTimer() {
  const [engine] = useState(() => createTimerEngine(systemClock));
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

  return { ...snapshot, start, pause };
}
