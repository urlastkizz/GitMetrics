import { expect, it } from 'vitest';
import { calculateStreaks } from '../../../src/core/metrics/streaks.js';

const today = new Date('2026-01-02T03:04:05Z');
function calendar(offsets: number[]) {
  return offsets.map((offset) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - offset);
    return { date: date.toISOString().slice(0, 10), count: 1 };
  });
}
const zero = { days: 0, truncated: false };
it('returns zero streaks for an empty calendar', () => {
  expect(calculateStreaks([], today)).toEqual({
    currentStreak: zero,
    longestStreak: zero,
  });
});
it('returns zero streaks when all days are inactive', () => {
  expect(
    calculateStreaks(
      calendar([0, 1, 364]).map((day) => ({ ...day, count: 0 })),
      today,
    ),
  ).toEqual({ currentStreak: zero, longestStreak: zero });
});
it.each([
  { name: 'includes today', offsets: [0, 1, 2], current: 3, longest: 3 },
  {
    name: 'keeps yesterday when today is inactive',
    offsets: [1, 2, 3],
    current: 3,
    longest: 3,
  },
  {
    name: 'resets after today and yesterday are inactive',
    offsets: [2, 3],
    current: 0,
    longest: 2,
  },
  {
    name: 'finds the longest run across a gap',
    offsets: [0, 1, 3, 4, 5],
    current: 2,
    longest: 3,
  },
  {
    name: 'handles equally long runs',
    offsets: [0, 1, 4, 5],
    current: 2,
    longest: 2,
  },
])('$name', ({ offsets, current, longest }) => {
  expect(calculateStreaks(calendar(offsets), today)).toEqual({
    currentStreak: { days: current, truncated: false },
    longestStreak: { days: longest, truncated: false },
  });
});
it('marks both streaks as truncated when all 365 days are active', () => {
  expect(
    calculateStreaks(calendar(Array.from({ length: 365 }, (_, i) => i)), today),
  ).toEqual({
    currentStreak: { days: 365, truncated: true },
    longestStreak: { days: 365, truncated: true },
  });
});
it('preserves the observed length of a short boundary run', () => {
  expect(calculateStreaks(calendar([364, 363]), today)).toEqual({
    currentStreak: zero,
    longestStreak: { days: 2, truncated: true },
  });
});
it('prefers a truncated longest run over an equally long later run', () => {
  expect(calculateStreaks(calendar([0, 1, 364, 363]), today)).toEqual({
    currentStreak: { days: 2, truncated: false },
    longestStreak: { days: 2, truncated: true },
  });
});
it('keeps 364 truncated days when only today is inactive', () => {
  expect(
    calculateStreaks(
      calendar(Array.from({ length: 364 }, (_, i) => i + 1)),
      today,
    ),
  ).toEqual({
    currentStreak: { days: 364, truncated: true },
    longestStreak: { days: 364, truncated: true },
  });
});
it('ignores outside dates and treats missing days as inactive in unordered input', () => {
  expect(calculateStreaks(calendar([1, 365, 3, -1, 0]), today)).toEqual({
    currentStreak: { days: 2, truncated: false },
    longestStreak: { days: 2, truncated: false },
  });
});
