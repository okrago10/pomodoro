import { useCallback, useEffect, useRef, useState } from "react";
import { systemClock } from "./clock.ts";
import { createTimerEngine, type TimerSnapshot } from "./engine.ts";

const TICK_MS = 250;

export function usePomodoroTimer() {
  const engineRef = useRef(createTimerEngine(systemClock));
  const [snapshot, setSnapshot] = useState<TimerSnapshot>(() => engineRef.current.snapshot());

  useEffect(() => {
    const id = window.setInterval(() => {
      setSnapshot(engineRef.current.tick());
    }, TICK_MS);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  const start = useCallback(() => {
    setSnapshot(engineRef.current.start());
  }, []);

  const pause = useCallback(() => {
    setSnapshot(engineRef.current.pause());
  }, []);

  return { ...snapshot, start, pause };
}
