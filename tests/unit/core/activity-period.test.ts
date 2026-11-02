import { expect, it } from 'vitest';
import { createActivityPeriod } from '../../../src/core/activity-period.js';

it('defaults to 30 inclusive UTC days and keeps the supplied instant', () => {
  expect(createActivityPeriod(new Date('2026-01-02T04:05:06Z'))).toEqual({
    days: 30,
    startDate: '2025-12-04',
    endDate: '2026-01-02',
    from: '2025-12-04T00:00:00.000Z',
    to: '2026-01-02T04:05:06.000Z',
  });
});
it.each([
  [1, '2026-01-02'],
  [365, '2025-01-03'],
])('supports %i days', (days, startDate) => {
  expect(
    createActivityPeriod(new Date('2026-01-02T04:05:06Z'), days).startDate,
  ).toBe(startDate);
});
it('uses UTC across offsets and leap days without mutating the clock', () => {
  const now = new Date('2024-03-01T00:30:00+02:00');
  expect(createActivityPeriod(now, 2)).toEqual({
    days: 2,
    startDate: '2024-02-28',
    endDate: '2024-02-29',
    from: '2024-02-28T00:00:00.000Z',
    to: '2024-02-29T22:30:00.000Z',
  });
  expect(now.toISOString()).toBe('2024-02-29T22:30:00.000Z');
});
it.each([0, 366, 1.5, NaN])('rejects invalid period length %s', (days) => {
  expect(() =>
    createActivityPeriod(new Date('2026-01-02T00:00:00Z'), days),
  ).toThrow('1 to 365');
});
