import { Command } from 'commander';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { registerActivityCommand } from '../../../src/cli/commands/activity.js';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-02T03:04:05Z'));
  vi.stubEnv('GITHUB_TOKEN', 'environment-placeholder');
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  process.exitCode = 0;
});
function setup() {
  const program = new Command().exitOverride();
  const loader = vi.fn().mockResolvedValue({
    user: 'Octocat',
    contributionDays: [{ date: '2026-01-02', count: 3 }],
  });
  registerActivityCommand(program, loader);
  const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  return { program, loader, stdout, stderr };
}
it('defaults to 30 UTC days and uses an explicit token before environment', async () => {
  const { program, loader, stdout, stderr } = setup();
  await program.parseAsync(
    ['activity', 'octocat', '--token', 'explicit-placeholder', '--no-color'],
    { from: 'user' },
  );
  expect(loader).toHaveBeenCalledExactlyOnceWith(
    'octocat',
    {
      days: 30,
      startDate: '2025-12-04',
      endDate: '2026-01-02',
      from: '2025-12-04T00:00:00.000Z',
      to: '2026-01-02T03:04:05.000Z',
    },
    'explicit-placeholder',
  );
  expect(stdout.mock.calls.flat().join('')).toMatch(
    /│ Total contributions\s+│ 3\s+│/,
  );
  expect(stderr).not.toHaveBeenCalled();
});
it.each([1, 365])(
  'accepts boundary %i and prints only JSON plus newline',
  async (days) => {
    const { program, stdout, stderr, loader } = setup();
    await program.parseAsync(
      ['activity', 'octocat', '--days', String(days), '--json'],
      { from: 'user' },
    );
    expect(stdout).toHaveBeenCalledExactlyOnceWith(
      `${JSON.stringify({ user: 'Octocat', days, startDate: days === 1 ? '2026-01-02' : '2025-01-03', endDate: '2026-01-02', totalContributions: 3, activeDays: 1, busiestDay: { date: '2026-01-02', count: 3 } })}\n`,
    );
    expect(loader.mock.calls[0]?.[2]).toBe('environment-placeholder');
    expect(stderr).not.toHaveBeenCalled();
  },
);
it.each([
  '0',
  '366',
  '-1',
  '1.5',
  '1e2',
  '2days',
  'NaN',
  'Infinity',
  '+2',
  ' 2',
])(
  'rejects invalid days %s before authentication and loading',
  async (days) => {
    vi.stubEnv('GITHUB_TOKEN', '');
    const { program, loader, stdout, stderr } = setup();
    await expect(
      program.parseAsync(['activity', 'octocat', '--days', days], {
        from: 'user',
      }),
    ).rejects.toMatchObject({ exitCode: 2 });
    expect(stderr.mock.calls.flat().join('')).toBe(
      'Days must be an integer from 1 to 365.\n',
    );
    expect(stdout).not.toHaveBeenCalled();
    expect(loader).not.toHaveBeenCalled();
  },
);
it.each(['', '   '])(
  'explains missing or blank tokens without loading',
  async (token) => {
    vi.stubEnv('GITHUB_TOKEN', token);
    const { program, loader, stdout, stderr } = setup();
    await program.parseAsync(['activity', 'octocat'], { from: 'user' });
    expect(process.exitCode).toBe(1);
    expect(stderr.mock.calls.flat().join('')).toBe(
      'Error: Activity requires a GitHub token. Set GITHUB_TOKEN or use --token <token>.\n',
    );
    expect(loader).not.toHaveBeenCalled();
    expect(stdout).not.toHaveBeenCalled();
  },
);
it('treats a blank override as missing even when environment is configured', async () => {
  const { program, loader } = setup();
  await program.parseAsync(['activity', 'octocat', '--token', '  '], {
    from: 'user',
  });
  expect(process.exitCode).toBe(1);
  expect(loader).not.toHaveBeenCalled();
});
it.each(['@octocat', 'a/b', 'https://github.com/octocat', 'a b'])(
  'rejects malformed user %s',
  async (user) => {
    const { program, loader, stdout, stderr } = setup();
    await expect(
      program.parseAsync(['activity', user], { from: 'user' }),
    ).rejects.toMatchObject({ exitCode: 2 });
    expect(stderr.mock.calls.flat().join('')).toBe(
      'Expected a GitHub username without @ or a URL.\n',
    );
    expect(stdout).not.toHaveBeenCalled();
    expect(loader).not.toHaveBeenCalled();
  },
);
it.each([['activity'], ['activity', 'octocat', '--days']])(
  'rejects missing arguments without loading: %j',
  async (...args) => {
    const { program, loader, stdout, stderr } = setup();
    await expect(
      program.parseAsync(args, { from: 'user' }),
    ).rejects.toMatchObject({ exitCode: 1 });
    expect(stderr.mock.calls.flat().join('')).toBe(
      args.length === 1
        ? "error: missing required argument 'user'\n"
        : "error: option '--days <n>' argument missing\n",
    );
    expect(stdout).not.toHaveBeenCalled();
    expect(loader).not.toHaveBeenCalled();
  },
);
it('reports missing users on stderr only with code1', async () => {
  const { program, loader, stdout, stderr } = setup();
  loader.mockRejectedValue(
    new Error('GitHub user not found. Check the username.'),
  );
  await program.parseAsync(['activity', 'missing', '--json'], { from: 'user' });
  expect(process.exitCode).toBe(1);
  expect(stdout).not.toHaveBeenCalled();
  expect(stderr.mock.calls.flat().join('')).toBe(
    'Error: GitHub user not found. Check the username.\n',
  );
});
it('documents all activity flags', async () => {
  const { program, stdout, loader } = setup();
  await expect(
    program.parseAsync(['activity', '--help'], { from: 'user' }),
  ).rejects.toMatchObject({ exitCode: 0 });
  for (const flag of ['--days', '--json', '--token', '--no-color'])
    expect(stdout.mock.calls.flat().join('')).toContain(flag);
  expect(loader).not.toHaveBeenCalled();
});
