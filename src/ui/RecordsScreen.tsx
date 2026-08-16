import { useState } from "react";
import { Button, Surface, Typography } from "@heroui/react";
import { lastNDayKeys, localCalendar } from "../timer/calendar.ts";
import type { DailyWorkStore } from "../timer/dailyWorkStore.ts";
import { formatTodayWork } from "../timer/format.ts";
import { barHeightPx, selectedDayLabel, weekdayLabel } from "./recordsCopy.ts";

const DAYS = 7;

export function RecordsScreen({
  nowMs,
  store,
  onBack,
}: {
  nowMs: number;
  store: DailyWorkStore;
  onBack: () => void;
}) {
  const todayKey = localCalendar.dayKey(nowMs);
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const dayKeys = lastNDayKeys(nowMs, DAYS, localCalendar);
  const totals = dayKeys.map((key) => store.get(key));
  const maxMs = Math.max(1, ...totals);
  const selectedMs = store.get(selectedKey);

  return (
    <Surface variant="secondary" className="flex min-h-dvh flex-col">
      <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-1 flex-col gap-8 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="flex w-full items-center justify-between pt-2">
          <Button size="sm" variant="tertiary" onPress={onBack}>
            戻る
          </Button>
          <Typography type="body-sm">記録</Typography>
          <span className="inline-block w-14" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <Typography color="muted" type="body-sm">
            {selectedDayLabel(selectedKey, todayKey)}
          </Typography>
          <Typography className="text-4xl font-semibold">{formatTodayWork(selectedMs)}</Typography>
        </div>

        <div className="flex h-[168px] items-end justify-between gap-1">
          {dayKeys.map((key, index) => {
            const ms = totals[index];
            const height = barHeightPx(ms, maxMs);
            const selected = key === selectedKey;
            return (
              <button
                key={key}
                type="button"
                className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-end gap-2"
                aria-pressed={selected}
                aria-label={`${selectedDayLabel(key, todayKey)} ${formatTodayWork(ms)}`}
                onClick={() => {
                  setSelectedKey(key);
                }}
              >
                <span
                  className={`w-full max-w-8 rounded-t-md ${selected ? "bg-accent" : "bg-accent-soft"}`}
                  style={{ height }}
                />
                <Typography
                  className={selected ? "font-semibold" : undefined}
                  color="muted"
                  type="body-sm"
                >
                  {weekdayLabel(key)}
                </Typography>
              </button>
            );
          })}
        </div>
      </main>
    </Surface>
  );
}
