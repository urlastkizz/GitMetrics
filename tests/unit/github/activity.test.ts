import { expect, it, vi } from 'vitest';
import { createGitHubClient } from '../../../src/github/client.js';
import { fetchActivity } from '../../../src/github/activity.js';
import { createActivityPeriod } from '../../../src/core/activity-period.js';

const period = createActivityPeriod(new Date('2026-01-02T03:04:05Z'), 3);
const data = {
  user: {
    login: 'Octocat',
    contributionsCollection: {
      contributionCalendar: {
        weeks: [
          {
            contributionDays: [
              { date: '2025-12-31', contributionCount: 2 },
              { date: '2026-01-01', contributionCount: 0 },
            ],
          },
        ],
      },
    },
  },
};
function setup(body: unknown) {
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { 'content-type': 'application/json' },
    }),
  );
  return { fetch, client: createGitHubClient('test-placeholder', fetch) };
}
it('queries variables for the exact cross-year interval and returns canonical project data', async () => {
  const { client, fetch } = setup({ data });
  expect(await fetchActivity('octocat', period, client)).toEqual({
    user: 'Octocat',
    contributionDays: [
      { date: '2025-12-31', count: 2 },
      { date: '2026-01-01', count: 0 },
    ],
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, init] = fetch.mock.calls[0] ?? [];
  expect(String(url)).toBe('https://api.github.com/graphql');
  const body: unknown = JSON.parse(String(init?.body));
  expect(body).toMatchObject({
    variables: {
      login: 'octocat',
      from: '2025-12-31T00:00:00.000Z',
      to: '2026-01-02T03:04:05.000Z',
    },
  });
  expect(body).toHaveProperty(
    'query',
    expect.stringContaining('contributionsCollection(from: $from, to: $to)'),
  );
});
it('reports null users as not found', async () => {
  await expect(
    fetchActivity('missing', period, setup({ data: { user: null } }).client),
  ).rejects.toThrow('GitHub user not found.');
});
it.each([
  { data: { user: {} } },
  {
    data: {
      user: {
        ...data.user,
        contributionsCollection: {
          contributionCalendar: {
            weeks: [
              {
                contributionDays: [
                  { date: '2026-01-01', contributionCount: -1 },
                ],
              },
            ],
          },
        },
      },
    },
  },
])('rejects malformed calendars', async (body) => {
  await expect(
    fetchActivity('octocat', period, setup(body).client),
  ).rejects.toThrow('invalid activity data');
});
it('rejects HTTP200 partial data with GraphQL errors without leaking a token', async () => {
  const promise = fetchActivity(
    'octocat',
    period,
    setup({
      data,
      errors: [{ type: 'FORBIDDEN', message: 'test-placeholder' }],
    }).client,
  );
  await expect(promise).rejects.toThrow(
    'GitHub access denied. Check token permissions for activity.',
  );
  await expect(promise).rejects.not.toThrow('test-placeholder');
});
it('returns inactive calendar data without replacing the requested period', async () => {
  const { client, fetch } = setup({
    data: {
      user: {
        login: 'octocat',
        contributionsCollection: { contributionCalendar: { weeks: [] } },
      },
    },
  });
  expect(await fetchActivity('octocat', period, client)).toEqual({
    user: 'octocat',
    contributionDays: [],
  });
  expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toHaveProperty(
    'variables.from',
    period.from,
  );
});
