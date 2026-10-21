import { useState } from "react";
import { Button, Label, NumberField, Surface, Typography } from "@heroui/react";
import type { CyclePosition } from "../domain/cycle.ts";
import {
  TIMER_SETTING_BOUNDS,
  TIMER_SETTING_KEYS,
  type TimerSettingKey,
  type TimerSettings,
  type TimerSettingsPatch,
} from "../domain/timerSettings.ts";
import type { TimerStatus } from "../timer/engine.ts";
import { cyclePreview, SETTING_LABELS, settingsTimingNote } from "./settingsCopy.ts";

export function SettingsScreen({
  settings,
  status,
  position,
  onChange,
  onBack,
}: {
  settings: TimerSettings;
  status: TimerStatus;
  position: CyclePosition;
  onChange: (patch: TimerSettingsPatch) => void;
  onBack: () => void;
}) {
  const note = settingsTimingNote(status, position);
  // React Aria は確定後も入力された数字の種類（全角など）のまま表示し直す。
  // 半角でない表示のままフォーカスが外れたら作り直し、半角に戻す。
  // 半角なら作り直さない。アプリの切り替えでも blur が起き、戻ったときにフォーカスを失うため。
  const [blurCounts, setBlurCounts] = useState<Partial<Record<TimerSettingKey, number>>>({});

  return (
    <Surface variant="secondary" className="flex min-h-dvh flex-col">
      <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-1 flex-col gap-8 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="flex w-full items-center justify-between pt-2">
          <Button size="sm" variant="tertiary" onPress={onBack}>
            戻る
          </Button>
          <Typography type="body-sm">設定</Typography>
          <span className="inline-block w-14" />
        </div>

        {note === null ? null : (
          <Typography color="muted" type="body-sm">
            {note}
          </Typography>
        )}

        <div className="flex flex-col gap-5">
          {TIMER_SETTING_KEYS.map((key) => (
            <NumberField
              key={`${key}:${blurCounts[key] ?? 0}`}
              fullWidth
              variant="secondary"
              step={1}
              minValue={TIMER_SETTING_BOUNDS[key].min}
              maxValue={TIMER_SETTING_BOUNDS[key].max}
              value={settings[key]}
              onChange={(value) => {
                onChange({ [key]: value });
              }}
              onBlur={(event) => {
                if (
                  event.target instanceof HTMLInputElement &&
                  /^[0-9]*$/.test(event.target.value)
                ) {
                  return;
                }
                setBlurCounts((counts) => ({ ...counts, [key]: (counts[key] ?? 0) + 1 }));
              }}
            >
              <Label>{SETTING_LABELS[key]}</Label>
              <NumberField.Group>
                <NumberField.DecrementButton />
                <NumberField.Input />
                <NumberField.IncrementButton />
              </NumberField.Group>
            </NumberField>
          ))}
        </div>

        <Typography color="muted" type="body-sm">
          {cyclePreview(settings)}
        </Typography>
      </main>
    </Surface>
  );
}
