import { expect, it } from 'vitest';
import { formatRepository } from '../../../src/output/repo.js';

const metrics = {
  repository: 'owner/name',
  stars: 12,
  forks: 2,
  openIssues: 3,
  openPullRequests: 1,
  languages: [
    { name: 'TypeScript', percentage: 75 },
    { name: 'JavaScript', percentage: 25 },
  ],
  lastCommitAt: '2026-01-02T03:04:05.000Z',
};

it('renders all metrics and two-decimal percentages without ANSI', () => {
  const output = formatRepository(metrics, { color: false });
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
    ['Metric', 'owner/name'],
    ['Stars', '12'],
    ['Forks', '2'],
    ['Open issues', '3'],
    ['Open PRs', '1'],
    ['Languages', 'TypeScript: 75.00%'],
    ['', 'JavaScript: 25.00%'],
    ['Last commit (UTC)', metrics.lastCommitAt],
  ]);
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

const manyLanguages = [40, 25, 15, 10, 5, 3, 2].map((percentage, index) => ({
  name: `Language${index + 1}`,
  percentage,
}));

function languageRows(output: string): string[] {
  return [...output.matchAll(/(\w+): (\d+\.\d{2})%/g)].map(
    ([, name, percentage]) => `${name}: ${percentage}%`,
  );
}

it('shows the top five languages and sums the rest as Other, last', () => {
  expect(
    languageRows(formatRepository({ ...metrics, languages: manyLanguages })),
  ).toEqual([
    'Language1: 40.00%',
    'Language2: 25.00%',
    'Language3: 15.00%',
    'Language4: 10.00%',
    'Language5: 5.00%',
    'Other: 5.00%',
  ]);
});

it.each([1, 5])('omits Other with exactly %i languages', (count) => {
  const languages = Array.from({ length: count }, (_, index) => ({
    name: `Language${index + 1}`,
    percentage: 100 / count,
  }));
  const rows = languageRows(formatRepository({ ...metrics, languages }));
  expect(rows).toEqual(
    languages.map(
      ({ name, percentage }) => `${name}: ${percentage.toFixed(2)}%`,
    ),
  );
});

it.each([1, 20])(
  'supports a table limit of %i without mutating input or JSON',
  (limit) => {
    const languages = Array.from({ length: 21 }, (_, index) => ({
      name: `Language${21 - index}`,
      percentage: index === 0 ? 20 : 4,
    }));
    const input = { ...metrics, languages };
    const original = structuredClone(input);
    const rows = languageRows(formatRepository(input, { languages: limit }));
    expect(rows).toEqual([
      ...languages
        .slice(0, limit)
        .map(({ name, percentage }) => `${name}: ${percentage.toFixed(2)}%`),
      `Other: ${((21 - limit) * 4).toFixed(2)}%`,
    ]);
    expect(
      JSON.parse(formatRepository(input, { json: true, languages: limit })),
    ).toEqual(original);
    expect(input).toEqual(original);
  },
);

it('omits Other when the count equals the requested limit', () => {
  expect(languageRows(formatRepository(metrics, { languages: 2 }))).toEqual([
    'TypeScript: 75.00%',
    'JavaScript: 25.00%',
  ]);
});

it.each([
  {
    percentages: [33.33, 33.33, 33.33],
    limit: 5,
    expected: ['Language1: 33.34%', 'Language2: 33.33%', 'Language3: 33.33%'],
  },
  {
    percentages: [16.67, 16.67, 16.67, 16.67, 16.67, 16.67],
    limit: 20,
    expected: [
      'Language1: 16.65%',
      'Language2: 16.67%',
      'Language3: 16.67%',
      'Language4: 16.67%',
      'Language5: 16.67%',
      'Language6: 16.67%',
    ],
  },
  {
    percentages: [16.67, 16.67, 16.67, 16.67, 16.67, 16.67],
    limit: 1,
    expected: ['Language1: 16.67%', 'Other: 83.33%'],
  },
  {
    percentages: [33.33, 33.33, 33.33],
    limit: 1,
    expected: ['Language1: 33.33%', 'Other: 66.67%'],
  },
])(
  'balances displayed hundredths without changing JSON: $percentages, limit $limit',
  ({ percentages, limit, expected }) => {
    const input = {
      ...metrics,
      languages: percentages.map((percentage, index) => ({
        name: `Language${index + 1}`,
        percentage,
      })),
    };
    const original = structuredClone(input);
    const rows = languageRows(formatRepository(input, { languages: limit }));
    expect(rows).toEqual(expected);
    expect(
      rows.reduce(
        (sum, row) => sum + Number(row.split(': ')[1]?.replace(/[.%]/g, '')),
        0,
      ),
    ).toBe(10000);
    expect(
      JSON.parse(formatRepository(input, { json: true, languages: limit })),
    ).toEqual(original);
    expect(input).toEqual(original);
  },
);
