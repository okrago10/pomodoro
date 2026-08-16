const MINUTE_MS = 60_000;

export function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** 画面の「N分」と同じ。1分未満は記録ゼロとして扱う。 */
export function floorToMinuteMs(ms: number): number {
  return Math.floor(Math.max(0, ms) / MINUTE_MS) * MINUTE_MS;
}

export function formatTodayWork(ms: number): string {
  const totalMinutes = floorToMinuteMs(ms) / MINUTE_MS;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes}分`;
  }
  if (minutes === 0) {
    return `${hours}時間`;
  }
  return `${hours}時間${minutes}分`;
}
