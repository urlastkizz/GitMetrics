import Table from 'cli-table3';
import { createColors } from 'picocolors';
import type { ActivityMetrics } from '../core/activity-types.js';
import type { Streak } from '../core/metrics/streaks.js';

function formatStreak(streak: Streak): string {
  return `${streak.days}${streak.truncated ? '+' : ''} days`;
}

export function formatActivity(
  metrics: ActivityMetrics,
  options: { json?: boolean; color?: boolean } = {},
): string {
  if (options.json) return JSON.stringify(metrics);
  const colors = createColors(options.color ?? process.stdout.isTTY ?? false);
  const table = new Table({
    head: [colors.cyan('Metric'), colors.cyan(metrics.user)],
    style: { head: [], border: [] },
  });
  table.push(
    ['Days', metrics.days],
    ['Period (UTC)', `${metrics.startDate} to ${metrics.endDate}`],
    ['Total contributions', metrics.totalContributions],
    ['Active days', metrics.activeDays],
    [
      'Busiest day',
      metrics.busiestDay
        ? `${metrics.busiestDay.date} (${metrics.busiestDay.count} contributions)`
        : 'No contributions',
    ],
    ['Current streak', formatStreak(metrics.currentStreak)],
    ['Longest streak', formatStreak(metrics.longestStreak)],
  );
  return table.toString();
}
