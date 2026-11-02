import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { version } from '../../package.json';

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
  it('prints the package version without querying GitHub', () => {
    const result = runCli('--version');
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(version);
    expect(result.stderr).toBe('');
  });

  it('explains usage and available options', () => {
    const result = runCli('--help');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('metrica');
    expect(result.stdout).toContain('[username]');
    expect(result.stdout).toContain('--json');
    expect(result.stderr).toBe('');
  });

  it('reports a missing username without a stack trace', () => {
    const result = runCli();
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Provide a GitHub username');
    expect(result.stderr).not.toContain(' at ');
  });

  it('rejects unknown options', () => {
    const result = runCli('--unknown');
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('unknown option');
    expect(result.stdout).toBe('');
  });
});
