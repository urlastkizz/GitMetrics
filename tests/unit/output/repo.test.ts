import { expect, it } from 'vitest';
import { formatRepository } from '../../../src/output/repo.js';

const metrics = {
  repository: 'owner/name',
  stars: 12,
  forks: 2,
  openIssues: 3,
  openPullRequests: 1,
  languages: [{ name: 'TypeScript', percentage: 75 }],
  lastCommitAt: '2026-01-02T03:04:05.000Z',
};

it('renders all metrics and two-decimal percentages without ANSI', () => {
  const output = formatRepository(metrics, { color: false });
  for (const value of [
    'owner/name',
    'Stars',
    '12',
    'Forks',
    '2',
    'Open issues',
    '3',
    'Open PRs',
    '1',
    'TypeScript: 75.00%',
    metrics.lastCommitAt,
  ])
    expect(output).toContain(value);
  expect(output).not.toContain('\u001b');
});
it('returns only equivalent valid JSON', () => {
  expect(JSON.parse(formatRepository(metrics, { json: true }))).toEqual(
    metrics,
  );
});
it('renders empty repositories clearly', () => {
  const output = formatRepository({
    ...metrics,
    lastCommitAt: null,
    languages: [],
  });
  expect(output).toContain('No commits');
  expect(output).toContain('No languages');
});
