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
  for (const flag of ['--json', '--token', '--no-color', '--languages <n>'])
    expect(output).toContain(flag);
  expect(output).toContain('from 1 to 20');
  expect(output).toContain('default: "5"');
});

const languageBytes = Object.fromEntries(
  Array.from({ length: 21 }, (_, index) => [
    `Language${index + 1}`,
    index === 0 ? 20 : 4,
  ]),
);
it.each([
  {
    args: [],
    expected: [
      'Language1: 20.00%',
      'Language2: 4.00%',
      'Language3: 4.00%',
      'Language4: 4.00%',
      'Language5: 4.00%',
      'Other: 64.00%',
    ],
  },
  {
    args: ['--languages', '1'],
    expected: ['Language1: 20.00%', 'Other: 80.00%'],
  },
  {
    args: ['--languages', '20'],
    expected: [
      ...Array.from(
        { length: 20 },
        (_, i) => `Language${i + 1}: ${i === 0 ? '20' : '4'}.00%`,
      ),
      'Other: 4.00%',
    ],
  },
])('uses table language limit $args', async ({ args, expected }) => {
  const { program, loader, stdout, stderr } = setup();
  // Use the equal-byte fixture for exact percentages, with names in alphabetical order.
  loader.mockResolvedValue({
    ...snapshot,
    languageBytes: Object.fromEntries(
      Object.values(languageBytes).map((bytes, i) => [
        `Language${String(i + 1).padStart(2, '0')}`,
        bytes,
      ]),
    ),
  });
  await program.parseAsync(['repo', 'owner/name', '--no-color', ...args], {
    from: 'user',
  });
  const rows = [
    ...stdout.mock.calls
      .flat()
      .join('')
      .matchAll(/(\w+): (\d+\.\d{2})%/g),
  ].map(
    ([, name, value]) => `${name?.replace(/Language0/, 'Language')}: ${value}%`,
  );
  expect(rows).toEqual(expected);
  expect(stderr).not.toHaveBeenCalled();
});

it.each([
  '0',
  '21',
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
])('rejects invalid language limit %j before loading', async (value) => {
  const { program, loader, stdout, stderr } = setup();
  await expect(
    program.parseAsync(['repo', 'owner/name', '--languages', value], {
      from: 'user',
    }),
  ).rejects.toMatchObject({ exitCode: 2 });
  expect(stderr.mock.calls.flat().join('')).toBe(
    'Languages must be an integer from 1 to 20.\n',
  );
  expect(stdout).not.toHaveBeenCalled();
  expect(loader).not.toHaveBeenCalled();
});

it('keeps every JSON language when a table limit is supplied', async () => {
  const { program, loader, stdout, stderr } = setup();
  const bytes = { A: 40, B: 25, C: 15, D: 10, E: 5, F: 3, G: 2 };
  loader.mockResolvedValue({ ...snapshot, languageBytes: bytes });
  await program.parseAsync(
    ['repo', 'owner/name', '--languages', '1', '--json'],
    { from: 'user' },
  );
  expect(JSON.parse(String(stdout.mock.calls[0]?.[0]))).toEqual({
    repository: 'owner/name',
    stars: 12,
    forks: 2,
    openIssues: 3,
    openPullRequests: 1,
    languages: Object.entries(bytes).map(([name, percentage]) => ({
      name,
      percentage,
    })),
    lastCommitAt: null,
  });
  expect(stderr).not.toHaveBeenCalled();
});
