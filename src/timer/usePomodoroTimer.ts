import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { TimerRuntime } from "./timerRuntime.ts";

/**
 * TimerRuntime を React につなぐだけの層。タイマーの駆動と通知の順序は
 * すべて TimerRuntime が持ち、後片付けも購読の解除で起きる。
 */
export function usePomodoroTimer(runtime: TimerRuntime) {
  const snapshot = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot);

  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState === "visible") {
        runtime.sync();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [runtime]);

  const start = useCallback(() => {
    void runtime.start();
  }, [runtime]);

  const pause = useCallback(() => {
    runtime.pause();
  }, [runtime]);

  const reset = useCallback(() => {
    runtime.reset();
  }, [runtime]);

  return { ...snapshot, start, pause, reset };
}
