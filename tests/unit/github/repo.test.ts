import { describe, expect, it, vi } from 'vitest';
import { createGitHubClient } from '../../../src/github/client.js';
import { fetchRepository } from '../../../src/github/repo.js';

function fixture(
  options: {
    commitStatus?: number;
    commitMessage?: string;
    malformed?: boolean;
    repoStatus?: number;
  } = {},
) {
  const requests: string[] = [];
  const fetch = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    requests.push(url);
    let data: unknown = {
      full_name: 'owner/name',
      stargazers_count: 12,
      forks_count: 2,
      open_issues_count: 104,
      default_branch: 'main',
    };
    let status = options.repoStatus ?? 200;
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': '1767225600',
    };
    if (url.includes('/languages')) {
      data = { TypeScript: 3, JavaScript: 1 };
      status = 200;
    }
    if (url.includes('/pulls')) {
      data = url.includes('page=2')
        ? [{ number: 101 }]
        : Array.from({ length: 100 }, (_, i) => ({ number: i + 1 }));
      status = 200;
      if (!url.includes('page=2'))
        headers.link =
          '<https://api.github.com/repos/owner/name/pulls?state=open&per_page=100&page=2>; rel="next"';
    }
    if (url.includes('/commits')) {
      data = options.commitStatus
        ? { message: options.commitMessage }
        : [{ commit: { committer: { date: '2026-01-02T03:04:05Z' } } }];
      status = options.commitStatus ?? 200;
    }
    if (options.malformed) data = {};
    return new Response(JSON.stringify(data), { status, headers });
  });
  const client = createGitHubClient(undefined, fetch);
  return { client, requests };
}

describe('repository snapshot', () => {
  it('fetches metadata, bytes, all PR pages and the default-branch committer date', async () => {
    const { client, requests } = fixture();
    expect(await fetchRepository('owner/name', client)).toEqual({
      repository: 'owner/name',
      stars: 12,
      forks: 2,
      openIssuesAndPullRequests: 104,
      openPullRequests: 101,
      languageBytes: { TypeScript: 3, JavaScript: 1 },
      lastCommitAt: '2026-01-02T03:04:05Z',
    });
    expect(
      requests.some(
        (url) => url.includes('sha=main') && url.includes('per_page=1'),
      ),
    ).toBe(true);
  });
  it('recognizes only the empty-repository conflict', async () => {
    expect(
      (
        await fetchRepository(
          'owner/name',
          fixture({
            commitStatus: 409,
            commitMessage: 'Git Repository is empty.',
          }).client,
        )
      ).lastCommitAt,
    ).toBeNull();
    await expect(
      fetchRepository(
        'owner/name',
        fixture({ commitStatus: 409, commitMessage: 'Other conflict' }).client,
      ),
    ).rejects.toThrow('GitHub');
  });
  it('rejects malformed responses', async () => {
    await expect(
      fetchRepository('owner/name', fixture({ malformed: true }).client),
    ).rejects.toThrow('invalid');
  });
  it('propagates not-found and rate-limit failures', async () => {
    await expect(
      fetchRepository('owner/name', fixture({ repoStatus: 404 }).client),
    ).rejects.toThrow('not found');
    await expect(
      fetchRepository('owner/name', fixture({ repoStatus: 403 }).client),
    ).rejects.toThrow('2026-01-01');
  });
});
