import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGitHubClient } from '../../../src/github/client.js';
import { githubError } from '../../../src/github/errors.js';

afterEach(() => vi.useRealTimers());

describe('GitHub client errors', () => {
  it('applies authentication and an effective deadline to GraphQL requests', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    let authorization: string | null = null;
    const fetchMock: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        signal = init?.signal;
        authorization = new Headers(init?.headers).get('authorization');
        signal?.addEventListener('abort', () => reject(signal?.reason), {
          once: true,
        });
      });
    const response = createGitHubClient('test-placeholder', fetchMock).graphql(
      'query { viewer { login } }',
    );
    const rejected = expect(response).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(14999);
    expect(authorization).toBe('token test-placeholder');
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await rejected;
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('aborts stalled requests after 15 seconds and gives each request a fresh deadline', async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    const fetchMock: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) throw new Error('Request has no cancellation signal');
        signals.push(signal);
        signal.addEventListener('abort', () => reject(signal.reason), {
          once: true,
        });
      });
    const client = createGitHubClient(undefined, fetchMock);
    for (let request = 0; request < 2; request++) {
      const response = client.rest.repos.get({ owner: 'owner', repo: 'name' });
      const rejected = expect(response).rejects.toThrow();
      await vi.advanceTimersByTimeAsync(14999);
      expect(signals[request]?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await rejected;
      expect(signals[request]?.aborted).toBe(true);
    }
    expect(signals[0]).not.toBe(signals[1]);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('preserves external cancellation and clears the request deadline', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    let requestSignal: AbortSignal | null | undefined;
    const fetchMock: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        requestSignal = init?.signal;
        requestSignal?.addEventListener(
          'abort',
          () => reject(requestSignal?.reason),
          { once: true },
        );
      });
    const response = createGitHubClient(undefined, fetchMock).rest.repos.get({
      owner: 'owner',
      repo: 'name',
      request: { signal: controller.signal },
    });
    const rejected = expect(response).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(0);
    controller.abort(new Error('External cancellation'));
    await rejected;
    expect(requestSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('starts a fresh deadline for the next pagination request', async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    const fetchMock: typeof fetch = async (_input, init) => {
      const signal = init?.signal;
      if (!signal) throw new Error('Request has no cancellation signal');
      signals.push(signal);
      if (signals.length === 1)
        return new Response('[{"number":1}]', {
          headers: {
            'content-type': 'application/json',
            link: '<https://api.github.com/repos/owner/name/pulls?page=2>; rel="next"',
          },
        });
      return new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(signal.reason), {
          once: true,
        }),
      );
    };
    const client = createGitHubClient(undefined, fetchMock);
    const pagination = client.paginate.iterator(client.rest.pulls.list, {
      owner: 'owner',
      repo: 'name',
    });
    const pages = pagination[Symbol.asyncIterator]();
    await pages.next();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(14999);
    const nextPage = pages.next();
    const rejected = expect(nextPage).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(1);
    expect(signals[1]?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(14999);
    await rejected;
    expect(signals[0]?.aborted).toBe(false);
    expect(signals[1]?.aborted).toBe(true);
    expect(signals[0]).not.toBe(signals[1]);
    expect(vi.getTimerCount()).toBe(0);
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
