import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bin, name, version } from '../../package.json';

function runCli(...args: string[]) {
  return spawnSync(
    process.execPath,
    ['--import', 'tsx', 'src/index.ts', ...args],
    {
      encoding: 'utf8',
      timeout: 10_000,
    },
  );
}

describe('CLI', () => {
  it('uses a scoped package name and keeps the gitmetrics executable', () => {
    expect(name).toBe('@urlastkizz/gitmetrics');
    expect(bin).toEqual({ gitmetrics: './dist/index.js' });
  });

  it('contains no retired product names in tracked files', () => {
    const files = execFileSync('git', ['ls-files', '-z'], {
      encoding: 'utf8',
    })
      .split('\0')
      .filter(Boolean);
    const retiredNames = new RegExp(
      ['met' + 'rica', 'gh-' + 'metrics-cli'].join('|'),
      'i',
    );
    const matches = files.filter((file) =>
      retiredNames.test(readFileSync(file, 'utf8')),
    );
    expect(matches).toEqual([]);
  });
  it('prints the package version without querying GitHub', () => {
    const result = runCli('--version');
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(version);
    expect(result.stderr).toBe('');
  });

  it('explains usage and available options', () => {
    const result = runCli('--help');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: gitmetrics');
    expect(result.stdout).toContain(
      'Show GitHub profiles and public repository metrics.',
    );
    expect(result.stdout).toContain('[username]');
    expect(result.stdout).toContain('--json');
    expect(result.stdout).toContain('repo');
    expect(result.stdout).toContain('activity');
    expect(result.stderr).toBe('');
  });

  it.each([
    ['repo', 'Show metrics for a public GitHub repository'],
    [
      'activity',
      'Show recent GitHub contribution activity in UTC (requires a token)',
    ],
  ])('documents %s in English', (command, description) => {
    const result = runCli(command, '--help');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`Usage: gitmetrics ${command}`);
    expect(result.stdout).toContain(description);
    expect(result.stdout).toContain('GitHub token (overrides GITHUB_TOKEN)');
    expect(result.stdout).toContain('Disable terminal colors');
    expect(result.stdout).toContain('display help for command');
    expect(result.stderr).toBe('');
  });

  it('reports a missing username without a stack trace', () => {
    const result = runCli();
    expect(result.status).toBe(2);
    expect(result.stderr).toContain(
      'Provide a GitHub username. Example: gitmetrics octocat',
    );
    expect(result.stderr).not.toContain(' at ');
  });

  it('rejects unknown options', () => {
    const result = runCli('--unknown');
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('unknown option');
    expect(result.stdout).toBe('');
  });
});
