import Table from 'cli-table3';
import { createColors } from 'picocolors';
import type { RepositoryMetrics } from '../core/types.js';

export function formatRepository(
  metrics: RepositoryMetrics,
  options: { json?: boolean; color?: boolean } = {},
): string {
  if (options.json) return JSON.stringify(metrics);
  const colors = createColors(options.color ?? process.stdout.isTTY ?? false);
  const table = new Table({
    head: [colors.cyan('Metric'), colors.cyan(metrics.repository)],
    style: { head: [], border: [] },
  });
  table.push(
    ['Stars', metrics.stars],
    ['Forks', metrics.forks],
    ['Open issues', metrics.openIssues],
    ['Open PRs', metrics.openPullRequests],
    [
      'Languages',
      metrics.languages
        .map(
          (language) => `${language.name}: ${language.percentage.toFixed(2)}%`,
        )
        .join('\n') || 'No languages',
    ],
    ['Last commit (UTC)', metrics.lastCommitAt ?? 'No commits'],
  );
  return table.toString();
}
