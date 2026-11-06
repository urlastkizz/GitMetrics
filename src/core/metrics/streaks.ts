import type { ActivitySnapshot } from '../activity-types.js';
import { createActivityPeriod } from '../activity-period.js';

export interface Streak {
  days: number;
  truncated: boolean;
}

export function calculateStreaks(
  contributionDays: ActivitySnapshot['contributionDays'],
  today: Date,
): { currentStreak: Streak; longestStreak: Streak } {
  const window = createActivityPeriod(today, 365);
  const activeDates = new Set(
    contributionDays.filter((day) => day.count > 0).map((day) => day.date),
  );
  let run: Streak = { days: 0, truncated: false };
  let currentStreak: Streak = { days: 0, truncated: false };
  let longestStreak: Streak = { days: 0, truncated: false };
  const date = new Date(window.from);
  for (let index = 0; index < window.days; index++) {
    const active = activeDates.has(date.toISOString().slice(0, 10));
    run = active
      ? { days: run.days + 1, truncated: run.truncated || index === 0 }
      : { days: 0, truncated: false };
    // Earlier runs win ties, preserving a potentially longer boundary run.
    if (run.days > longestStreak.days) longestStreak = run;
    if (index === window.days - 2 || (index === window.days - 1 && active))
      currentStreak = run;
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return { currentStreak, longestStreak };
}
