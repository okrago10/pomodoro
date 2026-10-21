import { Button, Label, NumberField, Surface, Typography } from "@heroui/react";
import type { CyclePosition } from "../domain/cycle.ts";
import {
  TIMER_SETTING_BOUNDS,
  TIMER_SETTING_KEYS,
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
              key={key}
              fullWidth
              variant="secondary"
              step={1}
              minValue={TIMER_SETTING_BOUNDS[key].min}
              maxValue={TIMER_SETTING_BOUNDS[key].max}
              value={settings[key]}
              onChange={(value) => {
                onChange({ [key]: value });
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
