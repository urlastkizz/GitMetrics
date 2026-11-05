import { expect, it, vi } from 'vitest';
import { createGitHubClient } from '../../../src/github/client.js';
import { fetchPullRequests } from '../../../src/github/prs.js';

const pr = {
  created_at: '2026-01-01T00:00:00Z',
  closed_at: '2026-01-02T00:00:00Z',
  merged_at: null,
};
function setup(data: unknown = [pr], status = 200) {
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
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
  return { fetch, client: createGitHubClient(undefined, fetch) };
}
it('fetches one page of 100 closed candidates ordered by update descending', async () => {
  const { client, fetch } = setup();
  expect(await fetchPullRequests('owner/name', client)).toEqual({
    repository: 'owner/name',
    pullRequests: [
      { createdAt: pr.created_at, closedAt: pr.closed_at, mergedAt: null },
    ],
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  const url = new URL(String(fetch.mock.calls[0]![0]));
  expect(url.pathname).toBe('/repos/owner/name/pulls');
  expect(Object.fromEntries(url.searchParams)).toEqual({
    state: 'closed',
    sort: 'updated',
    direction: 'desc',
    per_page: '100',
  });
  expect(fetch.mock.calls[0]![1]?.headers).not.toHaveProperty('authorization');
});
it.each([
  { ...pr, created_at: 'bad' },
  { ...pr, closed_at: null },
  { ...pr, merged_at: 'bad' },
])('rejects malformed dates %j', async (data) => {
  await expect(
    fetchPullRequests('owner/name', setup([data]).client),
  ).rejects.toThrow('invalid pull request data');
});
it.each([
  [404, 'not found'],
  [403, '2026-01-01T00:00:00.000Z'],
  [429, '2026-01-01T00:00:00.000Z'],
  [401, 'rejected the token'],
])('maps HTTP %i to a friendly message', async (status, message) => {
  await expect(
    fetchPullRequests(
      'owner/name',
      setup({ message: 'secret-placeholder' }, status).client,
    ),
  ).rejects.toThrow(message);
});
it('sanitizes network failures', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockRejectedValue(new Error('secret-placeholder'));
  await expect(
    fetchPullRequests('owner/name', createGitHubClient(undefined, fetch)),
  ).rejects.toThrow('GitHub request failed. Please try again later.');
});
