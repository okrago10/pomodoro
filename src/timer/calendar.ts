export interface Calendar {
  dayKey(ms: number): string;
  startOfNextDay(ms: number): number;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export const localCalendar: Calendar = {
  dayKey(ms) {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  },
  startOfNextDay(ms) {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d.getTime();
  },
};

export const utcCalendar: Calendar = {
  dayKey(ms) {
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  },
  startOfNextDay(ms) {
    const d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  },
};
