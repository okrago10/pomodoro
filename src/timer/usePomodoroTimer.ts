import { useCallback, useEffect, useState } from "react";
import {
  announcePhaseEnd,
  preparePhaseFeedback,
  startPhaseKeepAlive,
  stopPhaseKeepAlive,
} from "../notify/webNotify.ts";
import { systemClock } from "./clock.ts";
import { createTimerEngine, type TimerSnapshot } from "./engine.ts";

const TICK_MS = 250;

export function usePomodoroTimer() {
  const [engine] = useState(() => createTimerEngine(systemClock));
  const [snapshot, setSnapshot] = useState<TimerSnapshot>(() => engine.snapshot());

  const applyTick = useCallback(() => {
    const next = engine.tick();
    const transitions = engine.takeTransitions();
    setSnapshot(next);
    for (const transition of transitions) {
      announcePhaseEnd(transition.from.phase._tag, transition.to.phase._tag);
    }
  }, [engine]);

  useEffect(() => {
    const id = window.setInterval(applyTick, TICK_MS);
    return () => {
      window.clearInterval(id);
    };
  }, [applyTick]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        applyTick();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [applyTick]);

  useEffect(() => {
    const deadline = engine.runningDeadlineMs();
    if (snapshot.status !== "running" || deadline === null) {
      return;
    }
    const delay = Math.max(0, deadline - Date.now());
    const id = window.setTimeout(applyTick, delay + 30);
    return () => {
      window.clearTimeout(id);
    };
  }, [applyTick, engine, snapshot.position.stepIndex, snapshot.status]);

  const start = useCallback(() => {
    void (async () => {
      await preparePhaseFeedback();
      startPhaseKeepAlive();
      setSnapshot(engine.start());
    })();
  }, [engine]);

  const pause = useCallback(() => {
    stopPhaseKeepAlive();
    setSnapshot(engine.pause());
  }, [engine]);

  return { ...snapshot, start, pause };
}
