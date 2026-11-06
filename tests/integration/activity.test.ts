import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { runCli } from '../../src/cli/index.js';
import { createGitHubClient } from '../../src/github/client.js';
import { fetchActivity } from '../../src/github/activity.js';
import type { ActivityPeriod } from '../../src/core/activity-types.js';

const days = [
  { date: '2026-01-02', contributionCount: 3 },
  { date: '2026-01-01', contributionCount: 2 },
  { date: '2025-12-31', contributionCount: 3 },
  { date: '2025-12-03', contributionCount: 100 },
  { date: '2026-01-03', contributionCount: 200 },
];
function calendar(contributionDays = days) {
  return {
    user: {
      login: 'Octocat',
      contributionsCollection: {
        contributionCalendar: { weeks: [{ contributionDays }] },
      },
    },
  };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-02T03:04:05Z'));
  vi.stubEnv('GITHUB_TOKEN', 'environment-placeholder');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('Unexpected real network request')),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  process.exitCode = 0;
});
function setup(body: unknown = { data: calendar() }) {
  const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
    async () =>
      new Response(JSON.stringify(body), {
        headers: { 'content-type': 'application/json' },
      }),
  );
  const loader = vi.fn((user: string, period: ActivityPeriod, token: string) =>
    fetchActivity(user, period, createGitHubClient(token, fetch)),
  );
  const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  return { fetch, loader, stdout, stderr };
}
it.each([
  { order: 'newest first', contributionDays: days },
  { order: 'oldest first', contributionDays: [...days].reverse() },
])(
  'runs GraphQL through the default30-day table with ties in either order: $order',
  async ({ contributionDays }) => {
    const { loader, fetch, stdout, stderr } = setup({
      data: calendar(contributionDays),
    });
    await runCli(
      ['node', 'gitmetrics', 'activity', 'octocat', '--no-color'],
      undefined,
      loader,
    );
    const output = stdout.mock.calls.flat().join('');
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
      ['Days', '30'],
      ['Period (UTC)', '2025-12-04 to 2026-01-02'],
      ['Total contributions', '8'],
      ['Active days', '3'],
      ['Busiest day', '2026-01-02 (3 contributions)'],
      ['Current streak', '3 days'],
      ['Longest streak', '3 days'],
    ]);
    expect(output).not.toContain('\u001b');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(stderr).not.toHaveBeenCalled();
  },
);
it.each([
  ['--json', 'activity', 'octocat', '--days', '3'],
  ['activity', 'octocat', '--days', '3', '--json'],
])(
  'prints exact custom-period JSON with flags in either position: %j',
  async (...args) => {
    const { loader, fetch, stdout, stderr } = setup();
    await runCli(['node', 'gitmetrics', ...args], undefined, loader);
    expect(stdout).toHaveBeenCalledExactlyOnceWith(
      `${JSON.stringify({ user: 'Octocat', days: 3, startDate: '2025-12-31', endDate: '2026-01-02', totalContributions: 8, activeDays: 3, busiestDay: { date: '2026-01-02', count: 3 }, currentStreak: { days: 3, truncated: false }, longestStreak: { days: 3, truncated: false } })}\n`,
    );
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toHaveProperty(
      'variables',
      {
        login: 'octocat',
        from: '2025-01-03T00:00:00.000Z',
        to: '2026-01-02T03:04:05.000Z',
      },
    );
    expect(stderr).not.toHaveBeenCalled();
  },
);
it.each(['0', '366', '1.5', '1e2', '2text'])(
  'returns usage2 and guidance before auth/network for --days %s',
  async (days) => {
    vi.stubEnv('GITHUB_TOKEN', '');
    const { loader, fetch, stdout, stderr } = setup();
    await runCli(
      ['node', 'gitmetrics', 'activity', 'octocat', '--days', days],
      undefined,
      loader,
    );
    expect(process.exitCode).toBe(2);
    expect(stderr.mock.calls.flat().join('')).toBe(
      'Days must be an integer from 1 to 365.\n',
    );
    expect(stdout).not.toHaveBeenCalled();
    expect(loader).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  },
);
it.each([['activity'], ['activity', 'octocat', '--days']])(
  'rejects missing arguments as usage2: %j',
  async (...args) => {
    const { loader, fetch, stdout, stderr } = setup();
    await runCli(['node', 'gitmetrics', ...args], undefined, loader);
    expect(process.exitCode).toBe(2);
    expect(stderr.mock.calls.flat().join('')).toBe(
      args.length === 1
        ? "error: missing required argument 'user'\n"
        : "error: option '--days <n>' argument missing\n",
    );
    expect(stdout).not.toHaveBeenCalled();
    expect(loader).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  },
);
it('explains missing token with code1 and no network', async () => {
  vi.stubEnv('GITHUB_TOKEN', '');
  const { loader, fetch, stdout, stderr } = setup();
  await runCli(
    ['node', 'gitmetrics', 'activity', 'octocat', '--json'],
    undefined,
    loader,
  );
  expect(process.exitCode).toBe(1);
  expect(stderr.mock.calls.flat().join('')).toBe(
    'Error: Activity requires a GitHub token.\n' +
      "PowerShell: $env:GITHUB_TOKEN = 'YOUR_TOKEN'\n" +
      "bash/zsh: export GITHUB_TOKEN='YOUR_TOKEN'\n" +
      'See https://github.com/urlastkizz/GitMetrics#authentication\n',
  );
  expect(stdout).not.toHaveBeenCalled();
  expect(loader).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});
