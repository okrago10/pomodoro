import { useCallback, useSyncExternalStore } from "react";
import type { TimerRuntime } from "./timerRuntime.ts";

/**
 * TimerRuntime を React につなぐだけの層。タイマーの駆動・前面復帰の追いつき・
 * 通知の順序はすべて TimerRuntime が持ち、後片付けも購読の解除で起きる。
 */
export function usePomodoroTimer(runtime: TimerRuntime) {
  const snapshot = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot);

  const start = useCallback(() => {
    void runtime.start();
  }, [runtime]);

  return { ...snapshot, start, pause: runtime.pause, reset: runtime.reset };
}
