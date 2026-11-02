import { expect, it } from 'vitest';
import { calculateActivityMetrics } from '../../../src/core/metrics/activity.js';
import { createActivityPeriod } from '../../../src/core/activity-period.js';

const period = createActivityPeriod(new Date('2026-01-02T03:04:05Z'), 3);
it.each(['newest first', 'oldest first'])(
  'sums unordered dates and selects the most recent tied day: %s',
  (order) => {
    const contributionDays = [
      { date: '2026-01-02', count: 3 },
      { date: '2025-12-30', count: 100 },
      { date: '2026-01-03', count: 200 },
      { date: '2025-12-31', count: 3 },
      { date: '2026-01-01', count: 0 },
    ];
    const result = calculateActivityMetrics(
      {
        user: 'Octocat',
        contributionDays:
          order === 'newest first'
            ? contributionDays
            : contributionDays.reverse(),
      },
      period,
    );
    expect(result).toEqual({
      user: 'Octocat',
      days: 3,
      startDate: '2025-12-31',
      endDate: '2026-01-02',
      totalContributions: 6,
      activeDays: 2,
      busiestDay: { date: '2026-01-02', count: 3 },
    });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  },
);
it.each([
  { contributionDays: [] },
  { contributionDays: [{ date: '2026-01-01', count: 0 }] },
])('keeps inactive periods with no busiest day', ({ contributionDays }) => {
  expect(
    calculateActivityMetrics({ user: 'octocat', contributionDays }, period),
  ).toEqual({
    user: 'octocat',
    days: 3,
    startDate: '2025-12-31',
    endDate: '2026-01-02',
    totalContributions: 0,
    activeDays: 0,
    busiestDay: null,
  });
});
it('selects a larger count over a more recent date', () => {
  expect(
    calculateActivityMetrics(
      {
        user: 'octocat',
        contributionDays: [
          { date: '2026-01-02', count: 1 },
          { date: '2026-01-01', count: 9 },
        ],
      },
      period,
    ).busiestDay,
  ).toEqual({ date: '2026-01-01', count: 9 });
});
it('rejects duplicate calendar dates', () => {
  expect(() =>
    calculateActivityMetrics(
      {
        user: 'octocat',
        contributionDays: [
          { date: '2026-01-01', count: 1 },
          { date: '2026-01-01', count: 1 },
        ],
      },
      period,
    ),
  ).toThrow('duplicate');
});
it.each([-1, 1.5, NaN, Infinity])(
  'rejects invalid contribution count %s',
  (count) => {
    expect(() =>
      calculateActivityMetrics(
        { user: 'octocat', contributionDays: [{ date: '2026-01-01', count }] },
        period,
      ),
    ).toThrow('invalid');
  },
);
it('rejects invalid dates', () => {
  expect(() =>
    calculateActivityMetrics(
      { user: 'octocat', contributionDays: [{ date: '2026-02-30', count: 1 }] },
      period,
    ),
  ).toThrow('invalid');
});
