import type { ActivityPeriod } from './activity-types.js';

export function createActivityPeriod(now: Date, days = 30): ActivityPeriod {
  if (!Number.isInteger(days) || days < 1 || days > 365)
    throw new Error('Days must be an integer from 1 to 365.');
  const to = now.toISOString();
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return {
    days,
    startDate: start.toISOString().slice(0, 10),
    endDate: to.slice(0, 10),
    from: start.toISOString(),
    to,
  };
}
