import { expect, it } from 'vitest';
import { formatActivity } from '../../../src/output/activity.js';

const metrics = {
  user: 'Octocat',
  days: 2,
  startDate: '2026-01-01',
  endDate: '2026-01-02',
  totalContributions: 7,
  activeDays: 2,
  busiestDay: { date: '2026-01-02', count: 5 },
};
it('associates every table metric with its exact value and disables ANSI', () => {
  const output = formatActivity(metrics, { color: false });
  const rows = output
    .split('\n')
    .filter((line) => line.startsWith('│'))
    .map((line) =>
      line
        .split('│')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
  expect(rows).toEqual([
    ['Metric', 'Octocat'],
    ['Days', '2'],
    ['Period (UTC)', '2026-01-01 to 2026-01-02'],
    ['Total contributions', '7'],
    ['Active days', '2'],
    ['Busiest day', '2026-01-02 (5 contributions)'],
  ]);
  expect(output).not.toContain('\u001b');
});
it('returns exactly one JSON document matching all metrics', () => {
  expect(formatActivity(metrics, { json: true })).toBe(JSON.stringify(metrics));
});
it('explains periods with no contributions', () => {
  expect(
    formatActivity({
      ...metrics,
      totalContributions: 0,
      activeDays: 0,
      busiestDay: null,
    }),
  ).toMatch(/│ Busiest day\s+│ No contributions\s+│/);
});
