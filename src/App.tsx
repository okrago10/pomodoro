import { Button } from "@heroui/react";
import { formatRemaining } from "./timer/format.ts";
import { usePomodoroTimer } from "./timer/usePomodoroTimer.ts";

function phaseLabel(tag: string): string {
  switch (tag) {
    case "Work":
      return "作業";
    case "ShortBreak":
      return "短い休憩";
    case "LongBreak":
      return "長い休憩";
    default:
      return tag;
  }
}

export function App() {
  const { position, remainingMs, status, start, pause } = usePomodoroTimer();
  const running = status === "running";

  return (
    <main className="mx-auto flex min-h-dvh max-w-[390px] flex-col items-center justify-center gap-6 px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <h1 className="text-xl font-semibold">pomodoro</h1>
      <p className="text-sm">{phaseLabel(position.phase._tag)}</p>
      <p className="font-mono text-5xl tabular-nums" aria-live="polite">
        {formatRemaining(remainingMs)}
      </p>
      <p className="text-center text-sm opacity-70">
        フェーズ終了を知らせるため、初回の開始時に通知の許可を求めます。
      </p>
      <div className="flex gap-3">
        <Button isDisabled={running} onPress={start}>
          開始
        </Button>
        <Button isDisabled={!running} variant="secondary" onPress={pause}>
          一時停止
        </Button>
      </div>
    </main>
  );
}
