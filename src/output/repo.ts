import Table from 'cli-table3';
import { createColors } from 'picocolors';
import type { RepositoryMetrics } from '../core/types.js';

function formatLanguages(
  languages: RepositoryMetrics['languages'],
  limit: number,
): string {
  const rows = languages.slice(0, limit).map((row) => ({
    name: row.name,
    hundredths: Math.round(row.percentage * 100),
  }));
  if (languages.length > limit) {
    rows.push({
      name: 'Other',
      hundredths: languages
        .slice(limit)
        .reduce((sum, row) => sum + Math.round(row.percentage * 100), 0),
    });
  }
  const largest = rows.reduce<(typeof rows)[number] | undefined>(
    (best, row) => (!best || row.hundredths > best.hundredths ? row : best),
    undefined,
  );
  // Correct presentation rounding only; JSON retains the original percentages.
  if (largest)
    largest.hundredths +=
      10000 - rows.reduce((sum, row) => sum + row.hundredths, 0);
  return (
    rows
      .map((row) => `${row.name}: ${(row.hundredths / 100).toFixed(2)}%`)
      .join('\n') || 'No languages'
  );
}

export function formatRepository(
  metrics: RepositoryMetrics,
  options: { json?: boolean; color?: boolean; languages?: number } = {},
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
    ['Languages', formatLanguages(metrics.languages, options.languages ?? 5)],
    ['Last commit (UTC)', metrics.lastCommitAt ?? 'No commits'],
  );
  return table.toString();
}
