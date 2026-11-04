import { afterEach, expect, it, vi } from 'vitest';
import { runCli } from '../../src/cli/index.js';
import { createGitHubClient } from '../../src/github/client.js';
import { fetchPullRequests } from '../../src/github/prs.js';
import * as config from '../../src/config/token.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  process.exitCode = 0;
});
const pr = {
  created_at: '2026-01-01T00:00:00Z',
  closed_at: '2026-01-02T00:00:00Z',
  merged_at: '2026-01-02T00:00:00Z',
  user: { type: 'Bot' },
};
function setup(
  data: unknown = Array.from({ length: 60 }, () => pr),
  status = 200,
) {
  vi.stubEnv('GITHUB_TOKEN', undefined);
  const unexpectedFetch = vi
    .fn()
    .mockRejectedValue(new Error('Unexpected global network request'));
  vi.stubGlobal('fetch', unexpectedFetch);
  const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
    async () =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          'content-type': 'application/json',
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': '1767225600',
          link: '<https://api.github.com/repos/owner/name/pulls?page=2>; rel="next"',
        },
      }),
  );
  const loader = vi.fn((repository: string, token?: string) =>
    fetchPullRequests(repository, createGitHubClient(token, fetch)),
  );
  const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  const token = vi.spyOn(config, 'resolveToken');
  const run = (...args: string[]) =>
    runCli(['node', 'gitmetrics', ...args], undefined, undefined, loader);
  return { run, loader, fetch, stdout, stderr, token, unexpectedFetch };
}
it('runs default 50 PR table flow including bot authors and only one API request', async () => {
  const { run, fetch, stdout, stderr, unexpectedFetch } = setup();
  await run('prs', 'owner/name', '--no-color');
  const output = stdout.mock.calls.flat().join('');
  for (const text of [
    'PRs analyzed',
    '50',
    'Merged',
    'Closed without merge',
    '100.00%',
    '1d',
  ])
    expect(output).toContain(text);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(stderr).not.toHaveBeenCalled();
  expect(unexpectedFetch).not.toHaveBeenCalled();
});
it.each([
  ['--json', 'prs', 'owner/name'],
  ['prs', 'owner/name', '--json'],
])('prints clean JSON with either flag position %j', async (...args) => {
  const { run, stdout, stderr } = setup();
  await run(...args);
  expect(stdout).toHaveBeenCalledTimes(1);
  expect(JSON.parse(String(stdout.mock.calls[0]![0]))).toEqual({
    repository: 'owner/name',
    analyzed: 50,
    merged: 50,
    closedWithoutMerge: 0,
    mergeRate: 100,
    medianTimeToMergeSeconds: 86400,
    averageTimeToMergeSeconds: 86400,
  });
  expect(stderr).not.toHaveBeenCalled();
});
it('selects requested PRs by closure within the fetched update-ordered candidates', async () => {
  const { run, stdout, fetch } = setup([
    pr,
    { ...pr, closed_at: '2026-02-01T00:00:00Z', merged_at: null },
  ]);
  await run('prs', 'owner/name', '--limit', '1', '--json');
  expect(JSON.parse(String(stdout.mock.calls[0]![0]))).toMatchObject({
    analyzed: 1,
    merged: 0,
    closedWithoutMerge: 1,
    mergeRate: 0,
    medianTimeToMergeSeconds: null,
    averageTimeToMergeSeconds: null,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
});
it.each([
  { data: [], text: 'No closed pull requests', count: 0 },
  { data: [{ ...pr, merged_at: null }], text: 'n/a', count: 1 },
])('handles empty or unmerged sample $count', async ({ data, text, count }) => {
  const { run, stdout } = setup(data);
  await run('prs', 'owner/name', '--no-color');
  expect(stdout.mock.calls.flat().join('')).toContain(text);
  stdout.mockClear();
  await run('prs', 'owner/name', '--json');
  expect(JSON.parse(String(stdout.mock.calls[0]![0]))).toEqual({
    repository: 'owner/name',
    analyzed: count,
    merged: 0,
    closedWithoutMerge: count,
    mergeRate: 0,
    medianTimeToMergeSeconds: null,
    averageTimeToMergeSeconds: null,
  });
});
it.each([
  ['prs', 'owner/name', '--limit', '0'],
  ['prs', 'owner/name', '--limit'],
  ['prs'],
  ['prs', 'invalid'],
])('rejects invalid usage %j before token or HTTP access', async (...args) => {
  const { run, token, fetch, loader, stdout } = setup();
  await run(...args);
  expect(process.exitCode).toBe(2);
  expect(token).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  expect(loader).not.toHaveBeenCalled();
  expect(stdout).not.toHaveBeenCalled();
});
it.each([
  [404, 'not found'],
  [403, '2026-01-01T00:00:00.000Z'],
  [429, '2026-01-01T00:00:00.000Z'],
])('reports HTTP %s with exit code 1', async (status, message) => {
  const { run, stdout, stderr } = setup({}, status);
  await run('prs', 'owner/name', '--json');
  expect(process.exitCode).toBe(1);
  expect(stdout).not.toHaveBeenCalled();
  expect(stderr.mock.calls.flat().join('')).toContain(message);
});
it.each(['explicit', 'environment'])(
  'reports a rejected %s token without leaking credentials',
  async (source) => {
    const secret = 'rejected-pr-placeholder';
    const { run, stdout, stderr, loader } = setup({ message: secret }, 401);
    vi.stubEnv(
      'GITHUB_TOKEN',
      source === 'environment' ? secret : 'unused-placeholder',
    );
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    await run(
      'prs',
      'owner/name',
      '--json',
      ...(source === 'explicit' ? ['--token', secret] : []),
    );
    expect(process.exitCode).toBe(1);
    expect(loader).toHaveBeenCalledWith('owner/name', secret);
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr.mock.calls.flat().join('')).toBe(
      'Error: GitHub rejected the token. It may be invalid or expired. Check --token or GITHUB_TOKEN.\n',
    );
    expect(errorLog).not.toHaveBeenCalled();
  },
);
it('reports network failures without stack traces or raw request messages', async () => {
  const { run, fetch, stdout, stderr } = setup();
  fetch.mockRejectedValue(new Error('private-request-placeholder'));
  await run('prs', 'owner/name');
  expect(process.exitCode).toBe(1);
  expect(stdout).not.toHaveBeenCalled();
  expect(stderr.mock.calls.flat().join('')).toBe(
    'Error: GitHub request failed. Please try again later.\n',
  );
});
