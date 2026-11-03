import { afterEach, expect, it, vi } from 'vitest';
import { runCli } from '../../src/cli/index.js';
import { createGitHubClient } from '../../src/github/client.js';
import { fetchRepository } from '../../src/github/repo.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  process.exitCode = 0;
});

function setup(
  status = 200,
  languageBytes = { TypeScript: 3, JavaScript: 1 } as Record<string, number>,
) {
  vi.stubEnv('GITHUB_TOKEN', '');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('Unexpected global network request')),
  );
  const fetch = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    let data: unknown = {
      full_name: 'owner/name',
      stargazers_count: 12,
      forks_count: 2,
      open_issues_count: 4,
      default_branch: 'main',
    };
    if (url.includes('/languages')) data = languageBytes;
    if (url.includes('/pulls')) data = [{ number: 1 }];
    if (url.includes('/commits'))
      data = [{ commit: { committer: { date: '2026-01-02T03:04:05Z' } } }];
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'content-type': 'application/json',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': '1767225600',
      },
    });
  });
  const client = createGitHubClient(undefined, fetch);
  const loader = vi.fn((repository: string) =>
    fetchRepository(repository, client),
  );
  const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  return { loader, fetch, stdout, stderr };
}
it('runs the complete table flow from mocked API to terminal', async () => {
  const { loader, fetch, stdout, stderr } = setup();
  await runCli(
    ['node', 'gitmetrics', 'repo', 'owner/name', '--no-color'],
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
    ['Metric', 'owner/name'],
    ['Stars', '12'],
    ['Forks', '2'],
    ['Open issues', '3'],
    ['Open PRs', '1'],
    ['Languages', 'TypeScript: 75.00%'],
    ['', 'JavaScript: 25.00%'],
    ['Last commit (UTC)', '2026-01-02T03:04:05.000Z'],
  ]);
  expect(fetch).toHaveBeenCalledTimes(4);
  expect(stderr).not.toHaveBeenCalled();
});

function languageRows(output: string): string[] {
  return [...output.matchAll(/(\w+): (\d+\.\d{2})%/g)].map(
    ([, name, percentage]) => `${name}: ${percentage}%`,
  );
}

const manyLanguages = { A: 40, B: 25, C: 15, D: 10, E: 5, F: 3, G: 2 };
it.each([
  {
    args: [],
    expected: [
      'A: 40.00%',
      'B: 25.00%',
      'C: 15.00%',
      'D: 10.00%',
      'E: 5.00%',
      'Other: 5.00%',
    ],
  },
  { args: ['--languages', '1'], expected: ['A: 40.00%', 'Other: 60.00%'] },
])(
  'groups languages through the complete API flow: $args',
  async ({ args, expected }) => {
    const { loader, fetch, stdout, stderr } = setup(200, manyLanguages);
    await runCli(
      ['node', 'gitmetrics', 'repo', 'owner/name', '--no-color', ...args],
      loader,
    );
    expect(languageRows(stdout.mock.calls.flat().join(''))).toEqual(expected);
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(stderr).not.toHaveBeenCalled();
    expect(process.exitCode ?? 0).toBe(0);
  },
);

it.each([
  ['--json', 'repo', 'owner/name', '--languages', '1'],
  ['repo', 'owner/name', '--languages', '1', '--json'],
])('preserves full JSON despite the table limit: %j', async (...args) => {
  const { loader, stdout, stderr } = setup(200, manyLanguages);
  await runCli(['node', 'gitmetrics', ...args], loader);
  expect(stdout).toHaveBeenCalledTimes(1);
  expect(JSON.parse(String(stdout.mock.calls[0]?.[0]))).toEqual({
    repository: 'owner/name',
    stars: 12,
    forks: 2,
    openIssues: 3,
    openPullRequests: 1,
    languages: Object.entries(manyLanguages).map(([name, percentage]) => ({
      name,
      percentage,
    })),
    lastCommitAt: '2026-01-02T03:04:05.000Z',
  });
  expect(stderr).not.toHaveBeenCalled();
});

it.each(['0', '21', '-1', '1.5', 'no', '1e1', ''])(
  'rejects language limit %j without API access',
  async (value) => {
    const { loader, fetch, stdout, stderr } = setup();
    await runCli(
      ['node', 'gitmetrics', 'repo', 'owner/name', '--languages', value],
      loader,
    );
    expect(process.exitCode).toBe(2);
    expect(stderr.mock.calls.flat().join('')).toBe(
      'Languages must be an integer from 1 to 20.\n',
    );
    expect(stdout).not.toHaveBeenCalled();
    expect(loader).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  },
);

