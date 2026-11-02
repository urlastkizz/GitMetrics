import { z } from 'zod';
import type {
  ActivityMetrics,
  ActivityPeriod,
  ActivitySnapshot,
} from '../activity-types.js';

const daySchema = z.object({
  date: z.iso.date(),
  count: z.number().int().nonnegative(),
});

export function calculateActivityMetrics(
  snapshot: ActivitySnapshot,
  period: ActivityPeriod,
): ActivityMetrics {
  let totalContributions = 0;
  let activeDays = 0;
  let busiestDay: ActivityMetrics['busiestDay'] = null;
  const seen = new Set<string>();
  for (const day of snapshot.contributionDays) {
    if (!daySchema.safeParse(day).success)
      throw new Error('GitHub returned invalid contribution data.');
    if (seen.has(day.date))
      throw new Error('GitHub returned duplicate contribution dates.');
    seen.add(day.date);
    if (day.date < period.startDate || day.date > period.endDate) continue;
    totalContributions += day.count;
    if (day.count === 0) continue;
    activeDays++;
    if (
      busiestDay === null ||
      day.count > busiestDay.count ||
      (day.count === busiestDay.count && day.date > busiestDay.date)
    )
      busiestDay = { ...day };
  }
  return {
    user: snapshot.user,
    days: period.days,
    startDate: period.startDate,
    endDate: period.endDate,
    totalContributions,
    activeDays,
    busiestDay,
  };
}
