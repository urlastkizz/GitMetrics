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

function setup(status = 200) {
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
    if (url.includes('/languages')) data = { TypeScript: 3, JavaScript: 1 };
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
  for (const value of [
    'Stars',
    '12',
    'Forks',
    'Open issues',
    '3',
    'Open PRs',
    'TypeScript: 75.00%',
    '2026-01-02T03:04:05.000Z',
  ])
    expect(output).toContain(value);
  expect(fetch).toHaveBeenCalledTimes(4);
  expect(stderr).not.toHaveBeenCalled();
});
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
    const { loader, fetch, stdout } = setup();
    await runCli(['node', 'gitmetrics', ...args], loader);
    expect(process.exitCode).toBe(2);
    expect(fetch).not.toHaveBeenCalled();
    expect(stdout).not.toHaveBeenCalled();
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
