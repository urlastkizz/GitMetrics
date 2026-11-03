import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import manifest from '../../package.json';

const stages = ['typecheck', 'lint', 'test', 'build'];

function runNpm(args: string[], cwd = process.cwd()) {
  // npm supplies its CLI path, avoiding platform-specific npm.cmd execution.
  const npmCli = z.string().min(1).parse(process.env.npm_execpath);
  return spawnSync(process.execPath, [npmCli, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 30_000,
    env: { ...process.env, npm_config_offline: 'true' },
  });
}

function runPublicationChecks(failingStage?: string) {
  const directory = mkdtempSync(join(tmpdir(), 'gitmetrics-publish-'));
  try {
    const { scripts } = z
      .object({ scripts: z.object({ prepublishOnly: z.string() }) })
      .parse(manifest);
    writeFileSync(
      join(directory, 'package.json'),
      JSON.stringify({
        private: true,
        scripts: {
          prepublishOnly: scripts.prepublishOnly,
          ...Object.fromEntries(
            stages.map((stage) => [stage, `node check.cjs ${stage}`]),
          ),
        },
      }),
    );
    writeFileSync(
      join(directory, 'check.cjs'),
      `const { appendFileSync } = require('node:fs');
const stage = process.argv[2];
appendFileSync('stages.txt', stage + '\\n');
if (stage === ${JSON.stringify(failingStage ?? '')}) process.exit(1);
`,
    );

    const result = runNpm(['run', 'prepublishOnly'], directory);
    const executed = readFileSync(join(directory, 'stages.txt'), 'utf8')
      .trim()
      .split('\n');
    return { result, executed };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe('npm package contract', () => {
  it('defines the public package metadata and distributable allowlist', () => {
    expect(manifest).toMatchObject({
      name: '@urlastkizz/gitmetrics',
      publishConfig: { access: 'public' },
      description: expect.any(String),
      keywords: expect.arrayContaining(['github', 'cli']),
      license: 'MIT',
      repository: {
        type: 'git',
        url: 'git+https://github.com/urlastkizz/GitMetrics.git',
      },
      bugs: { url: 'https://github.com/urlastkizz/GitMetrics/issues' },
      homepage: 'https://github.com/urlastkizz/GitMetrics#readme',
      bin: { gitmetrics: './dist/index.js' },
      engines: { node: '>=22.13.0' },
      files: ['dist', 'README.md', 'LICENSE'],
    });
  });

  it('runs all publication checks in order', () => {
    const { result, executed } = runPublicationChecks();
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(executed).toEqual(stages);
  }, 30_000);

  it.each(stages)(
    'aborts publication checks when %s fails',
    (stage) => {
      const { result, executed } = runPublicationChecks(stage);
      expect(result.error).toBeUndefined();
      expect(result.status).not.toBeNull();
      expect(result.status).not.toBe(0);
      expect(executed).toEqual(stages.slice(0, stages.indexOf(stage) + 1));
    },
    30_000,
  );
});

describe('npm production artifact', () => {
  beforeAll(() => {
    const result = runNpm(['run', 'build']);
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
  }, 30_000);

  it('preserves the executable shebang in the production build', () => {
    const executable = readFileSync('dist/index.js', 'utf8');
    expect(executable.split(/\r?\n/)[0]).toBe('#!/usr/bin/env node');
  });

  it('packs only runtime artifacts and public documentation', () => {
    const result = runNpm(['pack', '--dry-run', '--json', '--ignore-scripts']);
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    const packages = z
      .array(
        z.object({
          version: z.string(),
          files: z.array(z.object({ path: z.string() })),
        }),
      )
      .parse(JSON.parse(result.stdout));
    expect(packages).toHaveLength(1);
    expect(packages[0]?.version).toBe(manifest.version);
    const paths = packages.flatMap((packed) =>
      packed.files.map((file) => file.path),
    );
    expect(paths).toEqual(
      expect.arrayContaining([
        'package.json',
        'README.md',
        'LICENSE',
        'dist/index.js',
      ]),
    );
    for (const path of paths) {
      expect(path).toMatch(/^(package\.json|README\.md|LICENSE|dist\/.+)$/);
      expect(path).not.toMatch(
        /(^|\/)(tests?|\.env[^/]*|\.codex|\.github|agents)(\/|$)|\.test\./i,
      );
    }
  }, 30_000);
});
