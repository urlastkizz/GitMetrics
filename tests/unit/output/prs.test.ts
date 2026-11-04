import { expect, it } from 'vitest';
import { formatPullRequests } from '../../../src/output/prs.js';
const metrics = {
  repository: 'owner/name',
  analyzed: 4,
  merged: 3,
  closedWithoutMerge: 1,
  mergeRate: 75,
  medianTimeToMergeSeconds: 187200,
  averageTimeToMergeSeconds: 2100,
};
it('formats every metric and human readable durations without color', () => {
  const output = formatPullRequests(metrics, { color: false });
  for (const value of [
    'owner/name',
    'PRs analyzed',
    'Merged',
    'Closed without merge',
    'Merge rate',
    '75.00%',
    'Median time to merge',
    '2d 4h',
    'Average time to merge',
    '35m',
  ])
    expect(output).toContain(value);
  expect(output).not.toContain('\u001b');
});
it('serializes unchanged numeric seconds without terminal formatting', () => {
  expect(
    JSON.parse(
      formatPullRequests(
        { ...metrics, averageTimeToMergeSeconds: 1.5 },
        { json: true, color: true },
      ),
    ),
  ).toEqual({ ...metrics, averageTimeToMergeSeconds: 1.5 });
});
it('shows No closed pull requests for an empty sample', () => {
  expect(
    formatPullRequests({
      ...metrics,
      analyzed: 0,
      merged: 0,
      closedWithoutMerge: 0,
      mergeRate: 0,
      medianTimeToMergeSeconds: null,
      averageTimeToMergeSeconds: null,
    }),
  ).toContain('No closed pull requests');
});
it('shows zero percent and n/a when none were merged', () => {
  const output = formatPullRequests({
    ...metrics,
    merged: 0,
    mergeRate: 0,
    medianTimeToMergeSeconds: null,
    averageTimeToMergeSeconds: null,
  });
  expect(output).toContain('0.00%');
  expect(output.match(/n\/a/g)).toHaveLength(2);
});
it.each([
  [0, '0s'],
  [0.5, '0s'],
  [59, '59s'],
  [61, '1m 1s'],
  [90061, '1d 1h 1m 1s'],
])('formats %s seconds as %s', (seconds, expected) => {
  expect(
    formatPullRequests({ ...metrics, medianTimeToMergeSeconds: seconds }),
  ).toContain(expected);
});