it('reports a rejected activity token without printing raw credentials', async () => {
  const token = 'rejected-activity-placeholder';
  const { loader, fetch, stdout, stderr } = setup();
  fetch.mockResolvedValue(
    new Response(JSON.stringify({ message: `Rejected ${token}` }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    }),
  );
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  await runCli(
    ['node', 'gitmetrics', 'activity', 'octocat', '--token', token, '--json'],
    undefined,
    loader,
  );
  expect(process.exitCode).toBe(1);
  expect(stdout).not.toHaveBeenCalled();
  expect(stderr.mock.calls.flat().join('')).toBe(
    'Error: GitHub rejected the token. It may be invalid or expired. Check --token or GITHUB_TOKEN.\n',
  );
  expect(stderr.mock.calls.flat().join('')).not.toContain(token);
  expect(log).not.toHaveBeenCalled();
  expect(loader.mock.calls[0]?.[2]).toBe(token);
});
it.each([
  [
    { data: { user: null } },
    'Error: GitHub user not found. Check the username.\n',
  ],
  [
    {
      data: calendar(),
      errors: [{ type: 'NOT_FOUND', message: 'environment-placeholder' }],
    },
    'Error: GitHub user not found. Check the username.\n',
  ],
  [
    {
      data: calendar(),
      errors: [{ type: 'FORBIDDEN', message: 'environment-placeholder' }],
    },
    'Error: GitHub access denied. Check token permissions for activity.\n',
  ],
])(
  'rejects missing users and partial GraphQL responses: %j',
  async (body, message) => {
    const { loader, stdout, stderr } = setup(body);
    await runCli(
      ['node', 'gitmetrics', 'activity', 'missing', '--json'],
      undefined,
      loader,
    );
    expect(process.exitCode).toBe(1);
    expect(stderr.mock.calls.flat().join('')).toBe(message);
    expect(stderr.mock.calls.flat().join('')).not.toContain(
      'environment-placeholder',
    );
    expect(stdout).not.toHaveBeenCalled();
  },
);
it('keeps inactive periods as zeros and a null busiest day', async () => {
  const { loader, stdout } = setup({
    data: calendar([{ date: '2026-01-02', contributionCount: 0 }]),
  });
  await runCli(
    ['node', 'gitmetrics', 'activity', 'octocat', '--days', '1', '--json'],
    undefined,
    loader,
  );
  expect(stdout).toHaveBeenCalledExactlyOnceWith(
    `${JSON.stringify({ user: 'Octocat', days: 1, startDate: '2026-01-02', endDate: '2026-01-02', totalContributions: 0, activeDays: 0, busiestDay: null, currentStreak: { days: 0, truncated: false }, longestStreak: { days: 0, truncated: false } })}\n`,
  );
});

it.each([
  { name: 'includes today', active: ['2026-01-01', '2026-01-02'], current: 2 },
  { name: 'ends yesterday', active: ['2025-12-31', '2026-01-01'], current: 2 },
  {
    name: 'resets after two inactive days',
    active: ['2025-12-30', '2025-12-31'],
    current: 0,
  },
])(
  'keeps streaks outside the requested totals period: $name',
  async ({ active, current }) => {
    const { loader, fetch, stdout, stderr } = setup({
      data: calendar(active.map((date) => ({ date, contributionCount: 1 }))),
    });
    await runCli(
      ['node', 'gitmetrics', 'activity', 'octocat', '--days', '1', '--json'],
      undefined,
      loader,
    );
    expect(JSON.parse(stdout.mock.calls.flat().join(''))).toMatchObject({
      days: 1,
      totalContributions: active.includes('2026-01-02') ? 1 : 0,
      currentStreak: { days: current, truncated: false },
      longestStreak: { days: 2, truncated: false },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)).variables,
    ).toEqual({
      login: 'octocat',
      from: '2025-01-03T00:00:00.000Z',
      to: '2026-01-02T03:04:05.000Z',
    });
    expect(stderr).not.toHaveBeenCalled();
  },
);

it.each([2, 365])(
  'prints an observed truncated %i-day streak in table and JSON',
  async (length) => {
    const contributionDays = Array.from({ length }, (_, index) => {
      const date = new Date('2025-01-03T00:00:00Z');
      date.setUTCDate(date.getUTCDate() + index);
      return { date: date.toISOString().slice(0, 10), contributionCount: 1 };
    });
    const { loader, stdout, stderr } = setup({
      data: calendar(contributionDays),
    });
    await runCli(
      ['node', 'gitmetrics', 'activity', 'octocat', '--no-color'],
      undefined,
      loader,
    );
    const row = stdout.mock.calls
      .flat()
      .join('')
      .split('\n')
      .find((line) => line.includes('Longest streak'));
    expect(row?.split('│')[2]?.trim()).toBe(`${length}+ days`);
    stdout.mockClear();
    await runCli(
      ['node', 'gitmetrics', 'activity', 'octocat', '--json'],
      undefined,
      loader,
    );
    const output = JSON.parse(stdout.mock.calls.flat().join(''));
    expect(output.longestStreak).toEqual({ days: length, truncated: true });
    expect(output.currentStreak).toEqual(
      length === 365
        ? { days: 365, truncated: true }
        : { days: 0, truncated: false },
    );
    expect(stderr).not.toHaveBeenCalled();
  },
);

it('preserves rate limit messages and exit code', async () => {
  const { loader, fetch, stdout, stderr } = setup();
  fetch.mockResolvedValue(
    new Response(JSON.stringify({ message: 'rate limit' }), {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'x-ratelimit-reset': '1767326400',
      },
    }),
  );
  await runCli(
    ['node', 'gitmetrics', 'activity', 'octocat', '--json'],
    undefined,
    loader,
  );
  expect(process.exitCode).toBe(1);
  expect(stdout).not.toHaveBeenCalled();
  expect(stderr.mock.calls.flat().join('')).toBe(
    'Error: GitHub rate limit reached. Resets at 2026-01-02T04:00:00.000Z (UTC).\n',
  );
});