it('reports a missing language option value as usage error without API access', async () => {
  const { loader, fetch, stdout, stderr } = setup();
  await runCli(
    ['node', 'gitmetrics', 'repo', 'owner/name', '--languages'],
    loader,
  );
  expect(process.exitCode).toBe(2);
  expect(stderr.mock.calls.flat().join('')).toBe(
    "error: option '--languages <n>' argument missing\n",
  );
  expect(stdout).not.toHaveBeenCalled();
  expect(loader).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it.each([
  {
    bytes: { A: 1, B: 1, C: 1 },
    limit: '20',
    expected: ['A: 33.34%', 'B: 33.33%', 'C: 33.33%'],
    percentage: 33.33,
  },
  {
    bytes: { A: 1, B: 1, C: 1 },
    limit: '1',
    expected: ['A: 33.33%', 'Other: 66.67%'],
    percentage: 33.33,
  },
  {
    bytes: { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1 },
    limit: '20',
    expected: [
      'A: 16.65%',
      'B: 16.67%',
      'C: 16.67%',
      'D: 16.67%',
      'E: 16.67%',
      'F: 16.67%',
    ],
    percentage: 16.67,
  },
  {
    bytes: { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1 },
    limit: '1',
    expected: ['A: 16.67%', 'Other: 83.33%'],
    percentage: 16.67,
  },
])(
  'balances the table but preserves API-derived JSON: $expected',
  async ({ bytes, limit, expected, percentage }) => {
    const { loader, stdout, stderr } = setup(200, bytes);
    const args = [
      'node',
      'gitmetrics',
      'repo',
      'owner/name',
      '--languages',
      limit,
    ];
    await runCli([...args, '--no-color'], loader);
    const rows = languageRows(stdout.mock.calls.flat().join(''));
    expect(rows).toEqual(expected);
    expect(
      rows.reduce(
        (sum, row) => sum + Number(row.split(': ')[1]?.replace(/[.%]/g, '')),
        0,
      ),
    ).toBe(10000);
    stdout.mockClear();
    await runCli([...args, '--json'], loader);
    expect(JSON.parse(String(stdout.mock.calls[0]?.[0]))).toEqual({
      repository: 'owner/name',
      stars: 12,
      forks: 2,
      openIssues: 3,
      openPullRequests: 1,
      languages: Object.keys(bytes).map((name) => ({ name, percentage })),
      lastCommitAt: '2026-01-02T03:04:05.000Z',
    });
    expect(stderr).not.toHaveBeenCalled();
  },
);
it.each([
  ['--json', 'repo', 'owner/name'],
  ['repo', 'owner/name', '--json'],
])('prints clean JSON with options in either position: %j', async (...args) => {
  const { loader, stdout, stderr } = setup();
  await runCli(['node', 'gitmetrics', ...args], loader);
  expect(stdout).toHaveBeenCalledTimes(1);
  expect(JSON.parse(String(stdout.mock.calls[0]?.[0]))).toEqual({
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
  });
  expect(stderr).not.toHaveBeenCalled();
});
it.each([['repo', 'invalid'], ['repo']])(
  'rejects invalid usage without API calls: %j',
  async (...args) => {
    const { loader, fetch, stdout, stderr } = setup();
    await runCli(['node', 'gitmetrics', ...args], loader);
    expect(process.exitCode).toBe(2);
    expect(fetch).not.toHaveBeenCalled();
    expect(stdout).not.toHaveBeenCalled();
    expect(loader).not.toHaveBeenCalled();
    expect(stderr.mock.calls.flat().join('')).toBe(
      args.length === 1
        ? "error: missing required argument 'owner/name'\n"
        : 'Expected owner/name. Example: gitmetrics repo octocat/Hello-World\n',
    );
  },
);
it.each([
  [404, 'not found'],
  [403, '2026-01-01T00:00:00.000Z'],
])('reports HTTP %i without partial stdout', async (status, message) => {
  const { loader, stdout, stderr } = setup(status);
  await runCli(['node', 'gitmetrics', 'repo', 'owner/name', '--json'], loader);
  expect(process.exitCode).toBe(1);
  expect(stderr.mock.calls.flat().join('')).toContain(message);
  expect(stdout).not.toHaveBeenCalled();
  expect(loader).toHaveBeenCalledWith('owner/name', '');
});
it.each(['environment', 'explicit'])(
  'reports HTTP 401 for a %s token without printing credentials',
  async (source) => {
    const token = 'rejected-repository-placeholder';
    const { stdout, stderr } = setup();
    vi.stubEnv(
      'GITHUB_TOKEN',
      source === 'environment' ? token : 'unused-environment-placeholder',
    );
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: `Rejected ${token}` }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const loader = vi.fn((repository: string, suppliedToken?: string) =>
      fetchRepository(repository, createGitHubClient(suppliedToken, fetch)),
    );
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await runCli(
      [
        'node',
        'gitmetrics',
        'repo',
        'owner/name',
        '--json',
        ...(source === 'explicit' ? ['--token', token] : []),
      ],
      loader,
    );
    expect(process.exitCode).toBe(1);
    expect(loader).toHaveBeenCalledExactlyOnceWith('owner/name', token);
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr.mock.calls.flat().join('')).toBe(
      'Error: GitHub rejected the token. It may be invalid or expired. Check --token or GITHUB_TOKEN.\n',
    );
    expect(stderr.mock.calls.flat().join('')).not.toContain(token);
    expect(stderr.mock.calls.flat().join('')).not.toContain(
      'unused-environment-placeholder',
    );
    expect(log).not.toHaveBeenCalled();
  },
);
