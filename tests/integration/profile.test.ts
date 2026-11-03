import { afterEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';
import { showProfile } from '../../src/cli/profile.js';
import { runCli } from '../../src/cli/index.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  process.exitCode = 0;
});

describe('profile query', () => {
  it.each(['', 'profile-token-placeholder'])(
    'authenticates both profile requests only when configured: %s',
    async (token) => {
      vi.stubEnv('GITHUB_TOKEN', token);
      const fetchMock = vi
        .fn()
        .mockImplementation(
          async (url: string) =>
            new Response(
              JSON.stringify(
                url.includes('/repos?') ? [] : { login: 'octocat' },
              ),
            ),
        );
      vi.stubGlobal('fetch', fetchMock);
      vi.spyOn(process.stdout, 'write').mockReturnValue(true);
      await showProfile('octocat', true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      for (const call of fetchMock.mock.calls) {
        expect(new Headers(call[1]?.headers).get('authorization')).toBe(
          token ? `Bearer ${token}` : null,
        );
      }
    },
  );
  it('reports rejected profile authentication with code 1 and no raw credentials', async () => {
    const token = 'rejected-profile-placeholder';
    vi.stubEnv('GITHUB_TOKEN', token);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ message: `Rejected ${token}` }), {
            status: 401,
          }),
        ),
    );
    const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    await runCli(['node', 'gitmetrics', 'octocat', '--json']);
    expect(process.exitCode).toBe(1);
    expect(stdout).not.toHaveBeenCalled();
    const output = stripVTControlCharacters(stderr.mock.calls.flat().join(''));
    expect(output).toBe(
      'Error querying GitHub: GitHub rejected the token. It may be invalid or expired. Check --token or GITHUB_TOKEN.',
    );
    expect(output).not.toContain(token);
  });
  it.each([true, false])(
    'keeps table cells readable with colors enabled: %s',
    (color) => {
      const env: NodeJS.ProcessEnv = { ...process.env, CI: 'true' };
      delete env.NO_COLOR;
      delete env.FORCE_COLOR;
      if (color) env.FORCE_COLOR = '1';
      else env.NO_COLOR = '1';
      const result = spawnSync(
        process.execPath,
        [
          '--import',
          'tsx',
          '--input-type=module',
          '-e',
          `
      import { showProfile } from './src/cli/profile.ts';
      const profile = { login: 'octocat', name: null, bio: null, followers: 1234, public_repos: 1234 };
      const repositories = [{ name: 'example', language: null, stargazers_count: 1234, forks_count: 2345, html_url: 'https://github.com/octocat/example' }];
      globalThis.fetch = async (url) => new Response(JSON.stringify(String(url).includes('/repos?') ? repositories : profile));
      await showProfile('octocat', false);
    `,
        ],
        { encoding: 'utf8', env, timeout: 10000 },
      );

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout.includes('\u001b[')).toBe(color);
      const plain = stripVTControlCharacters(result.stdout);
      const rows = plain
        .split('\n')
        .filter((line) => line.startsWith('│'))
        .map((line) =>
          line
            .split('│')
            .slice(1, -1)
            .map((cell) => cell.trim()),
        );
      expect(rows).toContainEqual([
        'Name',
        'Primary',
        'Stars',
        'Forks',
        'Link',
      ]);
      expect(rows).toContainEqual([
        'example',
        'Not provided',
        '1,234',
        '2,345',
        'https://github.com/octocat/example',
      ]);
      expect(rows).toContainEqual(['Followers', '1,234']);
      expect(rows).toContainEqual(['Public repositories', '1,234']);
      expect(plain).not.toContain('\u001b');
    },
  );
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
