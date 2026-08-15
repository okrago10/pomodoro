import { AlertDialog, Button, Chip, Surface, Typography } from "@heroui/react";
import { isWorkPhase } from "./domain/cycle.ts";
import { formatRemaining, formatTodayWork } from "./timer/format.ts";
import { usePomodoroTimer } from "./timer/usePomodoroTimer.ts";
import { cycleStepLabel, phaseName, startToggleLabel } from "./ui/cycleCopy.ts";

export function App() {
  const { position, remainingMs, status, todayWorkMs, start, pause, reset } = usePomodoroTimer();
  const running = status === "running";
  const focusing = isWorkPhase(position.phase);
  const phase = phaseName(position.phase);

  return (
    <Surface
      variant={focusing ? "secondary" : "tertiary"}
      className={`flex min-h-dvh flex-col ${focusing ? "bg-accent-soft" : "bg-success-soft"}`}
    >
      <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-1 flex-col items-center justify-between gap-8 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="flex w-full flex-col items-center gap-3 pt-8">
          <Typography className="self-end" color="muted" type="body-sm">
            今日 {formatTodayWork(todayWorkMs)}
          </Typography>
          <Chip color={focusing ? "accent" : "success"} size="lg" variant="primary">
            {phase}
          </Chip>
          <Typography align="center" color="muted" type="body-sm">
            {cycleStepLabel(position)}
          </Typography>
        </div>

        <p
          className={`font-mono text-7xl leading-none font-semibold tracking-tight tabular-nums ${
            focusing ? "text-accent" : "text-success"
          }`}
          aria-live="polite"
        >
          {formatRemaining(remainingMs)}
        </p>

        <div className="flex w-full flex-col gap-3 pb-4">
          <Button
            fullWidth
            size="lg"
            className="min-h-14 text-lg"
            variant={running ? "secondary" : "primary"}
            onPress={running ? pause : start}
          >
            {startToggleLabel(status)}
          </Button>

          <AlertDialog>
            <Button
              fullWidth
              size="lg"
              className="min-h-14"
              isDisabled={status === "idle"}
              variant="danger"
            >
              リセット
            </Button>
            <AlertDialog.Backdrop>
              <AlertDialog.Container>
                <AlertDialog.Dialog className="max-w-[min(100%,390px)]">
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="danger" />
                    <AlertDialog.Heading>最初からやり直しますか？</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p>進行中のサイクルは破棄され、1回目の作業（25分）に戻ります。</p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button slot="close" variant="tertiary">
                      キャンセル
                    </Button>
                    <Button slot="close" variant="danger" onPress={reset}>
                      リセットする
                    </Button>
                  </AlertDialog.Footer>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        </div>
      </main>
    </Surface>
  );
}
