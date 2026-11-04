import { expect, it } from 'vitest';
import { calculatePullRequestMetrics } from '../../../src/core/metrics/prs.js';

function snapshot(durations: (number | null)[]) {
  return {
    repository: 'owner/name',
    pullRequests: durations.map((seconds) => ({
      createdAt: '2026-01-01T00:00:00Z',
      closedAt: '2026-02-01T00:00:00Z',
      mergedAt:
        seconds === null
          ? null
          : new Date(Date.UTC(2026, 0, 1) + seconds * 1000).toISOString(),
    })),
  };
}

it('returns zero counts zero rate and null times for an empty list', () => {
  expect(calculatePullRequestMetrics(snapshot([]), 50)).toEqual({
    repository: 'owner/name',
    analyzed: 0,
    merged: 0,
    closedWithoutMerge: 0,
    mergeRate: 0,
    medianTimeToMergeSeconds: null,
    averageTimeToMergeSeconds: null,
  });
});
it('returns zero merge rate and null times when none were merged', () => {
  expect(calculatePullRequestMetrics(snapshot([null, null]), 50)).toMatchObject(
    {
      analyzed: 2,
      merged: 0,
      closedWithoutMerge: 2,
      mergeRate: 0,
      medianTimeToMergeSeconds: null,
      averageTimeToMergeSeconds: null,
    },
  );
});
it('calculates counts merge rate and merge durations', () => {
  expect(
    calculatePullRequestMetrics(snapshot([60, null, 120, 180]), 50),
  ).toEqual({
    repository: 'owner/name',
    analyzed: 4,
    merged: 3,
    closedWithoutMerge: 1,
    mergeRate: 75,
    medianTimeToMergeSeconds: 120,
    averageTimeToMergeSeconds: 120,
  });
});
it.each([
  { durations: [30, 10], median: 20, average: 20 },
  { durations: [30, 10, 20], median: 20, average: 20 },
  { durations: [0], median: 0, average: 0 },
  { durations: [10, 10, 10000], median: 10, average: 3340 },
  { durations: [1, 2], median: 1.5, average: 1.5 },
])(
  'calculates median and average for $durations',
  ({ durations, median, average }) => {
    expect(calculatePullRequestMetrics(snapshot(durations), 100)).toMatchObject(
      {
        medianTimeToMergeSeconds: median,
        averageTimeToMergeSeconds: average,
      },
    );
  },
);
it('selects the latest requested closed pull requests without mutating input', () => {
  const input = snapshot([10, 20, null]);
  input.pullRequests[1]!.closedAt = '2026-03-01T00:00:00Z';
  const before = structuredClone(input);
  expect(calculatePullRequestMetrics(input, 1)).toMatchObject({
    analyzed: 1,
    merged: 1,
    medianTimeToMergeSeconds: 20,
  });
  expect(input).toEqual(before);
});
it('preserves response order for tied closure dates', () => {
  expect(calculatePullRequestMetrics(snapshot([10, 20, 30]), 2)).toMatchObject({
    analyzed: 2,
    medianTimeToMergeSeconds: 15,
  });
});
