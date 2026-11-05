import Table from 'cli-table3';
import { createColors } from 'picocolors';
import type { PullRequestMetrics } from '../core/prs-types.js';

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'n/a';
  let remaining = Math.floor(seconds);
  const parts: string[] = [];
  for (const [unit, size] of [
    ['d', 86400],
    ['h', 3600],
    ['m', 60],
    ['s', 1],
  ] as const) {
    const count = Math.floor(remaining / size);
    if (count > 0) parts.push(`${count}${unit}`);
    remaining %= size;
  }
  return parts.join(' ') || '0s';
}

export function formatPullRequests(
  metrics: PullRequestMetrics,
  options: { json?: boolean; color?: boolean } = {},
): string {
  if (options.json) return JSON.stringify(metrics);
  const colors = createColors(options.color ?? process.stdout.isTTY ?? false);
  const table = new Table({
    head: [colors.cyan('Metric'), colors.cyan(metrics.repository)],
    style: { head: [], border: [] },
  });
  if (metrics.analyzed === 0) table.push(['Status', 'No closed pull requests']);
  table.push(
    ['PRs analyzed', metrics.analyzed],
    ['Merged', metrics.merged],
    ['Closed without merge', metrics.closedWithoutMerge],
    ['Merge rate', `${metrics.mergeRate.toFixed(2)}%`],
    ['Median time to merge', formatDuration(metrics.medianTimeToMergeSeconds)],
    [
      'Average time to merge',
      formatDuration(metrics.averageTimeToMergeSeconds),
    ],
  );
  return table.toString();
}
