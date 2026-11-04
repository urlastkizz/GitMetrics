import { Command } from 'commander';
import { afterEach, expect, it, vi } from 'vitest';
import { registerPrsCommand } from '../../../src/cli/commands/prs.js';
import * as config from '../../../src/config/token.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  process.exitCode = 0;
});
function setup() {
  const program = new Command().exitOverride();
  const loader = vi.fn().mockResolvedValue({
    repository: 'owner/name',
    pullRequests: Array.from({ length: 100 }, () => ({
      createdAt: '2026-01-01T00:00:00Z',
      closedAt: '2026-01-02T00:00:00Z',
      mergedAt: '2026-01-02T00:00:00Z',
    })),
  });
  registerPrsCommand(program, loader);
  const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  const token = vi.spyOn(config, 'resolveToken');
  return { program, loader, stdout, stderr, token };
}
it.each([
  { args: [], count: 50 },
  { args: ['--limit', '1'], count: 1 },
  { args: ['--limit', '100'], count: 100 },
])('uses sample size $count', async ({ args, count }) => {
  const { program, stdout, stderr } = setup();
  await program.parseAsync(['prs', 'owner/name', '--json', ...args], {
    from: 'user',
  });
  expect(stdout).toHaveBeenCalledTimes(1);
  expect(JSON.parse(String(stdout.mock.calls[0]![0]))).toMatchObject({
    analyzed: count,
    merged: count,
    mergeRate: 100,
    medianTimeToMergeSeconds: 86400,
    averageTimeToMergeSeconds: 86400,
  });
  expect(stderr).not.toHaveBeenCalled();
});
it.each([
  '0',
  '101',
  '-1',
  '1.5',
  'no',
  '1e1',
  '',
  ' 2',
  '2 ',
  '+2',
  'NaN',
  'Infinity',
])(
  'rejects invalid limit %j before token resolution or loading',
  async (limit) => {
    const { program, loader, stdout, stderr, token } = setup();
    await expect(
      program.parseAsync(['prs', 'owner/name', '--limit', limit], {
        from: 'user',
      }),
    ).rejects.toMatchObject({ exitCode: 2 });
    expect(stderr.mock.calls.flat().join('')).toBe(
      'Limit must be an integer from 1 to 100.\n',
    );
    expect(token).not.toHaveBeenCalled();
    expect(loader).not.toHaveBeenCalled();
    expect(stdout).not.toHaveBeenCalled();
  },
);
it.each(['invalid', 'a/b/c', 'https://github.com/a/b'])(
  'rejects invalid repository %s before token resolution',
  async (repository) => {
    const { program, loader, token } = setup();
    await expect(
      program.parseAsync(['prs', repository], { from: 'user' }),
    ).rejects.toMatchObject({ exitCode: 2 });
    expect(token).not.toHaveBeenCalled();
    expect(loader).not.toHaveBeenCalled();
  },
);
it('forwards explicit token before environment and prints a table', async () => {
  vi.stubEnv('GITHUB_TOKEN', 'environment-placeholder');
  const { program, loader, stdout } = setup();
  await program.parseAsync(
    ['prs', 'owner/name', '--token', 'explicit-placeholder', '--no-color'],
    { from: 'user' },
  );
  expect(loader).toHaveBeenCalledWith('owner/name', 'explicit-placeholder');
  expect(stdout.mock.calls.flat().join('')).toContain('PRs analyzed');
});
it('permits missing credentials', async () => {
  vi.stubEnv('GITHUB_TOKEN', undefined);
  const { program, loader } = setup();
  await program.parseAsync(['prs', 'owner/name'], { from: 'user' });
  expect(loader).toHaveBeenCalledWith('owner/name', undefined);
});
it('documents every flag and the default limit', async () => {
  const { program, stdout } = setup();
  await expect(
    program.parseAsync(['prs', '--help'], { from: 'user' }),
  ).rejects.toMatchObject({ exitCode: 0 });
  const output = stdout.mock.calls.flat().join('');
  for (const text of [
    '--limit <n>',
    '--json',
    '--no-color',
    '--token',
    'default: "50"',
    'from 1 to 100',
  ])
    expect(output).toContain(text);
});
