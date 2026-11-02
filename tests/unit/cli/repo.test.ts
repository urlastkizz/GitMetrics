import { Command } from 'commander';
import { afterEach, expect, it, vi } from 'vitest';
import { registerRepoCommand } from '../../../src/cli/commands/repo.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  process.exitCode = 0;
});
const snapshot = {
  repository: 'owner/name',
  stars: 12,
  forks: 2,
  openIssuesAndPullRequests: 4,
  openPullRequests: 1,
  languageBytes: {},
  lastCommitAt: null,
};
function setup() {
  const program = new Command().exitOverride();
  const loader = vi.fn().mockResolvedValue(snapshot);
  registerRepoCommand(program, loader);
  const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  return { program, loader, stdout, stderr };
}
it('prints table output and forwards an explicit token over the environment', async () => {
  vi.stubEnv('GITHUB_TOKEN', 'environment');
  const { program, loader, stdout } = setup();
  await program.parseAsync(
    ['repo', 'owner/name', '--token', 'explicit', '--no-color'],
    { from: 'user' },
  );
  expect(loader).toHaveBeenCalledWith('owner/name', 'explicit');
  expect(stdout.mock.calls.flat().join('')).toContain('Open issues');
});
it('prints only JSON', async () => {
  const { program, stdout, stderr } = setup();
  await program.parseAsync(['repo', 'owner/name', '--json'], { from: 'user' });
  expect(stdout).toHaveBeenCalledTimes(1);
  expect(JSON.parse(String(stdout.mock.calls[0]?.[0]))).toMatchObject({
    openIssues: 3,
    lastCommitAt: null,
  });
  expect(stderr).not.toHaveBeenCalled();
});
it.each(['invalid', 'a/b/c', 'https://github.com/a/b', 'a /b', 'a/b?x'])(
  'rejects invalid repository %s before loading',
  async (argument) => {
    const { program, loader, stdout, stderr } = setup();
    await expect(
      program.parseAsync(['repo', argument], { from: 'user' }),
    ).rejects.toMatchObject({ exitCode: 2 });
    expect(loader).not.toHaveBeenCalled();
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr.mock.calls.flat().join('')).toBe(
      'Expected owner/name. Example: gitmetrics repo octocat/Hello-World\n',
    );
  },
);
it('reports missing arguments as usage errors', async () => {
  const { program, loader, stdout, stderr } = setup();
  await expect(
    program.parseAsync(['repo'], { from: 'user' }),
  ).rejects.toMatchObject({ exitCode: 1 });
  expect(loader).not.toHaveBeenCalled();
  expect(stdout).not.toHaveBeenCalled();
  expect(stderr.mock.calls.flat().join('')).toBe(
    "error: missing required argument 'owner/name'\n",
  );
});
it.each([
  'Repository not found.',
  'GitHub rate limit reached. Resets at 2026-01-01T00:00:00.000Z (UTC).',
])('prints friendly failures on stderr: %s', async (message) => {
  const { program, loader, stdout, stderr } = setup();
  loader.mockRejectedValue(new Error(message));
  await program.parseAsync(['repo', 'owner/name', '--json'], { from: 'user' });
  expect(stdout).not.toHaveBeenCalled();
  expect(stderr).toHaveBeenCalledExactlyOnceWith(`Error: ${message}\n`);
  expect(process.exitCode).toBe(1);
});
it('documents all repository flags', async () => {
  const { program, stdout } = setup();
  await expect(
    program.parseAsync(['repo', '--help'], { from: 'user' }),
  ).rejects.toMatchObject({ exitCode: 0 });
  const output = stdout.mock.calls.flat().join('');
  for (const flag of ['--json', '--token', '--no-color'])
    expect(output).toContain(flag);
});
