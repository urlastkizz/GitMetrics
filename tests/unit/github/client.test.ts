import { describe, expect, it } from 'vitest';
import { createGitHubClient } from '../../../src/github/client.js';
import { githubError } from '../../../src/github/errors.js';

describe('GitHub client errors', () => {
  it('configures a finite request timeout', () => {
    expect(
      createGitHubClient().request.endpoint.DEFAULTS.request?.timeout,
    ).toBe(15000);
  });
  it('sends authentication only when a token is supplied', async () => {
    const headers: (string | null)[] = [];
    const fetchMock: typeof fetch = async (_input, init) => {
      headers.push(new Headers(init?.headers).get('authorization'));
      return new Response('{}', {
        headers: { 'content-type': 'application/json' },
      });
    };
    await createGitHubClient(undefined, fetchMock).rest.repos.get({
      owner: 'owner',
      repo: 'name',
    });
    await createGitHubClient('test-placeholder', fetchMock).rest.repos.get({
      owner: 'owner',
      repo: 'name',
    });
    expect(headers).toEqual([null, 'token test-placeholder']);
  });
  it('maps a missing repository', () => {
    expect(githubError({ status: 404 }).message).toContain('not found');
  });
  it('reports exhausted rate limits with UTC reset time', () => {
    expect(
      githubError({
        status: 403,
        response: {
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': '1767225600',
          },
        },
      }).message,
    ).toContain('2026-01-01T00:00:00.000Z');
    expect(githubError({ status: 429 }).message).toContain('unavailable');
  });
  it('sanitizes authentication, forbidden and network errors', () => {
    expect(githubError({ status: 401, message: 'secret' }).message).toContain(
      'Invalid GitHub token',
    );
    expect(githubError({ status: 403 }).message).toContain('denied');
    expect(githubError(new Error('secret')).message).toContain('connect');
  });
});
