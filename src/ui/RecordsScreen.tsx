import { useState } from "react";
import { Button, Surface, Typography } from "@heroui/react";
import type { RecentDailyWork } from "../timer/dailyWorkReader.ts";
import { formatTodayWork } from "../timer/format.ts";
import { barHeightPx, selectedDayLabel, weekdayLabel } from "./recordsCopy.ts";

export function RecordsScreen({ work, onBack }: { work: RecentDailyWork; onBack: () => void }) {
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  // 日付が変わって選んでいた日が 7 日の枠から外れたら、今日に戻す。
  const selected =
    work.days.find((day) => day.dayKey === pickedKey) ??
    work.days.find((day) => day.dayKey === work.todayKey);
  const selectedKey = selected?.dayKey ?? work.todayKey;

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
            {selectedDayLabel(selectedKey, work.todayKey)}
          </Typography>
          <Typography className="text-4xl font-semibold">
            {formatTodayWork(selected?.ms ?? 0)}
          </Typography>
        </div>

        <div className="flex h-[168px] items-end justify-between gap-1">
          {work.days.map((day) => {
            const isSelected = day.dayKey === selectedKey;
            return (
              <button
                key={day.dayKey}
                type="button"
                className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-end gap-2"
                aria-pressed={isSelected}
                aria-label={`${selectedDayLabel(day.dayKey, work.todayKey)} ${formatTodayWork(day.ms)}`}
                onClick={() => {
                  setPickedKey(day.dayKey);
                }}
              >
                <span
                  className={`w-full max-w-8 rounded-t-md ${isSelected ? "bg-accent" : "bg-accent-soft"}`}
                  style={{ height: barHeightPx(day.ms, work.maxMs) }}
                />
                <Typography
                  className={isSelected ? "font-semibold" : undefined}
                  color="muted"
                  type="body-sm"
                >
                  {weekdayLabel(day.dayKey)}
                </Typography>
              </button>
            );
          })}
        </div>
      </main>
    </Surface>
  );
}
