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
    expect(output).toContain('Nenhum repositório público encontrado');
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
      expect.stringContaining('não encontrado'),
    );
  });
});
