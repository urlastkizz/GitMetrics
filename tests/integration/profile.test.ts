import { afterEach, describe, expect, it, vi } from 'vitest';
import { showProfile } from '../../src/cli/profile.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  process.exitCode = 0;
});

describe('profile query', () => {
  it('prints valid JSON with profile and repositories', async () => {
    const profile = { login: 'octocat', public_repos: 0, followers: 2 };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(profile)))
      .mockResolvedValueOnce(new Response('[]'));
    vi.stubGlobal('fetch', fetchMock);
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    await showProfile('octocat', true);

    expect(stdout).toHaveBeenCalledExactlyOnceWith(
      `${JSON.stringify({ profile, repositories: [] })}\n`,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toContain('sort=created');
  });

  it('keeps the profile table and handles an empty repository list', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              login: 'octocat',
              name: null,
              bio: null,
              public_repos: 0,
              followers: 2,
            }),
          ),
        )
        .mockResolvedValueOnce(new Response('[]')),
    );
    const stdout = vi.spyOn(console, 'log').mockImplementation(() => {});

    await showProfile('octocat', false);

    const output = stdout.mock.calls.flat().join('\n');
    expect(output).toContain('@octocat');
    for (const label of [
      'GITHUB PROFILE',
      'Name',
      'Bio',
      'Followers',
      'Public repositories',
      'Not provided',
      'LATEST REPOSITORIES',
      'by creation date',
      'No public repositories found.',
    ]) {
      expect(output).toContain(label);
    }
  });

  it('reports a missing user with exit code 1', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 404 })),
    );
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});

    await showProfile('missing', true);

    expect(process.exitCode).toBe(1);
    expect(stderr).toHaveBeenCalledWith(
      expect.stringContaining(
        'Error querying GitHub: GitHub user "missing" not found.',
      ),
    );
  });

  it('prints repository labels and numbers in English', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              login: 'octocat',
              name: 'Octocat',
              bio: 'Hello',
              followers: 1234,
              public_repos: 1234,
            }),
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify([
              {
                name: 'example',
                language: null,
                stargazers_count: 1234,
                forks_count: 2345,
                html_url: 'https://github.com/octocat/example',
              },
            ]),
          ),
        ),
    );
    const stdout = vi.spyOn(console, 'log').mockImplementation(() => {});

    await showProfile('octocat', false);

    const output = stdout.mock.calls.flat().join('\n');
    for (const label of [
      'Name',
      'Primary',
      'language',
      'Stars',
      'Forks',
      'Link',
      'Not provided',
      '1,234',
      '2,345',
    ]) {
      expect(output).toContain(label);
    }
    expect(process.exitCode).toBe(0);
  });

  it('reports API failures in English', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 503 })),
    );
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});

    await showProfile('octocat', false);

    expect(stderr).toHaveBeenCalledWith(
      expect.stringContaining(
        'Error querying GitHub: GitHub API returned status 503.',
      ),
    );
    expect(process.exitCode).toBe(1);
  });

  it('reports unknown failures in English', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(null));
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});

    await showProfile('octocat', false);

    expect(stderr).toHaveBeenCalledWith(
      expect.stringContaining('Error querying GitHub: Unknown error.'),
    );
    expect(process.exitCode).toBe(1);
  });
});
